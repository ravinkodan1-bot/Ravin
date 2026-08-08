/**
 * Clearance & Dispatch Module (CHA, Customs, Dispatch)
 */

/**
 * Updates the CHA Process tracking for a Job (e.g. BOE filing).
 */
function updateCHAProcess(jobId, chaData) {
  try {
    const user = requireRole(["Admin", "Management", "Import", "CHA"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("CHA_PROCESS");

    // Find existing CHA record for job or create a new one
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("Job_ID")] === jobId && String(data[i][headers.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex > -1) {
      // Update existing record
      const oldDutyStatus = sheet.getRange(rowIndex, headers.indexOf("Duty_Status") + 1).getValue();

      if (chaData.BOE_No) sheet.getRange(rowIndex, headers.indexOf("BOE_No") + 1).setValue(chaData.BOE_No);
      if (chaData.Checklist_Status) sheet.getRange(rowIndex, headers.indexOf("Checklist_Status") + 1).setValue(chaData.Checklist_Status);
      if (chaData.Duty_Status) sheet.getRange(rowIndex, headers.indexOf("Duty_Status") + 1).setValue(chaData.Duty_Status);

      sheet.getRange(rowIndex, headers.indexOf("UpdatedBy") + 1).setValue(user.Email);
      sheet.getRange(rowIndex, headers.indexOf("UpdatedDateTime") + 1).setValue(new Date());

      appendAudit("ClearanceManager", "CHA_PROCESS", jobId, "Update", { oldVal: oldDutyStatus, newVal: chaData.Duty_Status });

      return apiResponse(true, { CHA_ID: data[rowIndex-1][0] }, "CHA process updated.");
    } else {
      // Create new record
      const newId = generateUUID();
      const chaRecord = {
        CHA_ID: newId,
        Job_ID: jobId,
        CHA_Name: chaData.CHA_Name || "",
        BOE_No: chaData.BOE_No || "",
        Checklist_Status: chaData.Checklist_Status || "Pending",
        Duty_Status: chaData.Duty_Status || "Pending",
        CreatedBy: user.Email,
        CreatedDateTime: new Date(),
        IsDeleted: "FALSE"
      };

      appendRecord(dbId, "CHA_PROCESS", chaRecord);
      appendAudit("ClearanceManager", "CHA_PROCESS", newId, "Create", { newVal: chaRecord });

      return apiResponse(true, { CHA_ID: newId }, "CHA process initiated.");
    }
  } catch (err) {
    logSystemError("updateCHAProcess", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Dispatches a Container to a Transporter.
 */
function dispatchContainer(containerId, dispatchData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]); // Logistics can be added
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);

    // 1. Create Dispatch Record
    const newId = generateUUID();
    const dispatchRecord = {
      Dispatch_ID: newId,
      Container_ID: containerId,
      Transporter: dispatchData.Transporter,
      Vehicle_No: dispatchData.Vehicle_No,
      Status: "Dispatched",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "DISPATCH", dispatchRecord);
    appendAudit("ClearanceManager", "DISPATCH", newId, "Create", { newVal: dispatchRecord });

    // 2. Update Container Status & Empty Return Due Date in CONTAINERS sheet
    const containerSheet = ss.getSheetByName("CONTAINERS");
    const cData = containerSheet.getDataRange().getValues();
    const cHeaders = cData[0];
    let cRow = -1;

    for (let i = 1; i < cData.length; i++) {
      if (cData[i][0] === containerId && String(cData[i][cHeaders.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
        cRow = i + 1;
        break;
      }
    }

    if (cRow > -1) {
      containerSheet.getRange(cRow, cHeaders.indexOf("Container_Status") + 1).setValue("Dispatched");
      containerSheet.getRange(cRow, cHeaders.indexOf("Dispatch_Date") + 1).setValue(new Date());
      if (dispatchData.Empty_Return_Due_Date) {
        containerSheet.getRange(cRow, cHeaders.indexOf("Empty_Return_Due_Date") + 1).setValue(dispatchData.Empty_Return_Due_Date);
      }
    }

    return apiResponse(true, { Dispatch_ID: newId }, "Container dispatched successfully.");
  } catch (err) {
    logSystemError("dispatchContainer", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Marks a container as returned empty.
 */
function markEmptyContainerReturned(containerId, returnDate) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    const containerSheet = ss.getSheetByName("CONTAINERS");

    const cData = containerSheet.getDataRange().getValues();
    const cHeaders = cData[0];
    let cRow = -1;

    for (let i = 1; i < cData.length; i++) {
      if (cData[i][0] === containerId && String(cData[i][cHeaders.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
        cRow = i + 1;
        break;
      }
    }

    if (cRow === -1) return apiResponse(false, null, "Container not found.");

    const oldStatus = containerSheet.getRange(cRow, cHeaders.indexOf("Container_Status") + 1).getValue();

    containerSheet.getRange(cRow, cHeaders.indexOf("Container_Status") + 1).setValue("Returned_Empty");
    containerSheet.getRange(cRow, cHeaders.indexOf("Empty_Return_Date") + 1).setValue(returnDate || new Date());

    containerSheet.getRange(cRow, cHeaders.indexOf("UpdatedBy") + 1).setValue(user.Email);
    containerSheet.getRange(cRow, cHeaders.indexOf("UpdatedDateTime") + 1).setValue(new Date());

    appendAudit("ClearanceManager", "CONTAINERS", containerId, "ReturnEmpty", { oldVal: oldStatus, newVal: "Returned_Empty" });

    return apiResponse(true, { Container_ID: containerId }, "Container marked as returned empty.");
  } catch (err) {
    logSystemError("markEmptyContainerReturned", err);
    return apiResponse(false, null, err.message);
  }
}
