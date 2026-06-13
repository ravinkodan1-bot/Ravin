// Code.gs
// Entry point for the Operations Management System

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  // Pass in any required initial server variables here if needed
  return template.evaluate()
      .setTitle('Operations Control Center')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// Auth.gs
// Authentication, Session Management, and Role-Based Access Control

/**
 * Hash a password using SHA-256
 */
function hashPassword(password) {
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hash = '';
  for (let i = 0; i < signature.length; i++) {
    let byte = signature[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length == 1) byteStr = '0' + byteStr;
    hash += byteStr;
  }
  return hash;
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return Utilities.getUuid();
}

/**
 * Authenticate user and return session token
 */
function loginUser(username, password) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const userIdx = headers.indexOf("Username");
    const passIdx = headers.indexOf("PasswordHash");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");
    const roleIdx = headers.indexOf("Role");
    const tokenIdx = headers.indexOf("SessionToken");
    const lastLoginIdx = headers.indexOf("LastLogin");
    const idIdx = headers.indexOf("UserID");
    const nameIdx = headers.indexOf("Name");

    // Hash provided password to compare (unless it's the initial 'admin123' seed, which we need to handle)
    const providedHash = hashPassword(password);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE" || row[statusIdx] !== "Active") continue;

      if (row[userIdx] === username) {
        // Check password. Also allow plain text passwords temporarily if they match exactly (for existing users not hashed yet)
        if (row[passIdx] === providedHash || row[passIdx] === password || (username === 'admin' && password === 'admin123' && row[passIdx] === 'admin123')) {

          // Force password change on first login if it was the default plain text
          if (row[passIdx] === 'admin123' || row[passIdx] === password) {
            return { success: true, requirePasswordChange: true, userId: row[idIdx], username: username };
          }

          const sessionToken = generateSessionToken();

          // Update SessionToken and LastLogin in DB
          usersSheet.getRange(i + 1, tokenIdx + 1).setValue(sessionToken);
          usersSheet.getRange(i + 1, lastLoginIdx + 1).setValue(new Date().toISOString());

          logSystemError("INFO", `User ${username} logged in successfully`, "Auth");

          return {
            success: true,
            token: sessionToken,
            user: {
              userId: row[idIdx],
              name: row[nameIdx],
              role: row[roleIdx],
              username: row[userIdx]
            }
          };
        }
      }
    }

    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    logSystemError("ERROR", "Login failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred during login." };
  }
}

/**
 * Validate session token
 */
function validateSession(token) {
  if (!token) return false;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const tokenIdx = headers.indexOf("SessionToken");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");
    const idIdx = headers.indexOf("UserID");
    const roleIdx = headers.indexOf("Role");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE" || row[statusIdx] !== "Active") continue;

      if (row[tokenIdx] === token) {
        return {
          isValid: true,
          userId: row[idIdx],
          role: row[roleIdx]
        };
      }
    }
    return { isValid: false };
  } catch (error) {
    logSystemError("ERROR", "Session validation failed: " + error.toString(), "Auth");
    return { isValid: false };
  }
}

/**
 * Logout user by clearing session token
 */
function logoutUser(token) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const tokenIdx = data[0].indexOf("SessionToken");

    for (let i = 1; i < data.length; i++) {
      if (data[i][tokenIdx] === token) {
        usersSheet.getRange(i + 1, tokenIdx + 1).setValue("");
        return { success: true };
      }
    }
    return { success: false, message: "Invalid session token" };
  } catch (error) {
    logSystemError("ERROR", "Logout failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred during logout." };
  }
}

/**
 * Update password (used for initial force change or normal change)
 */
function updatePassword(userId, newPassword) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();

    const idIdx = data[0].indexOf("UserID");
    const passIdx = data[0].indexOf("PasswordHash");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === userId) {
        const newHash = hashPassword(newPassword);
        usersSheet.getRange(i + 1, passIdx + 1).setValue(newHash);
        return { success: true, message: "Password updated successfully" };
      }
    }
    return { success: false, message: "User not found" };
  } catch (error) {
    logSystemError("ERROR", "Password update failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred updating password." };
  }
}
// Orders.gs
// Order Core Engine: CRUD, Enums, Stages, Timeline, and Audit Logs

const ORDER_STAGES = {
  ORDER_RECEIVED: "ORDER_RECEIVED",
  SO_CREATED: "SO_CREATED",
  STOCK_CONFIRMED: "STOCK_CONFIRMED",
  TRANSPORT_ASSIGNED: "TRANSPORT_ASSIGNED",
  BILL_GENERATED: "BILL_GENERATED",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  FEEDBACK_COLLECTED: "FEEDBACK_COLLECTED",
  CLOSED: "CLOSED"
};

const ORDER_STATUSES = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DELAYED: "Delayed",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  CANCELLED: "Cancelled"
};

/**
 * Generates the next Order Number based on the SEQUENCES sheet
 */
function generateOrderNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const seqSheet = ss.getSheetByName("SEQUENCES");
  const data = seqSheet.getDataRange().getValues();
  const headers = data[0];

  const nameIdx = headers.indexOf("SequenceName");
  const valIdx = headers.indexOf("CurrentValue");
  const yearIdx = headers.indexOf("Year");

  const currentYear = new Date().getFullYear();

  for (let i = 1; i < data.length; i++) {
    if (data[i][nameIdx] === "SO_SEQUENCE") {
      let seqYear = data[i][yearIdx];
      let currentVal = data[i][valIdx];

      // Reset if year changed
      if (seqYear !== currentYear) {
        seqYear = currentYear;
        currentVal = 0;
      }

      const nextVal = currentVal + 1;

      // Update sheet
      seqSheet.getRange(i + 1, valIdx + 1).setValue(nextVal);
      seqSheet.getRange(i + 1, yearIdx + 1).setValue(seqYear);

      // Format: SO-YYYY-00001
      return `SO-${seqYear}-${nextVal.toString().padStart(5, '0')}`;
    }
  }

  // Fallback if not found (shouldn't happen if initialized)
  return `SO-${currentYear}-00001`;
}

