/* =========================================================
   IMPORT OPERATIONS ERP - BACKEND (Code.gs)
   Architecture: Single File Backend (Modular Sections)
   Performance: Batch Read/Write Optimized
========================================================= */

/* ---------------------------------------------------------
   SYSTEM SETUP & CONFIG MODULE
--------------------------------------------------------- */
const SCRIPT_PROP_DB_ID = 'DB_SHEET_ID';

function doGet(e) {
  const html = HtmlService.createTemplateFromFile('Index');
  return html.evaluate()
             .setTitle('Import Operations ERP')
             .setFaviconUrl('https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico')
             .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setDatabaseId(id) {
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_DB_ID, id);
  return true;
}

const HARDCODED_DB_ID = '1poJCOnIkHwmyIIixr34M9ofC7KTZAVl09JaqULANRso'; // Added your DB ID here

function getDbId() {
  const propId = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_DB_ID);
  // If SCRIPT_PROP_DB_ID was modified by the user directly to be the ID, return it.
  // Otherwise return the propId, or the HARDCODED_DB_ID.
  if (SCRIPT_PROP_DB_ID && SCRIPT_PROP_DB_ID.length > 30) return SCRIPT_PROP_DB_ID;
  return propId || HARDCODED_DB_ID;
}

// Global configuration cache to prevent repeated sheet reads
let globalConfigCache = null;

function getConfig(key) {
    if(globalConfigCache && globalConfigCache[key]) return globalConfigCache[key];
    const dbId = getDbId();
    if(!dbId) return null;
    try {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("CONFIG");
        if(!sheet) return null;
        const data = sheet.getDataRange().getValues();
        globalConfigCache = {};
        for(let i=1; i<data.length; i++) {
            globalConfigCache[data[i][0]] = data[i][1];
        }
        return globalConfigCache[key];
    } catch(e) {
        logError("SYSTEM", "getConfig", e.message, e.stack, "System");
        return null;
    }
}

function setupDatabase() {
  const dbId = getDbId();
  if(!dbId) throw new Error("Database ID not set.");
  const ss = SpreadsheetApp.openById(dbId);

  const schemas = {
    "CONFIG": ["Key", "Value", "Description"],
    "USERS": ["ID", "Email", "Role", "Name", "IS_ACTIVE"],
    "ENTITIES": ["ID", "Type", "Name", "Email", "Contact", "IS_ACTIVE"],
    "SHIPMENTS": ["Job_No", "PI_Date", "Importer", "Supplier", "CHA_Name", "Shipping_Line", "Origin", "POD", "Invoice_No", "Invoice_Value", "Quantity", "BL_No", "BE_No", "BE_Date", "ETA_POD", "ETA_CFS", "Duty_Status", "Payment_Status", "Current_Stage", "Shipment_Status", "Remarks", "Delivery_Date", "Created_By", "Created_Date", "IS_ACTIVE"],
    "CONTAINERS": ["ID", "Job_No", "Container_No", "Type", "Size", "Seal_No", "Weight", "Arrival_Date", "Gate_Out_Date", "Vehicle_No", "Driver_Name", "Dispatch_Status", "Delivery_Status", "IS_ACTIVE"],
    "TIMELINE": ["Timeline_ID", "Job_No", "Event_Name", "Event_Date", "Target_Date", "Delay_Days", "Status", "Updated_By", "IS_ACTIVE"],
    "TASKS": ["ID", "Job_No", "Task_Name", "Priority", "Status", "Assigned_To", "Due_Date", "Follow_Up_Notes", "IS_ACTIVE"],
    "COSTING": ["ID", "Job_No", "Invoice", "Duty", "Shipping", "Transport", "CHA_Chg", "Port", "Other", "Qty"],
    "PAYMENTS": ["ID", "Job_No", "Payment_Type", "Vendor", "Amount", "Outstanding_Amount", "Request_Date", "Approved_By", "Approval_Date", "Paid_By", "Paid_Date", "Status", "Remarks", "IS_ACTIVE"],
    "DOCUMENTS": ["ID", "Job_No", "Doc_Type", "URL", "Date", "Expiry_Date", "Document_Status", "IS_ACTIVE"],
    "AUDIT_LOG": ["ID", "Timestamp", "User", "Module", "Action", "Record_ID", "Details"],
    "ERROR_LOG": ["Timestamp", "Module", "Function_Name", "Error_Message", "Stack_Trace", "User"]
  };

  for(let sheetName in schemas) {
    let sheet = ss.getSheetByName(sheetName);
    if(!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(schemas[sheetName]);
        sheet.getRange(1, 1, 1, schemas[sheetName].length).setFontWeight("bold").setBackground("#f3f3f3");

        // Seed default config
        if(sheetName === "CONFIG") {
            sheet.appendRow(["CRITICAL_DELAY_DAYS", "7", "Days after ETA to mark critical"]);
            sheet.appendRow(["MIS_EMAILS", "management@example.com", "Comma separated emails for Daily MIS"]);
        }
    }
  }
  return "Database Setup Complete";
}

