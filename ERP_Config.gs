const CONFIG = { APP_NAME: "Import Operations ERP" };
function getDbId() { return PropertiesService.getScriptProperties().getProperty('ERP_DB_ID'); }
function getFolderId() { return PropertiesService.getScriptProperties().getProperty('ERP_FOLDER_ID'); }
function setDbId(id) { PropertiesService.getScriptProperties().setProperty('ERP_DB_ID', id); }
function setFolderId(id) { PropertiesService.getScriptProperties().setProperty('ERP_FOLDER_ID', id); }

function setupDatabase() {
  const ss = SpreadsheetApp.create("ERP_Import_Operations_DB");
  const sheetsInfo = [
    { name: "SHIPMENTS", headers: ["ID", "Job_No", "Date", "Importer", "Supplier", "BL_No", "Container_No", "CHA_Name", "Stage", "ETA", "IS_ACTIVE"] },
    { name: "TASKS", headers: ["Task_ID", "Job_No", "Stage", "Priority", "Status", "Assigned_Role", "Due_Date", "Generated_Auto", "IS_ACTIVE"] },
    { name: "TIMELINE", headers: ["Timeline_ID", "Job_No", "Stage", "Date", "Status", "IS_ACTIVE"] },
    { name: "FOLLOWUPS", headers: ["Followup_ID", "CHA_Name", "Contact_Person", "Whatsapp_Date", "Call_Date", "Notes", "Next_Followup", "IS_ACTIVE"] },
    { name: "COSTING", headers: ["Costing_ID", "Job_No", "Invoice_Value", "Duty", "Shipping", "Transportation", "CHA_Charges", "Port", "Others", "Total_Landed", "Per_Unit", "IS_ACTIVE"] },
    { name: "DOCUMENTS", headers: ["Doc_ID", "Job_No", "Doc_Type", "Drive_Folder_URL", "File_URL", "IS_ACTIVE"] },
    { name: "IMPORTERS", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "SUPPLIERS", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "SHIPPING_LINES", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "PORTS", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "CHA_MASTER", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "GODOWNS", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "BRANDS", headers: ["ID", "Name", "Code", "IS_ACTIVE"] },
    { name: "USERS", headers: ["ID", "Email", "Role", "Name", "IS_ACTIVE"] },
    { name: "USER_ROLES", headers: ["Role_Name", "IS_ACTIVE"] },
    { name: "SHIPMENT_STATUS", headers: ["Status_Name", "IS_ACTIVE"] },
    { name: "TASK_PRIORITY", headers: ["Priority_Name", "IS_ACTIVE"] },
    { name: "TASK_STATUS", headers: ["Status_Name", "IS_ACTIVE"] },
    { name: "EMAIL_LOGS", headers: ["Log_ID", "Timestamp", "Recipient", "Subject", "Body", "Status"] },
    { name: "AUDIT_LOGS", headers: ["Timestamp", "User", "Module", "Record_ID", "Action", "Old_Value", "New_Value"] }
  ];
  sheetsInfo.forEach((info, index) => {
    let sheet;
    if (index === 0) { sheet = ss.getSheets()[0]; sheet.setName(info.name); }
    else { sheet = ss.insertSheet(info.name); }
    sheet.appendRow(info.headers);
    sheet.setFrozenRows(1);
  });
  setDbId(ss.getId());
  return ss.getId();
}

function logAudit(module, recordId, action, oldValue, newValue) {
  const dbId = getDbId();
  if (!dbId) return;
  try {
    const user = Session.getActiveUser().getEmail() || "Unknown";
    const ss = SpreadsheetApp.openById(dbId);
    ss.getSheetByName("AUDIT_LOGS").appendRow([new Date(), user, module, recordId, action, JSON.stringify(oldValue), JSON.stringify(newValue)]);
  } catch(e) {}
}

/**
 * Cache Wrapper for Dashboard queries to improve performance
 */
function getCachedData(key, fetchFunction, cacheMinutes = 15) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const data = fetchFunction();
  cache.put(key, JSON.stringify(data), cacheMinutes * 60);
  return data;
}

function clearCacheKeys() {
  const cache = CacheService.getScriptCache();
  cache.removeAll(['DASHBOARD_ANALYTICS', 'CHA_PERFORMANCE']);
}

/**
 * Setup Triggers for the App
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));

  const times = [9, 14, 18];
  times.forEach(h => {
    ScriptApp.newTrigger('runScheduledEmailAlerts').timeBased().everyDays(1).atHour(h).create();
  });
}
