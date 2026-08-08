/**
 * Logging System
 */

/**
 * Appends a system error to the SYSTEM_ERRORS sheet in the Data Spreadsheet
 */
function logSystemError(moduleName, errorObj) {
  try {
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    let sheet = ss.getSheetByName("SYSTEM_ERRORS");

    // In case setup failed or sheet doesn't exist yet, we fall back to Logger
    if (!sheet) {
      Logger.log("SYSTEM_ERRORS sheet not found. Error: " + errorObj.toString());
      return;
    }

    const email = getCurrentUserEmail();
    const timestamp = new Date();
    const errorId = generateUUID();

    sheet.appendRow([
      errorId,
      timestamp,
      email,
      moduleName,
      errorObj.name || "Error",
      errorObj.message || errorObj.toString(),
      errorObj.stack || "",
      "High",
      "FALSE", // Resolved
      "",
      ""
    ]);
  } catch (fallbackError) {
    // Ultimate fallback if logging itself fails
    Logger.log("Failed to log system error: " + fallbackError.toString());
  }
}

/**
 * Appends an audit entry to the AUDIT_LOG sheet
 */
function appendAudit(moduleName, recordType, recordId, action, changes) {
  try {
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("AUDIT_LOG");
    if (!sheet) return;

    const email = getCurrentUserEmail();
    const timestamp = new Date();
    const logId = generateUUID();

    // Changes can be a string or JSON object
    const oldVal = changes.oldVal ? JSON.stringify(changes.oldVal) : "";
    const newVal = changes.newVal ? JSON.stringify(changes.newVal) : "";
    const fieldName = changes.fieldName || "Multiple";
    const reason = changes.reason || "";

    sheet.appendRow([
      logId,
      timestamp,
      email,
      moduleName,
      recordType,
      recordId,
      action,
      fieldName,
      oldVal,
      newVal,
      reason,
      "" // IP/Session context (not accessible directly in GAS)
    ]);
  } catch (e) {
    logSystemError("appendAudit", e);
  }
}