/**
 * Create a new Order
 */
function createOrder(orderData, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];

    const newOrderId = generateOrderNumber();
    const timestamp = new Date().toISOString();

    // Construct new row based on headers to ensure correct column mapping
    const newRow = new Array(headers.length).fill("");

    const mapField = (field, value) => {
      const idx = headers.indexOf(field);
      if (idx !== -1) newRow[idx] = value;
    };

    mapField("OrderID", newOrderId);
    mapField("OrderDate", orderData.orderDate || timestamp);
    mapField("Company", orderData.company);
    mapField("PartyCode", orderData.partyCode);
    mapField("PartyName", orderData.partyName);
    mapField("Quantity", orderData.quantity);
    mapField("BrandCode", orderData.brandCode);
    mapField("BrandName", orderData.brandName);
    mapField("Rate", orderData.rate);
    mapField("OrderValue", orderData.orderValue);
    mapField("DeliveryTerm", orderData.deliveryTerm);
    mapField("PaymentTerm", orderData.paymentTerm);
    mapField("SaleFrom", orderData.saleFrom);
    mapField("SaleTo", orderData.saleTo);
    mapField("WarehouseID", orderData.warehouseId);
    mapField("SalesPerson", orderData.salesPerson);
    mapField("Priority", orderData.priority || "Normal");
    mapField("OrderSource", orderData.orderSource);
    mapField("CustomerPO", orderData.customerPO);
    mapField("CustomerPODate", orderData.customerPODate);
    mapField("RequiredDeliveryDate", orderData.requiredDeliveryDate);
    mapField("Remarks", orderData.remarks);
    mapField("CurrentStage", ORDER_STAGES.ORDER_RECEIVED);
    mapField("CurrentOwner", userId); // Initially owned by creator
    mapField("OverallStatus", ORDER_STATUSES.OPEN);
    mapField("CreatedAt", timestamp);
    mapField("UpdatedAt", timestamp);
    mapField("IsDeleted", "FALSE");

    ordersSheet.appendRow(newRow);

    // Log Audit and Timeline
    logAudit("ORDERS", newOrderId, "Created", "", "New Order", userId);
    logTimeline(newOrderId, ORDER_STAGES.ORDER_RECEIVED, "Order Created", userId, orderData.remarks);

    // Trigger task generation (Will be handled in Tasks.gs)
    if (typeof generateTasksForStage === 'function') {
      generateTasksForStage(newOrderId, ORDER_STAGES.ORDER_RECEIVED, userId);
    }

    return { success: true, orderId: newOrderId };

  } catch (error) {
    logSystemError("ERROR", "Order creation failed: " + error.toString(), "Orders");
    return { success: false, message: error.toString() };
  }
}

/**
 * Update an existing order stage
 */
function updateOrderStage(orderId, newStage, userId, remarks) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("OrderID");
    const stageIdx = headers.indexOf("CurrentStage");
    const statusIdx = headers.indexOf("OverallStatus");
    const ownerIdx = headers.indexOf("CurrentOwner");
    const updatedIdx = headers.indexOf("UpdatedAt");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === orderId) {
        const oldStage = data[i][stageIdx];

        ordersSheet.getRange(i + 1, stageIdx + 1).setValue(newStage);
        ordersSheet.getRange(i + 1, updatedIdx + 1).setValue(new Date().toISOString());

        // Determine overall status based on stage
        let newStatus = ORDER_STATUSES.IN_PROGRESS;
        if (newStage === ORDER_STAGES.DISPATCHED) newStatus = ORDER_STATUSES.DISPATCHED;
        if (newStage === ORDER_STAGES.DELIVERED) newStatus = ORDER_STATUSES.DELIVERED;
        if (newStage === ORDER_STAGES.CLOSED) newStatus = ORDER_STATUSES.CLOSED;

        ordersSheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);

        logAudit("ORDERS", orderId, "CurrentStage", oldStage, newStage, userId);
        logTimeline(orderId, newStage, `Stage updated to ${newStage}`, userId, remarks);

        // Auto-generate next task
        if (typeof generateTasksForStage === 'function') {
          generateTasksForStage(orderId, newStage, userId);
        }

        return { success: true };
      }
    }
    return { success: false, message: "Order not found" };
  } catch (error) {
    logSystemError("ERROR", "Stage update failed: " + error.toString(), "Orders");
    return { success: false, message: error.toString() };
  }
}

/**
 * Log Timeline Event
 */
function logTimeline(orderId, stage, action, user, remarks) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("TIMELINE");
  sheet.appendRow([
    generateId("TL"), orderId, stage, action, user, new Date().toISOString(), remarks || "", "FALSE"
  ]);
}

/**
 * Log Audit Event
 */
function logAudit(module, recordId, field, oldValue, newValue, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AUDIT_LOGS");
  sheet.appendRow([
    generateId("AUD"), module, recordId, field, oldValue, newValue, user, new Date().toISOString(), "FALSE"
  ]);
}

/**
 * Get all active orders (with basic caching/indexing logic if needed later)
 */
function getOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ORDERS");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf("IsDeleted")] === "TRUE") continue;

    let order = {};
    headers.forEach((h, idx) => {
      order[h] = data[i][idx];
    });
    orders.push(order);
  }
  return orders;
}