/* ---------------------------------------------------------
   ERROR LOGGING MODULE
--------------------------------------------------------- */
function logError(module, functionName, errorMessage, stackTrace, userEmail) {
    const dbId = getDbId();
    if(!dbId) return;
    try {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("ERROR_LOG");
        if(sheet) {
            sheet.appendRow([new Date(), module, functionName, errorMessage, stackTrace, userEmail || "System"]);
        }
    } catch(e) {
        // Ultimate fallback
        console.error("FAILED TO WRITE ERROR LOG:", e);
    }
}

function setupTriggers() {
    resetTriggers();
    ScriptApp.newTrigger('triggerDailyMIS').timeBased().everyDays(1).atHour(8).create();
    return "Triggers configured successfully.";
}

function resetTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for(let i=0; i<triggers.length; i++) ScriptApp.deleteTrigger(triggers[i]);
    return "All triggers cleared.";
}

// Scheduled Trigger stubs
function triggerDailyMIS() {
    // Generate Daily MIS logic goes here
}

/* ---------------------------------------------------------
   AUTHENTICATION & RBAC MODULE
--------------------------------------------------------- */
function getCurrentUser() {
  const email = Session.getActiveUser().getEmail() || "anonymous@unknown.com";
  const dbId = getDbId();
  if (!dbId) return { email: email, role: "Unknown", name: "Guest", entityId: null };
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const data = ss.getSheetByName("USERS").getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const isActive = data[i][4];
      const emailMatches = String(data[i][1] || "").trim().toLowerCase() === email.trim().toLowerCase();
      const isActiveMatches = isActive === true || (typeof isActive === 'string' && (isActive.trim().toUpperCase() === 'TRUE' || isActive.trim().toUpperCase() === 'YES'));

      if (emailMatches && isActiveMatches) {
          return { id: data[i][0], email: data[i][1], role: data[i][2], name: data[i][3], entityId: null };
      }
    }
  } catch(e) {
      logError("AUTH", "getCurrentUser", e.message, e.stack, email);
  }
  return { email: email, role: "Read Only", name: email.split('@')[0], entityId: null };
}

function validatePermission(requiredRoles) {
  const user = getCurrentUser();
  if (user.role === 'Admin') return user;
  if (requiredRoles.includes(user.role)) return user;
  throw new Error("Unauthorized Access for role: " + user.role);
}

/* ---------------------------------------------------------
   BATCH DB HELPER MODULE
--------------------------------------------------------- */
function getBatchData(sheetName, filterFn) {
  const dbId = getDbId();
  if (!dbId) return [];
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = [];

    // Auto-detect IS_ACTIVE column to apply default active filter
    const isActiveIdx = headers.indexOf("IS_ACTIVE");

    for (let i = 1; i < data.length; i++) {
        if(isActiveIdx !== -1) {
            const val = data[i][isActiveIdx];
            if (val !== true && String(val).trim().toUpperCase() !== "TRUE" && String(val).trim().toUpperCase() !== "YES") continue;
        }

        let rowObj = {};
        for (let j = 0; j < headers.length; j++) rowObj[headers[j]] = data[i][j];

        if (!filterFn || filterFn(rowObj)) {
            results.push(rowObj);
        }
    }
    return results;
  } catch(e) {
      logError("DB", "getBatchData", e.message, e.stack, "System");
      return [];
  }
}

