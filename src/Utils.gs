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