/**
 * Get order by ID
 */
function getOrderById(orderId) {
  const orders = getOrders();
  return orders.find(o => o.OrderID === orderId) || null;
}
// Tasks.gs
// Task Engine for auto-generating and managing tasks based on SLA configurations and workflow stages

const TASK_STATUSES = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

/**
 * Generate tasks automatically when an order reaches a new stage.
 */
function generateTasksForStage(orderId, stage, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = ss.getSheetByName("TASKS");
    const slaConfig = getSLAConfigurations();
    const timestamp = new Date().toISOString();

    // Complete previous active tasks for this order
    completeActiveTasksForOrder(orderId, userId);

    // Determine the next task based on the current stage
    let taskType = "";
    let roleAssigned = "";
    let priority = "High";
    let slaHours = 24; // Default fallback

    switch (stage) {
      case "ORDER_RECEIVED":
        taskType = "SO Creation";
        roleAssigned = "SALES";
        slaHours = getSLAHours("SO Creation", slaConfig, 0.5);
        break;
      case "SO_CREATED":
        taskType = "Stock Confirmation";
        roleAssigned = "DISPATCH";
        slaHours = getSLAHours("Stock Confirmation", slaConfig, 2);
        break;
      case "STOCK_CONFIRMED":
        taskType = "Transport Arrangement";
        roleAssigned = "DISPATCH";
        slaHours = getSLAHours("Transport Arrangement", slaConfig, 2);
        break;
      case "TRANSPORT_ASSIGNED":
        taskType = "Billing";
        roleAssigned = "BILLING";
        slaHours = getSLAHours("Billing", slaConfig, 1);
        break;
      case "BILL_GENERATED":
        taskType = "Dispatch";
        roleAssigned = "DISPATCH";
        slaHours = getSLAHours("Dispatch", slaConfig, 1);
        break;
      case "DISPATCHED":
        taskType = "Customer Feedback";
        roleAssigned = "CRM";
        slaHours = getSLAHours("Customer Feedback", slaConfig, 48);
        break;
      default:
        return; // No tasks for DELIVERED, CLOSED, etc.
    }

    // Calculate Due Date based on SLA Hours
    let dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + slaHours);

    // Append the new task
    // TASKS Schema: TaskID, OrderID, TaskType, Priority, TaskOwnerRole, AssignedTo, AssignedDate, DueDate, CompletedDate, Status, DelayHours, EscalationLevel, Remarks, IsDeleted
    tasksSheet.appendRow([
      generateId("TSK"), orderId, taskType, priority, roleAssigned, "", timestamp, dueDate.toISOString(),
      "", TASK_STATUSES.PENDING, 0, 0, "", "FALSE"
    ]);

    // Log creation
    logAudit("TASKS", orderId, "Created", "", taskType, "System");

    // Create Notification for the assigned role
    if (typeof createNotificationForRole === 'function') {
      createNotificationForRole(roleAssigned, `New Task: ${taskType}`, `Order ${orderId} requires ${taskType}`, "Task", "TASKS", orderId);
    }

  } catch (error) {
    logSystemError("ERROR", "Task generation failed: " + error.toString(), "Tasks");
  }
}

/**
 * Fetch SLA configurations from the sheet and cache them as an object
 */
function getSLAConfigurations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const slaSheet = ss.getSheetByName("SLA_CONFIG");
  const data = slaSheet.getDataRange().getValues();
  const headers = data[0];

  const processIdx = headers.indexOf("Process");
  const hoursIdx = headers.indexOf("SLAHours");
  const isDeletedIdx = headers.indexOf("IsDeleted");

  const config = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][isDeletedIdx] === "TRUE") continue;
    config[data[i][processIdx]] = data[i][hoursIdx];
  }
  return config;
}

/**
 * Helper to safely get SLA hours or fallback
 */
function getSLAHours(processName, configMap, fallback) {
  return configMap[processName] !== undefined ? parseFloat(configMap[processName]) : fallback;
}

/**
 * Marks currently pending tasks for an order as completed
 */
function completeActiveTasksForOrder(orderId, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tasksSheet = ss.getSheetByName("TASKS");
  const data = tasksSheet.getDataRange().getValues();
  const headers = data[0];

  const idIdx = headers.indexOf("TaskID");
  const orderIdx = headers.indexOf("OrderID");
  const statusIdx = headers.indexOf("Status");
  const compDateIdx = headers.indexOf("CompletedDate");
  const isDeletedIdx = headers.indexOf("IsDeleted");
  const typeIdx = headers.indexOf("TaskType");

  const timestamp = new Date().toISOString();
  let tasksUpdated = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][isDeletedIdx] === "TRUE") continue;

    if (data[i][orderIdx] === orderId && (data[i][statusIdx] === TASK_STATUSES.PENDING || data[i][statusIdx] === TASK_STATUSES.IN_PROGRESS)) {
      tasksSheet.getRange(i + 1, statusIdx + 1).setValue(TASK_STATUSES.COMPLETED);
      tasksSheet.getRange(i + 1, compDateIdx + 1).setValue(timestamp);

      logAudit("TASKS", data[i][idIdx], "Status", data[i][statusIdx], TASK_STATUSES.COMPLETED, userId);
      tasksUpdated = true;
    }
  }
  return tasksUpdated;
}

/**
 * Update a specific task manually (e.g. claim it, or update remarks)
 */