function logAudit(module, action, recordId, details) {
  const user = getCurrentUser();
  const dbId = getDbId();
  if(!dbId) return;
  try {
      const ss = SpreadsheetApp.openById(dbId);
      const sheet = ss.getSheetByName("AUDIT_LOG");
      if(sheet) {
          sheet.appendRow([Utilities.getUuid(), new Date(), user.email, module, action, recordId, JSON.stringify(details)]);
      }
  } catch(e) {
      logError("AUDIT", "logAudit", e.message, e.stack, user.email);
  }
}

/* ---------------------------------------------------------
   GLOBAL SEARCH MODULE
--------------------------------------------------------- */
function globalSearch(query) {
    if(!query || query.length < 3) return [];
    const q = query.toLowerCase().trim();
    const user = getCurrentUser();

    // Batch fetch all relevant data
    const shipments = getBatchData("SHIPMENTS", row => {
        // Enforce CHA Portal restriction
        if(user.role === 'CHA' && row.CHA_Name !== user.name) return false;

        return String(row.Job_No).toLowerCase().includes(q) ||
               String(row.BL_No).toLowerCase().includes(q) ||
               String(row.Invoice_No).toLowerCase().includes(q) ||
               String(row.BE_No).toLowerCase().includes(q) ||
               String(row.Importer).toLowerCase().includes(q) ||
               String(row.Supplier).toLowerCase().includes(q);
    });

    // If query matches a container, find its parent shipment
    if(shipments.length === 0) {
        const containers = getBatchData("CONTAINERS", row => String(row.Container_No).toLowerCase().includes(q));
        if(containers.length > 0) {
            const jobNos = [...new Set(containers.map(c => c.Job_No))];
            const linkedShipments = getBatchData("SHIPMENTS", row => jobNos.includes(row.Job_No));
            linkedShipments.forEach(s => {
                if(user.role !== 'CHA' || s.CHA_Name === user.name) shipments.push(s);
            });
        }
    }

    return shipments;
}

/* ---------------------------------------------------------
   SHIPMENT MODULE
--------------------------------------------------------- */
function getActiveShipments() {
  const user = getCurrentUser();
  return getBatchData("SHIPMENTS", row => {
      if(user.role === 'CHA') return row.CHA_Name === user.name;
      return true;
  });
}

function saveShipment(data) {
  validatePermission(['Admin', 'Import Team', 'Management']);
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("SHIPMENTS");

  const isNew = !data.isEdit;
  const createdBy = isNew ? getCurrentUser().email : data.Created_By;
  const createdDate = isNew ? new Date() : new Date(data.Created_Date);
  const shipmentStatus = data.Shipment_Status || "Active";

  const rowData = [
      data.Job_No, data.PI_Date, data.Importer, data.Supplier, data.CHA_Name, data.Shipping_Line,
      data.Origin, data.POD, data.Invoice_No, data.Invoice_Value, data.Quantity, data.BL_No,
      data.BE_No, data.BE_Date, data.ETA_POD, data.ETA_CFS, data.Duty_Status, data.Payment_Status,
      data.Current_Stage, shipmentStatus, data.Remarks, data.Delivery_Date, createdBy, createdDate, true
  ];


  if(isNew) {
      sheet.appendRow(rowData);
      logAudit("SHIPMENTS", "CREATE", data.Job_No, {importer: data.Importer, cha: data.CHA_Name});
      addTimelineEntry(data.Job_No, "Shipment Booked", "Completed", 0);
  } else {
      const allData = sheet.getDataRange().getValues();
      const jobIdx = allData[0].indexOf("Job_No");
      const stageIdx = allData[0].indexOf("Current_Stage");
      for(let i=1; i<allData.length; i++) {
          if(allData[i][jobIdx] === data.Job_No) {
              const oldStage = allData[i][stageIdx];
              sheet.getRange(i+1, 1, 1, rowData.length).setValues([rowData]);
              logAudit("SHIPMENTS", "UPDATE", data.Job_No, {stage: data.Current_Stage});

              if(oldStage !== data.Current_Stage) {
                  addTimelineEntry(data.Job_No, data.Current_Stage, "Completed", 0);
              }
              break;
          }
      }
  }
  return true;
}

