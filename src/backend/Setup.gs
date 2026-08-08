/**
 * Phase 1 Setup Script
 * Sets up spreadsheets, sheets, and headers programmatically.
 */

const STANDARD_COLS = ["RecordID", "CreatedBy", "CreatedDateTime", "UpdatedBy", "UpdatedDateTime", "IsDeleted", "DeletedBy", "DeletedDateTime"];

const SCHEMAS = {
  "MASTER": {
    "CONFIG": ["Key", "Value", "Description"],
    "SEQUENCES": ["Sequence_Name", "Prefix", "Current_Value"],
    "USERS": ["User_ID", "Email", "Role", "Department", "Status"].concat(STANDARD_COLS),
    "SUPPLIERS": ["Supplier_ID", "Name", "Country", "Default_Incoterm", "Status"].concat(STANDARD_COLS),
    "IMPORTERS": ["Importer_ID", "Company_Name", "GST", "Status"].concat(STANDARD_COLS),
    "WORKFLOW_TEMPLATES": ["Template_ID", "Task_Code", "Task_Name", "Sequence", "Department", "Default_Role", "Condition_JSON", "Dependency_Code", "Is_Active"].concat(STANDARD_COLS)
  },
  "DATA": {
    "JOBS": ["Job_ID", "Job_No", "PI_Date", "PI_No", "Owner", "Importer", "Supplier", "Item", "Origin", "Invoice_No", "Value", "Quantity", "Rate", "Remarks", "Terms", "Overall_Status"].concat(STANDARD_COLS),
    "PI_VERIFICATION": ["PI_Verification_ID", "Job_ID", "Verified_Date", "Company_Details_Checked", "Quantity_Checked", "Rate_Checked"].concat(STANDARD_COLS),
    "SALE_CONTRACTS": ["Contract_ID", "Job_ID", "Contract_No", "Signed_Date", "Document_Link"].concat(STANDARD_COLS),
    "PAYMENTS": ["Payment_ID", "Job_ID", "Payment_Type", "Requested_Amount", "Status", "Paid_Date", "SWIFT_Link"].concat(STANDARD_COLS),
    "SHIPMENTS": ["Shipment_ID", "Job_ID", "Supplier", "Vessel_Name", "POL", "POD", "ETA", "IGM_No", "Status"].concat(STANDARD_COLS),
    "CONTAINERS": ["Container_ID", "Job_ID", "Shipment_ID", "Container_No", "Seal_No", "Container_Size", "CFS_Name", "Dispatch_Date", "Empty_Return_Due_Date", "Empty_Return_Date", "Container_Status"].concat(STANDARD_COLS),
    "DOCUMENTS": ["Document_ID", "Job_ID", "Document_Type", "Document_Name", "Version_No", "Drive_File_ID", "Drive_URL", "Is_Current", "Status"].concat(STANDARD_COLS),
    "BL_VERIFICATION": ["BL_Verification_ID", "Job_ID", "BL_Type", "Shipper_Checked", "Consignee_Checked"].concat(STANDARD_COLS),
    "CHA_PROCESS": ["CHA_ID", "Job_ID", "CHA_Name", "BOE_No", "Checklist_Status", "Duty_Status"].concat(STANDARD_COLS),
    "DISPATCH": ["Dispatch_ID", "Container_ID", "Transporter", "Vehicle_No", "Status"].concat(STANDARD_COLS),
    "SYSTEM_ERRORS": ["Error_ID", "Timestamp", "User_Email", "Module", "Error_Type", "Error_Message", "Stack_Trace", "Severity", "Resolved", "Resolved_By", "Resolved_Date"],
    "AUDIT_LOG": ["Log_ID", "Timestamp", "User_Email", "Module", "Record_Type", "Record_ID", "Action", "Field_Name", "Old_Value", "New_Value", "Reason", "IP_Session"]
  },
  "TASKS": {
    "WORKFLOW_TASKS": ["Task_ID", "Job_ID", "Task_Code", "Task_Name", "Assigned_To", "Planned_Date", "Actual_Date", "Status", "Priority", "Delay", "Depends_On_Task_ID"].concat(STANDARD_COLS),
    "NOTIFICATIONS_QUEUE": ["Notification_ID", "Target_Email", "Target_Role", "Subject", "Message_HTML", "Is_Sent", "CreatedDateTime"]
  }
};

/**
 * Main Setup Execution Function.
 * Note: Must be run manually from the editor ONCE by the Admin.
 */
function setupImportOps() {
  const fy = "FY_26_27";
  const parentFolderId = PropertiesService.getScriptProperties().getProperty("DRIVE_ROOT_FOLDER_ID"); // Optional if running locally to nest the SS

  // 1. Create Spreadsheets
  const masterSS = SpreadsheetApp.create("IMPORTOPS_MASTER");
  const dataSS = SpreadsheetApp.create(`IMPORTOPS_DATA_${fy}`);
  const tasksSS = SpreadsheetApp.create(`IMPORTOPS_TASKS_${fy}`);

  // 2. Initialize schemas
  initSpreadsheetSchema(masterSS, SCHEMAS["MASTER"]);
  initSpreadsheetSchema(dataSS, SCHEMAS["DATA"]);
  initSpreadsheetSchema(tasksSS, SCHEMAS["TASKS"]);

  // 3. Setup CONFIG in Master
  const configSheet = masterSS.getSheetByName("CONFIG");
  configSheet.appendRow(["MASTER_SPREADSHEET_ID", masterSS.getId(), "ID of this master spreadsheet"]);
  configSheet.appendRow(["CURRENT_FY", fy, "Current active financial year"]);
  configSheet.appendRow([`DATA_SPREADSHEET_ID_${fy}`, dataSS.getId(), "Data SS for current FY"]);
  configSheet.appendRow([`TASKS_SPREADSHEET_ID_${fy}`, tasksSS.getId(), "Tasks SS for current FY"]);
  configSheet.appendRow(["IMPORTOPS_ROOT_FOLDER_ID", "INSERT_DRIVE_FOLDER_ID_HERE", "Root drive folder for documents"]);

  // 4. Setup Default Sequences
  const seqSheet = masterSS.getSheetByName("SEQUENCES");
  seqSheet.appendRow(["JOB_NO", "IMP-{FY}-", 0]);

  // 5. Setup Master Admin User
  const userSheet = masterSS.getSheetByName("USERS");
  const adminEmail = Session.getActiveUser().getEmail();
  userSheet.appendRow([generateUUID(), adminEmail, "Admin", "IT", "Active", "SYS", new Date(), "", "", "", "", "", ""]);

  // Store Master SS ID in Script Properties for subsequent runs
  PropertiesService.getScriptProperties().setProperty("MASTER_SPREADSHEET_ID", masterSS.getId());

  Logger.log("Setup completed successfully.");
  Logger.log("MASTER ID: " + masterSS.getId());
  Logger.log("DATA ID: " + dataSS.getId());
  Logger.log("TASKS ID: " + tasksSS.getId());
  return true;
}

function initSpreadsheetSchema(ss, schemaObj) {
  const sheetNames = Object.keys(schemaObj);

  // Create requested sheets
  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Set headers
    const headers = schemaObj[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  });

  // Delete "Sheet1" if it exists and isn't part of the schema
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && !schemaObj["Sheet1"]) {
    ss.deleteSheet(defaultSheet);
  }
}