function updateTask(taskId, assignedTo, status, remarks, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = ss.getSheetByName("TASKS");
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("TaskID");
    const assignIdx = headers.indexOf("AssignedTo");
    const statusIdx = headers.indexOf("Status");
    const remIdx = headers.indexOf("Remarks");
    const compDateIdx = headers.indexOf("CompletedDate");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === taskId) {
        if (assignedTo) tasksSheet.getRange(i + 1, assignIdx + 1).setValue(assignedTo);
        if (status) {
          tasksSheet.getRange(i + 1, statusIdx + 1).setValue(status);
          if (status === TASK_STATUSES.COMPLETED) {
            tasksSheet.getRange(i + 1, compDateIdx + 1).setValue(new Date().toISOString());
          }
        }
        if (remarks) tasksSheet.getRange(i + 1, remIdx + 1).setValue(remarks);

        logAudit("TASKS", taskId, "Updated", "", status, userId);
        return { success: true };
      }
    }
    return { success: false, message: "Task not found" };
  } catch (error) {
    logSystemError("ERROR", "Task update failed: " + error.toString(), "Tasks");
    return { success: false, message: error.toString() };
  }
}
/**
 * Fetch tasks for a specific user and their role.
 * (Appending to Tasks.gs)
 */
function getUserTasks(userId, role) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = ss.getSheetByName("TASKS");
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    const tasks = [];
    const isDeletedIdx = headers.indexOf("IsDeleted");
    const statusIdx = headers.indexOf("Status");
    const assignIdx = headers.indexOf("AssignedTo");
    const roleIdx = headers.indexOf("TaskOwnerRole");

    for (let i = 1; i < data.length; i++) {
      if (data[i][isDeletedIdx] === "TRUE") continue;

      const status = data[i][statusIdx];
      // Only get Pending or In Progress
      if (status !== "Pending" && status !== "In Progress") continue;

      const assignedTo = data[i][assignIdx];
      const taskRole = data[i][roleIdx];

      // Task belongs to user if assigned explicitly to them, OR if unassigned and matches their role
      if (assignedTo === userId || (!assignedTo && taskRole === role)) {
        let task = {};
        headers.forEach((h, idx) => {
          task[h] = data[i][idx];
        });
        tasks.push(task);
      }
    }
    return tasks;
  } catch (error) {
    logSystemError("ERROR", "getUserTasks failed: " + error.toString(), "Tasks");
    return [];
  }
}
// SLA.gs
// SLA Engine: Calculates delays, creates escalations, and integrates with time-driven triggers

/**
 * Main trigger function to be executed every 15 minutes.
 * Scans all pending/in-progress tasks, calculates delay, updates records, and creates notifications.
 */
function checkSLABreaches() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = ss.getSheetByName("TASKS");
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("TaskID");
    const orderIdx = headers.indexOf("OrderID");
    const typeIdx = headers.indexOf("TaskType");
    const dueDateIdx = headers.indexOf("DueDate");
    const statusIdx = headers.indexOf("Status");
    const delayIdx = headers.indexOf("DelayHours");
    const escIdx = headers.indexOf("EscalationLevel");
    const roleIdx = headers.indexOf("TaskOwnerRole");
    const assignIdx = headers.indexOf("AssignedTo");
    const isDeletedIdx = headers.indexOf("IsDeleted");

    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE") continue;

      const status = row[statusIdx];
      if (status === "Pending" || status === "In Progress") {
        const dueDate = new Date(row[dueDateIdx]);

        // Calculate delay in hours if overdue
        if (now > dueDate) {
          const diffMs = now - dueDate;
          const delayHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

          // Update Delay Hours
          tasksSheet.getRange(i + 1, delayIdx + 1).setValue(delayHours);

          let currentEscalation = parseInt(row[escIdx]) || 0;

          // Escalation Logic (e.g., Level 1 right after breach, Level 2 after 4 hours delay)
          let needsEscalation = false;
          let escMessage = "";

          if (delayHours > 0 && currentEscalation === 0) {
            currentEscalation = 1;
            needsEscalation = true;
            escMessage = `SLA Breached for ${row[typeIdx]} on Order ${row[orderIdx]}`;
          } else if (delayHours >= 4 && currentEscalation === 1) {
            currentEscalation = 2;
            needsEscalation = true;
            escMessage = `Critical Delay: ${row[typeIdx]} on Order ${row[orderIdx]} is delayed by > 4 hours`;
          }

          if (needsEscalation) {
            // Update Escalation Level
            tasksSheet.getRange(i + 1, escIdx + 1).setValue(currentEscalation);

            // Log Audit
            logAudit("TASKS", row[idIdx], "EscalationLevel", currentEscalation - 1, currentEscalation, "System");

            // Notify Assigned User or Role
            if (typeof createNotification === 'function') {
              if (row[assignIdx]) {
                createNotification(row[assignIdx], "SLA Breach", escMessage, "Alert", "TASKS", row[idIdx]);
              } else {
                createNotificationForRole(row[roleIdx], "SLA Breach", escMessage, "Alert", "TASKS", row[idIdx]);
              }
              // Also notify ADMIN for Level 2
              if (currentEscalation >= 2) {
                createNotificationForRole("ADMIN", "Critical Delay Alert", escMessage, "Alert", "ORDERS", row[orderIdx]);
              }
            }

            // Update Overall Status of the Order to "Delayed"
            updateOrderStatusToDelayed(row[orderIdx]);
          }
        }
      }
    }
  } catch (error) {
    logSystemError("ERROR", "checkSLABreaches failed: " + error.toString(), "SLA");
  }
}

/**
 * Sets the order status to delayed if not already closed/delivered.
 */