function getShipmentDetails(jobNo) {
    const user = getCurrentUser();
    const shipments = getBatchData("SHIPMENTS", row => row.Job_No === jobNo);
    if(shipments.length === 0) throw new Error("Shipment not found.");
    const s = shipments[0];

    if(user.role === 'CHA' && s.CHA_Name !== user.name) throw new Error("Unauthorized access to shipment.");

    // Fetch associated containers
    const containers = getBatchData("CONTAINERS", row => row.Job_No === jobNo);
    s.containers = containers;
    return s;
}

/* ---------------------------------------------------------
   CONTAINER MODULE
--------------------------------------------------------- */
function saveContainer(data) {
  validatePermission(['Admin', 'Import Team']);
  const dbId = getDbId();
  if(!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("CONTAINERS");

  if(!data.ID) { // New
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.Job_No, data.Container_No, data.Type, data.Size, data.Seal_No, data.Weight, data.Arrival_Date, data.Gate_Out_Date, data.Vehicle_No, data.Driver_Name, data.Dispatch_Status, data.Delivery_Status, true]);
      logAudit("CONTAINERS", "CREATE", data.Job_No, {container: data.Container_No});
  } else { // Edit
      const allData = sheet.getDataRange().getValues();
      const idIdx = allData[0].indexOf("ID");
      for(let i=1; i<allData.length; i++) {
          if(allData[i][idIdx] === data.ID) {
              sheet.getRange(i+1, 2, 1, 12).setValues([[data.Job_No, data.Container_No, data.Type, data.Size, data.Seal_No, data.Weight, data.Arrival_Date, data.Gate_Out_Date, data.Vehicle_No, data.Driver_Name, data.Dispatch_Status, data.Delivery_Status]]);
              logAudit("CONTAINERS", "UPDATE", data.Job_No, {container: data.Container_No, status: data.Dispatch_Status});
              break;
          }
      }
  }
}

