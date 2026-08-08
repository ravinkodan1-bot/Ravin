/**
 * PI Verification and Sale Contracts Module
 */

/**
 * Saves or updates a PI Verification Checklist.
 */
function savePIVerification(jobId, checklistData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);

    // Check if job exists
    const jobsSheet = ss.getSheetByName("JOBS");
    const jobsData = jobsSheet.getDataRange().getValues();
    let jobRow = -1;
    let jobStatusCol = -1;
    for (let i = 0; i < jobsData.length; i++) {
       if (i === 0) {
           jobStatusCol = jobsData[i].indexOf("Overall_Status") + 1;
       } else if (jobsData[i][0] === jobId && String(jobsData[i][jobsData[i].indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
           jobRow = i + 1;
           break;
       }
    }

    if (jobRow === -1) return apiResponse(false, null, "Job not found.");

    // Write verification data
    const newId = generateUUID();
    const verificationRecord = {
      PI_Verification_ID: newId,
      Job_ID: jobId,
      Verified_Date: new Date(),
      Company_Details_Checked: checklistData.companyDetails ? "TRUE" : "FALSE",
      Quantity_Checked: checklistData.quantity ? "TRUE" : "FALSE",
      Rate_Checked: checklistData.rate ? "TRUE" : "FALSE",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "PI_VERIFICATION", verificationRecord);
    appendAudit("VerificationManager", "PI_VERIFICATION", newId, "Submit", { newVal: verificationRecord });

    // Update Job Status
    jobsSheet.getRange(jobRow, jobStatusCol).setValue("CONTRACT_PENDING");

    return apiResponse(true, { Verification_ID: newId }, "PI Verification saved successfully.");

  } catch (err) {
    logSystemError("savePIVerification", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Saves a Sale Contract entry.
 */
function saveSaleContract(jobId, contractData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);

    const jobsSheet = ss.getSheetByName("JOBS");
    const jobsData = jobsSheet.getDataRange().getValues();
    let jobRow = -1;
    let jobStatusCol = -1;

    for (let i = 0; i < jobsData.length; i++) {
       if (i === 0) {
           jobStatusCol = jobsData[i].indexOf("Overall_Status") + 1;
       } else if (jobsData[i][0] === jobId && String(jobsData[i][jobsData[i].indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
           jobRow = i + 1;
           break;
       }
    }

    if (jobRow === -1) return apiResponse(false, null, "Job not found.");

    const newId = generateUUID();
    const contractRecord = {
      Contract_ID: newId,
      Job_ID: jobId,
      Contract_No: contractData.Contract_No,
      Signed_Date: contractData.Signed_Date || new Date(),
      Document_Link: contractData.Document_Link || "",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "SALE_CONTRACTS", contractRecord);
    appendAudit("VerificationManager", "SALE_CONTRACTS", newId, "Submit", { newVal: contractRecord });

    // Update Job Status
    jobsSheet.getRange(jobRow, jobStatusCol).setValue("ACTIVE");

    return apiResponse(true, { Contract_ID: newId }, "Sale Contract saved successfully.");

  } catch (err) {
    logSystemError("saveSaleContract", err);
    return apiResponse(false, null, err.message);
  }
}