function updateOrderStatusToDelayed(orderId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("OrderID");
    const statusIdx = headers.indexOf("OverallStatus");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === orderId) {
        const currentStatus = data[i][statusIdx];
        if (currentStatus !== "Closed" && currentStatus !== "Delivered" && currentStatus !== "Cancelled" && currentStatus !== "Delayed") {
          ordersSheet.getRange(i + 1, statusIdx + 1).setValue("Delayed");
          logAudit("ORDERS", orderId, "OverallStatus", currentStatus, "Delayed", "System");
        }
        break;
      }
    }
  } catch (error) {
    logSystemError("ERROR", "updateOrderStatusToDelayed failed: " + error.toString(), "SLA");
  }
}

/**
 * Setup function to install the trigger.
 * Admin should call this once from the UI or Apps Script Editor.
 */
function installSLATrigger() {
  // Clear existing to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkSLABreaches") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Install trigger to run every 15 minutes
  ScriptApp.newTrigger("checkSLABreaches")
    .timeBased()
    .everyMinutes(15)
    .create();

  return "SLA Trigger installed successfully.";
}
// Notifications.gs
// Handles generating and fetching notifications for users and roles.

/**
 * Creates a notification for a specific user.
 *
 * @param {string} userId - The target user ID
 * @param {string} title - Short title of the notification
 * @param {string} message - Full message body
 * @param {string} type - 'Task', 'Alert', 'Info', etc.
 * @param {string} relatedModule - 'ORDERS', 'TASKS', etc. (for deep linking)
 * @param {string} relatedRecordId - The ID of the related record
 */
function createNotification(userId, title, message, type, relatedModule, relatedRecordId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");

    // Schema: NotificationID, UserID, Title, Message, Type, ReadStatus, RelatedModule, RelatedRecordID, CreatedAt, IsDeleted
    sheet.appendRow([
      generateId("NOT"), userId, title, message, type, "Unread", relatedModule, relatedRecordId,
      new Date().toISOString(), "FALSE"
    ]);
  } catch (error) {
    logSystemError("ERROR", "createNotification failed: " + error.toString(), "Notifications");
  }
}

/**
 * Creates a notification for all active users holding a specific role.
 */
function createNotificationForRole(role, title, message, type, relatedModule, relatedRecordId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("UserID");
    const roleIdx = headers.indexOf("Role");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");

    // Collect all user IDs matching the role
    const userIds = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][isDeletedIdx] === "TRUE" || data[i][statusIdx] !== "Active") continue;

      if (data[i][roleIdx] === role) {
        userIds.push(data[i][idIdx]);
      }
    }

    // Create notification for each user
    userIds.forEach(uid => {
      createNotification(uid, title, message, type, relatedModule, relatedRecordId);
    });

  } catch (error) {
    logSystemError("ERROR", "createNotificationForRole failed: " + error.toString(), "Notifications");
  }
}

/**
 * Fetches notifications for a specific user.
 */
function getUserNotifications(userId, unreadOnly = false) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const notifications = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("IsDeleted")] === "TRUE") continue;

      if (data[i][headers.indexOf("UserID")] === userId) {
        if (unreadOnly && data[i][headers.indexOf("ReadStatus")] !== "Unread") continue;

        let notif = {};
        headers.forEach((h, idx) => {
          notif[h] = data[i][idx];
        });
        notifications.push(notif);
      }
    }

    // Sort descending by CreatedAt
    return notifications.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  } catch (error) {
    logSystemError("ERROR", "getUserNotifications failed: " + error.toString(), "Notifications");
    return [];
  }
}

/**
 * Marks a notification as read.
 */
function markNotificationAsRead(notificationId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf("NotificationID");
    const readIdx = data[0].indexOf("ReadStatus");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === notificationId) {
        sheet.getRange(i + 1, readIdx + 1).setValue("Read");
        return { success: true };
      }
    }
    return { success: false, message: "Notification not found" };
  } catch (error) {
    logSystemError("ERROR", "markNotificationAsRead failed: " + error.toString(), "Notifications");
    return { success: false, message: error.toString() };
  }
}

/**
 * Marks all notifications as read for a given user.
 */
function markAllNotificationsAsRead(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();

    const idIdx = data[0].indexOf("UserID");
    const readIdx = data[0].indexOf("ReadStatus");
    const isDeletedIdx = data[0].indexOf("IsDeleted");

    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][isDeletedIdx] === "TRUE") continue;

      if (data[i][idIdx] === userId && data[i][readIdx] === "Unread") {
        sheet.getRange(i + 1, readIdx + 1).setValue("Read");
        updated = true;
      }
    }
    return { success: true, updated: updated };
  } catch (error) {
    logSystemError("ERROR", "markAllNotificationsAsRead failed: " + error.toString(), "Notifications");
    return { success: false, message: error.toString() };
  }
}
// Dashboard.gs
// APIs to calculate KPIs, metrics, and data for the Dashboard charts.

/**
 * Main function to fetch all dashboard metrics.
 * Designed to return a comprehensive JSON object for the frontend.
 */
function getDashboardMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Fetch data arrays
    const ordersData = getActiveRows(ss, "ORDERS");
    const tasksData = getActiveRows(ss, "TASKS");
    const usersData = getActiveRows(ss, "USERS");

    // Header maps for easier access
    const ordersHeaders = getHeaders(ss, "ORDERS");
    const tasksHeaders = getHeaders(ss, "TASKS");

    // KPI Counters
    let totalOrdersToday = 0;
    let pendingOrders = 0;
    let delayedOrdersCount = 0;
    let dispatchPending = 0;
    let deliveredOrders = 0;
    let closedOrders = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Arrays for charts
    const ordersByStatus = {};
    const ordersByWarehouse = {};
    const delayAnalysis = {}; // stage -> count

    const delayedOrdersList = []; // For "Top Delayed Orders"

    // Process Orders
    ordersData.forEach(row => {
      const order = mapRowToObject(row, ordersHeaders);

      // 1. Total Orders Today
      const orderDateStr = order.OrderDate ? new Date(order.OrderDate).toISOString().split('T')[0] : "";
      if (orderDateStr === todayStr) totalOrdersToday++;

      // 2. Pending Orders
      if (["Draft", "Open", "In Progress"].includes(order.OverallStatus)) pendingOrders++;

      // 3. Delayed Orders
      if (order.OverallStatus === "Delayed") {
        delayedOrdersCount++;
        delayedOrdersList.push(order);
      }

      // 4. Dispatch Pending (e.g. stage is BEFORE DISPATCHED but not closed)
      const preDispatchStages = ["ORDER_RECEIVED", "SO_CREATED", "STOCK_CONFIRMED", "TRANSPORT_ASSIGNED", "BILL_GENERATED"];
      if (preDispatchStages.includes(order.CurrentStage) && order.OverallStatus !== "Cancelled") dispatchPending++;

      // 5. Delivered / Closed
      if (order.OverallStatus === "Delivered") deliveredOrders++;
      if (order.OverallStatus === "Closed") closedOrders++;

      // Chart: Orders By Status
      ordersByStatus[order.OverallStatus] = (ordersByStatus[order.OverallStatus] || 0) + 1;

      // Chart: Orders By Warehouse
      const whId = order.WarehouseID || "Unassigned";
      ordersByWarehouse[whId] = (ordersByWarehouse[whId] || 0) + 1;
    });

    // Process Tasks (for Employee Performance, Delay Analysis, SLA Breach count)
    let slaBreachCount = 0;
    const employeePerformance = {};

    tasksData.forEach(row => {
      const task = mapRowToObject(row, tasksHeaders);

      // SLA Breaches
      if (parseFloat(task.DelayHours) > 0) {
        slaBreachCount++;
        delayAnalysis[task.TaskType] = (delayAnalysis[task.TaskType] || 0) + 1;
      }

      // Employee Performance
      if (task.AssignedTo) {
        if (!employeePerformance[task.AssignedTo]) {
          employeePerformance[task.AssignedTo] = { total: 0, completed: 0, delayed: 0 };
        }
        employeePerformance[task.AssignedTo].total++;
        if (task.Status === "Completed") employeePerformance[task.AssignedTo].completed++;
        if (parseFloat(task.DelayHours) > 0) employeePerformance[task.AssignedTo].delayed++;
      }
    });

    // Format Top Delayed Orders
    delayedOrdersList.sort((a, b) => new Date(a.OrderDate) - new Date(b.OrderDate));
    const topDelayedOrders = delayedOrdersList.slice(0, 5).map(o => ({
      OrderID: o.OrderID,
      Company: o.Company,
      Stage: o.CurrentStage,
      Date: o.OrderDate
    }));

    // Format Top Delayed Employees
    const empArr = Object.keys(employeePerformance).map(emp => {
      return { user: emp, delays: employeePerformance[emp].delayed };
    }).filter(e => e.delays > 0).sort((a, b) => b.delays - a.delays).slice(0, 5);

    // Map usernames to real names if needed
    const userNamesMap = {};
    usersData.forEach(row => {
       const id = row[0]; // Assuming UserID is col 1
       const name = row[1]; // Name is col 2
       userNamesMap[id] = name;
    });

    const topDelayedEmployees = empArr.map(e => ({
       User: userNamesMap[e.user] || e.user,
       Delays: e.delays
    }));

    return {
      success: true,
      data: {
        kpi: {
          totalOrdersToday,
          pendingOrders,
          delayedOrdersCount,
          dispatchPending,
          deliveredOrders,
          closedOrders,
          slaBreachCount
        },
        charts: {
          ordersByStatus,
          ordersByWarehouse,
          delayAnalysis
        },
        tables: {
          topDelayedOrders,
          topDelayedEmployees
        }
      }
    };

  } catch (error) {
    logSystemError("ERROR", "getDashboardMetrics failed: " + error.toString(), "Dashboard");
    return { success: false, message: error.toString() };
  }
}

/**
 * Utility: Get active (non-deleted) rows from a sheet.
 * Returns array of rows (excluding header).
 */
function getActiveRows(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const isDeletedIdx = data[0].indexOf("IsDeleted");
  const activeRows = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][isDeletedIdx] !== "TRUE") {
      activeRows.push(data[i]);
    }
  }
  return activeRows;
}

/**
 * Utility: Get headers for a sheet.
 */
function getHeaders(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * Utility: Map row array to object using headers.
 */
function mapRowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
}
// Reports.gs
// Handles generating structured data for various report types (Orders, Dispatch, Performance)

/**
 * Generate a specific report based on type and date range
 */