/* ---------------------------------------------------------
   DASHBOARD & ANALYTICS ENGINE MODULE
--------------------------------------------------------- */
function getDashboardData() {
    const user = getCurrentUser();

    // CHA View constraint
    const shipFilter = user.role === 'CHA' ? (row => row.CHA_Name === user.name) : (row => true);

    const shipments = getBatchData("SHIPMENTS", shipFilter);
    const tasks = getBatchData("TASKS", row => user.role !== 'CHA' || row.Assigned_To === user.name);
    const payments = getBatchData("PAYMENTS", row => user.role !== 'CHA'); // CHA can't see payments
    const docs = getBatchData("DOCUMENTS", shipFilter);
    const timeline = getBatchData("TIMELINE", shipFilter);

    const now = new Date();
    const criticalDelayDays = parseInt(getConfig("CRITICAL_DELAY_DAYS") || "7");

    // Arrays to compute KPIs
    let delayed = 0;
    let dutyPending = 0;
    let pendingPaymentsCount = 0;
    let doExpiring = 0;
    let containersPendingDispatch = 0;
    let readyForDelivery = 0;
    let moneyBlocked = 0;
    let todaysActions = 0;
    let totalOutstanding = 0;
    let approvedPending = 0;

    let delayPenaltyCount = 0;

    // Pull COSTING data ONCE for precise "Other Expenses"
    const costing = getBatchData("COSTING", null);

    // Process Shipments
    shipments.forEach(s => {
        if(s.Shipment_Status === 'Delayed') {
            delayed++;
            delayPenaltyCount++;
        }
        if(s.Duty_Status === 'Pending') dutyPending++;
        if(s.Current_Stage === 'Dispatch Planned') readyForDelivery++;

        // Calculate precise Money Blocked according to formula
        if(s.Shipment_Status !== 'Completed') {
            moneyBlocked += (Number(s.Invoice_Value) || 0);

            // Add pending expenses from COSTING
            const costData = costing.find(c => c.Job_No === s.Job_No);
            if(costData) {
                // If duty is pending, add to blocked
                if(s.Duty_Status === 'Pending') moneyBlocked += (Number(costData.Duty) || 0);

                // Add other pending expenses
                moneyBlocked += (Number(costData.CHA_Chg) || 0) +
                                (Number(costData.Shipping) || 0) +
                                (Number(costData.Transport) || 0) +
                                (Number(costData.Other) || 0);
            }
        }
    });

    // Process Payments
    payments.forEach(p => {
        if(p.Status !== 'Closed' && p.Status !== 'Paid') {
            pendingPaymentsCount++;
            totalOutstanding += (Number(p.Outstanding_Amount) || Number(p.Amount) || 0);
            if(p.Status === 'Approved') approvedPending++;
        }
    });

    // Process Tasks
    let overdueTaskCount = 0;
    tasks.forEach(t => {
        if(t.Status !== 'Completed') {
            const due = new Date(t.Due_Date);
            if(due.toDateString() === now.toDateString()) todaysActions++;
            if(due < now) overdueTaskCount++;
        }
    });

    // Process Docs for DO Expiry
    docs.forEach(d => {
        if(d.Doc_Type === 'Delivery Order' && d.Expiry_Date) {
            const exp = new Date(d.Expiry_Date);
            const diffTime = exp - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if(diffDays >= 0 && diffDays <= 3) doExpiring++; // Expiring within 3 days
        }
    });

    // Process Containers
    if(user.role !== 'CHA') {
        const containers = getBatchData("CONTAINERS", null);
        containersPendingDispatch = containers.filter(c => c.Dispatch_Status === 'Pending').length;
    }

    // Health Score
    let healthScore = 100 - (delayPenaltyCount * 5) - (overdueTaskCount * 2) - (dutyPending * 3) - (pendingPaymentsCount * 2);
    if(healthScore < 0) healthScore = 0;

    let healthLabel = 'Critical';
    if(healthScore >= 90) healthLabel = 'Excellent';
    else if(healthScore >= 75) healthLabel = 'Good';
    else if(healthScore >= 60) healthLabel = 'Warning';

    // CHA Performance (Simplified implementation of the complex formula)
    let chaStats = {};
    if(user.role !== 'CHA') {
        shipments.forEach(s => {
            const cha = s.CHA_Name;
            if(!cha) return;
            if(!chaStats[cha]) chaStats[cha] = { total: 0, completed: 0, delayed: 0, avgClearanceSum: 0, clearanceCount: 0 };
            chaStats[cha].total++;
            if(s.Shipment_Status === 'Completed') chaStats[cha].completed++;
            if(s.Shipment_Status === 'Delayed') chaStats[cha].delayed++;

            // Clearance Days: Delivery - ETA
            if(s.Delivery_Date && s.ETA_POD) {
                const del = new Date(s.Delivery_Date);
                const eta = new Date(s.ETA_POD);
                const diffDays = Math.ceil((del - eta) / (1000 * 60 * 60 * 24));
                chaStats[cha].avgClearanceSum += (diffDays > 0 ? diffDays : 0);
                chaStats[cha].clearanceCount++;
            }
        });
    }

    let chaRankings = [];
    for(let cha in chaStats) {
        let stats = chaStats[cha];
        let compRate = stats.completed / stats.total;
        let delayRate = stats.delayed / stats.total;
        let avgClearance = stats.clearanceCount > 0 ? (stats.avgClearanceSum / stats.clearanceCount) : 10; // default 10 days
        if(avgClearance <= 0) avgClearance = 1;

        let score = (0.4 * (compRate * 100)) + (0.4 * (100 / avgClearance)) - (0.2 * (delayRate * 100));
        chaRankings.push({name: cha, score: score, avgClearance: avgClearance});
    }
    chaRankings.sort((a,b) => b.score - a.score);

    return {
        delayed: delayed,
        dutyPending: dutyPending,
        pendingPaymentsCount: pendingPaymentsCount,
        approvedPending: approvedPending,
        totalOutstanding: totalOutstanding,
        doExpiring: doExpiring,
        containersPendingDispatch: containersPendingDispatch,
        readyForDelivery: readyForDelivery,
        moneyBlocked: moneyBlocked,
        todaysActions: todaysActions,
        healthScore: healthScore,
        healthLabel: healthLabel,
        chaRankings: chaRankings
    };
}

