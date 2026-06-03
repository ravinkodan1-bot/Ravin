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