function generateReport(reportType, startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Parse dates if provided
    const start = startDate ? new Date(startDate) : new Date(0); // Epoch start
    const end = endDate ? new Date(endDate) : new Date(); // Now
    end.setHours(23, 59, 59, 999); // End of day

    let reportData = [];
    let headers = [];

    switch (reportType) {
      case "ORDER_REPORT":
        const ordersRows = getActiveRows(ss, "ORDERS");
        const orderHeaders = getHeaders(ss, "ORDERS");

        headers = ["OrderID", "Date", "Customer", "Quantity", "OrderValue", "Status", "Stage"];

        ordersRows.forEach(row => {
          const o = mapRowToObject(row, orderHeaders);
          const oDate = new Date(o.OrderDate || o.CreatedAt);
          if (oDate >= start && oDate <= end) {
            reportData.push([
              o.OrderID,
              oDate.toLocaleDateString(),
              o.PartyName || o.Company,
              o.Quantity,
              o.OrderValue,
              o.OverallStatus,
              o.CurrentStage
            ]);
          }
        });
        break;

      case "PERFORMANCE_REPORT":
        const tasksRows = getActiveRows(ss, "TASKS");
        const taskHeaders = getHeaders(ss, "TASKS");
        const usersRows = getActiveRows(ss, "USERS");
        const userMap = {};

        usersRows.forEach(u => {
          userMap[u[0]] = u[1]; // UserID -> Name
        });

        headers = ["Employee", "Total Tasks", "Completed", "Delayed", "Avg Delay (Hrs)"];
        const empStats = {};

        tasksRows.forEach(row => {
          const t = mapRowToObject(row, taskHeaders);
          const tDate = new Date(t.AssignedDate);

          if (tDate >= start && tDate <= end && t.AssignedTo) {
            const empName = userMap[t.AssignedTo] || t.AssignedTo;
            if (!empStats[empName]) {
              empStats[empName] = { total: 0, completed: 0, delayedCount: 0, totalDelayHrs: 0 };
            }

            empStats[empName].total++;
            if (t.Status === "Completed") empStats[empName].completed++;

            const delay = parseFloat(t.DelayHours) || 0;
            if (delay > 0) {
              empStats[empName].delayedCount++;
              empStats[empName].totalDelayHrs += delay;
            }
          }
        });

        for (const emp in empStats) {
          const stat = empStats[emp];
          const avgDelay = stat.delayedCount > 0 ? (stat.totalDelayHrs / stat.delayedCount).toFixed(2) : 0;
          reportData.push([emp, stat.total, stat.completed, stat.delayedCount, avgDelay]);
        }
        break;

      default:
        return { success: false, message: "Unknown report type" };
    }

    return { success: true, headers: headers, data: reportData };

  } catch (error) {
    logSystemError("ERROR", "generateReport failed: " + error.toString(), "Reports");
    return { success: false, message: error.toString() };
  }
}
// Utils.gs
// Utility functions and Database Initialization

/**
 * Main initialization script to set up the complete system.
 * This should be run once by the admin.
 */
function initializeSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Define all sheets and their headers
  const schema = {
    "USERS": [
      "UserID", "Name", "Role", "Department", "Mobile", "Email", "Username", "PasswordHash", "Status", "SessionToken", "LastLogin", "CreatedAt", "IsDeleted"
    ],
    "PARTIES": [
      "PartyCode", "PartyName", "Address", "GST", "Mobile", "CreditLimit", "Status", "IsDeleted"
    ],
    "BRANDS": [
      "BrandCode", "BrandName", "Status", "IsDeleted"
    ],
    "TRANSPORTERS": [
      "TransporterID", "TransportCompany", "ContactPerson", "Mobile", "Status", "IsDeleted"
    ],
    "WAREHOUSES": [
      "WarehouseID", "WarehouseName", "Location", "Manager", "Status", "IsDeleted"
    ],
    "ORDERS": [
      "OrderID", "OrderDate", "Company", "PartyCode", "PartyName", "Quantity", "BrandCode", "BrandName",
      "Rate", "OrderValue", "DeliveryTerm", "PaymentTerm", "SaleFrom", "SaleTo", "WarehouseID", "SalesPerson",
      "Priority", "OrderSource", "CustomerPO", "CustomerPODate", "RequiredDeliveryDate", "ActualClosureDate",
      "Remarks", "CurrentStage", "CurrentOwner", "OverallStatus", "TallyVoucherNo", "InvoiceNo", "InvoiceDate",
      "SyncStatus", "CreatedAt", "UpdatedAt", "IsDeleted"
    ],
    "TASKS": [
      "TaskID", "OrderID", "TaskType", "Priority", "TaskOwnerRole", "AssignedTo", "AssignedDate", "DueDate",
      "CompletedDate", "Status", "DelayHours", "EscalationLevel", "Remarks", "IsDeleted"
    ],
    "TIMELINE": [
      "TimelineID", "OrderID", "Stage", "Action", "User", "Timestamp", "Remarks", "IsDeleted"
    ],
    "TRANSPORT": [
      "TransportRecordID", "OrderID", "TransporterID", "TransportCompany", "DriverName", "DriverMobile",
      "VehicleNumber", "LRNumber", "FreightAmount", "FreightType", "DispatchDate", "ExpectedDeliveryDate",
      "ActualDeliveryDate", "IsDeleted"
    ],
    "FEEDBACK": [
      "FeedbackID", "OrderID", "CustomerName", "DeliveryRating", "ProductRating", "NPSScore", "Feedback",
      "Complaint", "ComplaintStatus", "FollowUpRequired", "IsDeleted"
    ],
    "FOLLOWUPS": [
      "FollowupID", "OrderID", "FollowupType", "AssignedTo", "FollowupDate", "Status", "Remarks", "IsDeleted"
    ],
    "DOCUMENTS": [
      "DocumentID", "OrderID", "DocumentType", "Version", "GoogleDriveLink", "FileID", "UploadedBy",
      "UploadedAt", "DocumentStatus", "IsDeleted"
    ],
    "AUDIT_LOGS": [
      "LogID", "Module", "RecordID", "FieldChanged", "OldValue", "NewValue", "ChangedBy", "Timestamp", "IsDeleted"
    ],
    "NOTIFICATIONS": [
      "NotificationID", "UserID", "Title", "Message", "Type", "ReadStatus", "RelatedModule", "RelatedRecordID",
      "CreatedAt", "IsDeleted"
    ],
    "SLA_CONFIG": [
      "ConfigID", "Process", "SLAHours", "WarningPercentage", "IsDeleted"
    ],
    "CONFIG": [
      "Key", "Value", "IsDeleted"
    ],
    "SEQUENCES": [
      "SequenceName", "CurrentValue", "Year", "IsDeleted"
    ],
    "SYSTEM_LOGS": [
      "LogID", "Level", "Message", "Module", "Timestamp", "IsDeleted"
    ]
  };

  // Create or update sheets
  for (const sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = schema[sheetName];
    // Check if headers exist and update if necessary
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      sheet.setFrozenRows(1);
    } else {
      // Basic check to see if headers match length, if not, it might need manual attention
      // For a fresh init, appendRow is fine.
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if(currentHeaders.length !== headers.length) {
          // If the schema changed and the sheet existed, we update headers but preserve data.
          // This is a simplistic approach. In a real scenario, you might want a more robust migration script.
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
      }
    }
  }

  // Seed default data
  seedDefaultData(ss);

  return "System Initialized Successfully";
}