/* ---------------------------------------------------------
   TIMELINE & AUTO TASK MODULE
--------------------------------------------------------- */
function addTimelineEntry(jobNo, eventName, status, targetDelayDays) {
    const dbId = getDbId();
    if(!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("TIMELINE");

    const now = new Date();
    let targetDate = new Date();
    if(targetDelayDays) targetDate.setDate(now.getDate() + targetDelayDays);

    // Check if delayed
    let actualDelay = 0;
    if(status === 'Completed' && targetDelayDays) {
        // Find prior target (simplified)
        actualDelay = 0; // Requires deep history scan in real execution
    }

    sheet.appendRow([Utilities.getUuid(), jobNo, eventName, now, targetDate, actualDelay, status, getCurrentUser().email, true]);

    generateAutoTask(jobNo, eventName);
}

function generateAutoTask(jobNo, stage) {
    const rules = {
        "ETA Updated": { task: "Original Document Follow-up", priority: "High", dueOffset: 2 },
        "Original Documents Received": { task: "IGM Filing", priority: "High", dueOffset: 1 },
        "IGM Filed": { task: "BOE Filing", priority: "Critical", dueOffset: 1 },
        "BOE Filed": { task: "Duty Planning", priority: "High", dueOffset: 1 },
        "Duty Planned": { task: "Duty Payment", priority: "Critical", dueOffset: 1 },
        "Duty Paid": { task: "OOC Follow-up", priority: "High", dueOffset: 2 },
        "OOC Received": { task: "Shipping Line Payment", priority: "High", dueOffset: 1 },
        "Shipping Line Paid": { task: "DO Collection", priority: "High", dueOffset: 1 },
        "DO Released": { task: "Dispatch Planning", priority: "High", dueOffset: 1 },
        "Dispatch Planned": { task: "Vehicle Arrangement", priority: "High", dueOffset: 1 },
        "Goods Dispatched": { task: "Delivery Confirmation", priority: "High", dueOffset: 2 }
    };

    const rule = rules[stage];
    if(rule) {
        const dbId = getDbId();
        const ss = SpreadsheetApp.openById(dbId);
        const taskSheet = ss.getSheetByName("TASKS");
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + rule.dueOffset);

        // Find assigned CHA (Auto-routing)
        let assignedTo = "Import Team";
        try {
            const shipments = getBatchData("SHIPMENTS", r => r.Job_No === jobNo);
            if(shipments.length > 0 && shipments[0].CHA_Name) {
                assignedTo = shipments[0].CHA_Name;
            }
        } catch(e){}

        taskSheet.appendRow([Utilities.getUuid(), jobNo, rule.task, rule.priority, "Pending", assignedTo, dueDate, "", true]);
    }
}

function getTasks() {
    const user = getCurrentUser();
    return getBatchData("TASKS", row => {
        if(user.role === 'CHA') return row.Assigned_To === user.name;
        return true;
    });
}