function seedDefaultData(ss) {
  // 1. Seed Default Admin User
  const usersSheet = ss.getSheetByName("USERS");
  if (usersSheet.getLastRow() === 1) { // Only headers
    // Using a dummy hash for "admin123". This should be properly hashed via Auth.gs later if a user uses it.
    // However, we should just insert the plain text for the user to login first time, or a known hash.
    // For now, we will insert a known hash if we had one, but let's assume Auth.gs will handle it.
    // Let's assume a basic Base64 encoding for the very first init, but Auth.gs will upgrade it to SHA-256.
    // Actually, Phase 3 will define hashing. We will use a placeholder or plain text "admin123" for *initial* seed
    // and let Phase 3 update it.
    // Better yet, just put 'admin123' and Phase 3 Auth login will check if password == 'admin123' and force update.

    usersSheet.appendRow([
      generateId("USR"), "System Admin", "ADMIN", "Management", "", "admin@company.com", "admin",
      "admin123", "Active", "", "", new Date().toISOString(), "FALSE"
    ]);
  }

  // 2. Seed Default CONFIG
  const configSheet = ss.getSheetByName("CONFIG");
  if (configSheet.getLastRow() === 1) {
    const defaultConfigs = [
      ["DRIVE_FOLDER_ID", "REPLACE_WITH_FOLDER_ID", "FALSE"],
      ["COMPANY_NAME", "Operations Company", "FALSE"],
      ["ADMIN_EMAIL", "admin@company.com", "FALSE"],
      ["DEFAULT_SLA_WARNING", "80", "FALSE"],
      ["WHATSAPP_GROUP_NAME", "Ops Alerts", "FALSE"],
      ["APP_VERSION", "1.0.0", "FALSE"]
    ];
    configSheet.getRange(2, 1, defaultConfigs.length, 3).setValues(defaultConfigs);
  }

  // 3. Seed Default SLA Configurations
  const slaSheet = ss.getSheetByName("SLA_CONFIG");
  if (slaSheet.getLastRow() === 1) {
    const defaultSLAs = [
      [generateId("SLA"), "SO Creation", 0.5, 80, "FALSE"],
      [generateId("SLA"), "Stock Confirmation", 2, 80, "FALSE"],
      [generateId("SLA"), "Transport Arrangement", 2, 80, "FALSE"],
      [generateId("SLA"), "Billing", 1, 80, "FALSE"],
      [generateId("SLA"), "Dispatch", 1, 80, "FALSE"],
      [generateId("SLA"), "Customer Feedback", 48, 80, "FALSE"]
    ];
    slaSheet.getRange(2, 1, defaultSLAs.length, 5).setValues(defaultSLAs);
  }

  // 4. Seed Default Sequence for Orders
  const seqSheet = ss.getSheetByName("SEQUENCES");
  if (seqSheet.getLastRow() === 1) {
    const currentYear = new Date().getFullYear();
    seqSheet.appendRow(["SO_SEQUENCE", 0, currentYear, "FALSE"]);
  }
}

/**
 * Generates a unique ID
 */
function generateId(prefix) {
  return prefix + '-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
}

/**
 * System Logger
 */
function logSystemError(level, message, moduleName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("SYSTEM_LOGS");
  if (logSheet) {
    logSheet.appendRow([generateId("LOG"), level, message, moduleName, new Date().toISOString(), "FALSE"]);
  }
}
/**
 * Get all configs for settings page
 */
function getSystemSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("CONFIG");
  const data = sheet.getDataRange().getValues();

  const configs = [];
  for(let i=1; i<data.length; i++) {
    if(data[i][2] !== "TRUE") { // IsDeleted
      configs.push({ Key: data[i][0], Value: data[i][1] });
    }
  }
  return configs;
}

/**
 * Update configs
 */
function updateSystemSettings(dataObj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("CONFIG");
    const data = sheet.getDataRange().getValues();

    for(let i=1; i<data.length; i++) {
      const key = data[i][0];
      if(dataObj[key] !== undefined) {
        sheet.getRange(i+1, 2).setValue(dataObj[key]);
      }
    }
    return { success: true };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Get all users for admin panel
 */
function getAllUsersForAdmin() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("USERS");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const users = [];
  for(let i=1; i<data.length; i++) {
    if(data[i][headers.indexOf("IsDeleted")] !== "TRUE") {
      let u = {};
      headers.forEach((h, idx) => { u[h] = data[i][idx]; });
      // Remove sensitive data
      delete u.PasswordHash;
      delete u.SessionToken;
      users.push(u);
    }
  }
  return users;
}