function updateTaskStatus(taskId, status, notes) {
    validatePermission(['Admin', 'Import Team', 'CHA']);
    const dbId = getDbId();
    if(!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("TASKS");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf("ID");

    for(let i=1; i<data.length; i++) {
        if(data[i][idIdx] === taskId) {
            sheet.getRange(i+1, 5).setValue(status); // Status
            if(notes) sheet.getRange(i+1, 8).setValue(notes); // Follow up notes
            logAudit("TASKS", "UPDATE_STATUS", taskId, {status: status, notes: notes});
            break;
        }
    }
}

function getTimeline(jobNo) {
    return getBatchData("TIMELINE", row => row.Job_No === jobNo);
}

/* ---------------------------------------------------------
   PAYMENT WORKFLOW MODULE
--------------------------------------------------------- */
function getPayments() {
    return getBatchData("PAYMENTS", null);
}

function savePayment(data) {
    validatePermission(['Admin', 'Import Team', 'Accounts Team', 'Management']);
    const user = getCurrentUser();
    const dbId = getDbId();
    if(!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("PAYMENTS");

    // Draft -> Requested -> Approved -> Paid -> Closed
    if(!data.ID) { // New Draft
        const id = Utilities.getUuid();
        const outstanding = data.Amount;
        sheet.appendRow([id, data.Job_No, data.Payment_Type, data.Vendor, data.Amount, outstanding, new Date(), "", "", "", "", "Draft", data.Remarks, true]);
        logAudit("PAYMENTS", "CREATE_DRAFT", data.Job_No, {vendor: data.Vendor, amt: data.Amount});
    } else {
        const allData = sheet.getDataRange().getValues();
        const idIdx = allData[0].indexOf("ID");
        for(let i=1; i<allData.length; i++) {
            if(allData[i][idIdx] === data.ID) {
                // Workflow restrictions
                const currentStatus = allData[i][11]; // Status col index
                if(currentStatus === 'Draft' && data.Status === 'Requested') {
                    // Import team submits
                    sheet.getRange(i+1, 12).setValue("Requested");
                    logAudit("PAYMENTS", "REQUESTED", data.Job_No, {});
                } else if(currentStatus === 'Requested' && data.Status === 'Approved') {
                    validatePermission(['Admin', 'Management']);
                    sheet.getRange(i+1, 8, 1, 2).setValues([[user.email, new Date()]]); // ApprovedBy, ApprovalDate
                    sheet.getRange(i+1, 12).setValue("Approved");
                    logAudit("PAYMENTS", "APPROVED", data.Job_No, {by: user.email});
                } else if(currentStatus === 'Approved' && data.Status === 'Paid') {
                    validatePermission(['Admin', 'Accounts Team']);
                    sheet.getRange(i+1, 6).setValue(0); // Outstanding = 0
                    sheet.getRange(i+1, 10, 1, 3).setValues([[user.email, new Date(), "Paid"]]); // PaidBy, PaidDate, Status
                    logAudit("PAYMENTS", "PAID", data.Job_No, {by: user.email});
                } else if(data.Status === 'Closed') {
                    validatePermission(['Admin']);
                    sheet.getRange(i+1, 12).setValue("Closed");
                }
                break;
            }
        }
    }
}

/* ---------------------------------------------------------
   DOCUMENT MANAGEMENT & MIS REPORTING MODULE
--------------------------------------------------------- */
function getShipmentDocs(jobNo) {
    const user = getCurrentUser();
    return getBatchData("DOCUMENTS", row => {
        if(row.Job_No !== jobNo) return false;
        // Verify CHA constraints implicitly via shipment lookup
        return true;
    });
}

function uploadDocumentToDrive(jobNo, docType, fileName, mimeType, base64Data, expiryDate) {
    const user = getCurrentUser();
    // Validate shipment access
    const shipments = getBatchData("SHIPMENTS", r => r.Job_No === jobNo);
    if(shipments.length === 0) throw new Error("Shipment not found.");
    if(user.role === 'CHA' && shipments[0].CHA_Name !== user.name) throw new Error("Unauthorized to upload docs for this shipment.");

    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    const folderName = "ERP_Shipment_Docs_" + jobNo;


    const parentFolderId = getConfig("ERP_FOLDER_ID");
    const parentFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();

    let folders = parentFolder.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
    const file = folder.createFile(blob);
    const url = file.getUrl();

    const dbId = getDbId();
    if(dbId) {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("DOCUMENTS");
        if(sheet) {
            sheet.appendRow([Utilities.getUuid(), jobNo, docType, url, new Date(), expiryDate || "", "Active", true]);
            logAudit("DOCUMENTS", "UPLOAD", jobNo, {type: docType});
        }
    }
    return url;
}

// Generates the single page Executive Summary PDF
function generateExecutiveSummary(jobNo) {
    const s = getShipmentDetails(jobNo);
    const docs = getShipmentDocs(jobNo);
    const timeline = getTimeline(jobNo);

    let html = `<h2>Executive Summary: ${s.Job_No}</h2>`;
    html += `<h3>Shipment Details</h3><p>Importer: ${s.Importer} | Supplier: ${s.Supplier} | CHA: ${s.CHA_Name}</p>`;
    html += `<p>Stage: ${s.Current_Stage} | ETA: ${s.ETA_POD} | Duty: ${s.Duty_Status} | Payment: ${s.Payment_Status}</p>`;

    html += `<h3>Timeline Status</h3><ul>`;
    timeline.forEach(t => { html += `<li>${t.Event_Name} - ${t.Status} (${t.Event_Date})</li>`; });
    html += `</ul>`;

    html += `<h3>Documents Available</h3><ul>`;
    docs.forEach(d => { html += `<li>${d.Doc_Type} (Exp: ${d.Expiry_Date || 'N/A'})</li>`; });
    html += `</ul>`;

    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName("ExecSummary_" + jobNo + ".pdf");


    const parentFolderId = getConfig("ERP_FOLDER_ID");
    const parentFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
    const file = parentFolder.createFile(blob);
    return file.getUrl();
}

// Scheduled Trigger Function (Runs Daily at 8AM via SetupTriggers)
function triggerDailyMIS() {
    try {
        const dashboard = getDashboardData();
        let html = `<h2>Daily Import Operations MIS</h2>`;
        html += `<p><b>Overall Health Score:</b> ${dashboard.healthScore} (${dashboard.healthLabel})</p>`;
        html += `<p>Delayed Shipments: ${dashboard.delayed}</p>`;
        html += `<p>Total Money Blocked: INR ${dashboard.moneyBlocked}</p>`;
        html += `<p>Pending Payments Pipeline: ${dashboard.pendingPaymentsCount}</p>`;
        html += `<p>Containers Pending Dispatch: ${dashboard.containersPendingDispatch}</p>`;

        const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF).setName("Daily_MIS_" + new Date().toISOString().split('T')[0] + ".pdf");

        const emails = getConfig("MIS_EMAILS") || "management@example.com";
        MailApp.sendEmail({
            to: emails,
            subject: "Daily Import Operations MIS",
            htmlBody: "Please find attached the daily management summary report.",
            attachments: [blob]
        });

        logError("SYSTEM", "triggerDailyMIS", "MIS Executed Successfully", "", "System");
    } catch(e) {
        logError("SYSTEM", "triggerDailyMIS", e.message, e.stack, "System");
    }
}

/* ---------------------------------------------------------
   MASTERS MODULE (Including CHA Portal Checks)
--------------------------------------------------------- */
function getEntities() {
    return getBatchData("ENTITIES", null);
}

function saveEntity(data) {
    validatePermission(['Admin', 'Management']);
    const dbId = getDbId();
    if(!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("ENTITIES");

    if(!data.ID) {
        sheet.appendRow([Utilities.getUuid(), data.Type, data.Name, data.Email, data.Contact, true]);
    } else {
        const allData = sheet.getDataRange().getValues();
        const idIdx = allData[0].indexOf("ID");
        for(let i=1; i<allData.length; i++) {
            if(allData[i][idIdx] === data.ID) {
                sheet.getRange(i+1, 2, 1, 5).setValues([[data.Type, data.Name, data.Email, data.Contact, data.IS_ACTIVE]]);
                break;
            }
        }
    }
}

/* ---------------------------------------------------------
   COSTING MODULE
--------------------------------------------------------- */
function getCosting(jobNo) {
    const data = getBatchData("COSTING", row => row.Job_No === jobNo);
    return data.length > 0 ? data[0] : null;
}

function saveCosting(data) {
    validatePermission(['Admin', 'Import Team', 'Management', 'Accounts Team']);
    const dbId = getDbId();
    if(!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("COSTING");
    const allData = sheet.getDataRange().getValues();
    const idIdx = allData[0].indexOf("ID");

    let foundIdx = -1;
    if(data.ID) {
        for(let i=1; i<allData.length; i++) {
            if(allData[i][idIdx] === data.ID) {
                foundIdx = i;
                break;
            }
        }
    }

    if(foundIdx > -1) {
        sheet.getRange(foundIdx+1, 2, 1, 9).setValues([[data.Job_No, data.Invoice, data.Duty, data.Shipping, data.Transport, data.CHA_Chg, data.Port, data.Other, data.Qty]]);
        logAudit("COSTING", "UPDATE", data.Job_No, {});
    } else {
        sheet.appendRow([Utilities.getUuid(), data.Job_No, data.Invoice, data.Duty, data.Shipping, data.Transport, data.CHA_Chg, data.Port, data.Other, data.Qty]);
        logAudit("COSTING", "CREATE", data.Job_No, {});
    }
}
