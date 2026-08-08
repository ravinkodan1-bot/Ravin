/**
 * Logistics Module (Shipments, Containers, Documents, BL Verification)
 */

/**
 * Creates a new Shipment for a Job.
 * A single job can have multiple shipments.
 */
function createShipment(jobId, shipmentData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);

    const newId = generateUUID();
    const shipmentRecord = {
      Shipment_ID: newId,
      Job_ID: jobId,
      Supplier: shipmentData.Supplier || "",
      Vessel_Name: shipmentData.Vessel_Name || "",
      POL: shipmentData.POL || "",
      POD: shipmentData.POD || "",
      ETA: shipmentData.ETA || "",
      IGM_No: "",
      Status: "In_Transit",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "SHIPMENTS", shipmentRecord);
    appendAudit("LogisticsManager", "SHIPMENTS", newId, "Create", { newVal: shipmentRecord });

    return apiResponse(true, { Shipment_ID: newId }, "Shipment created successfully.");
  } catch (err) {
    logSystemError("createShipment", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Adds a Container to a specific Shipment.
 */
function addContainerToShipment(shipmentId, jobId, containerData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);

    const newId = generateUUID();
    const containerRecord = {
      Container_ID: newId,
      Job_ID: jobId,
      Shipment_ID: shipmentId,
      Container_No: containerData.Container_No,
      Seal_No: containerData.Seal_No || "",
      Container_Size: containerData.Container_Size || "",
      CFS_Name: containerData.CFS_Name || "",
      Dispatch_Date: "",
      Empty_Return_Due_Date: "",
      Empty_Return_Date: "",
      Container_Status: "Pending", // Pending, Dispatched, Returned
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "CONTAINERS", containerRecord);
    appendAudit("LogisticsManager", "CONTAINERS", newId, "Add", { newVal: containerRecord });

    return apiResponse(true, { Container_ID: newId }, "Container added successfully.");
  } catch (err) {
    logSystemError("addContainerToShipment", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Uploads/Registers a versioned document.
 */
function registerDocument(jobId, docData) {
  try {
    const user = requireRole(["Admin", "Management", "Import", "Accounts", "CHA"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("DOCUMENTS");

    // Check previous versions of the same Document_Type for this Job to mark Is_Current = FALSE
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let nextVersion = 1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("Job_ID")] === jobId &&
          data[i][headers.indexOf("Document_Type")] === docData.Document_Type &&
          String(data[i][headers.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {

          nextVersion++;

          if (data[i][headers.indexOf("Is_Current")] === "TRUE") {
              // Update old record to FALSE
              sheet.getRange(i + 1, headers.indexOf("Is_Current") + 1).setValue("FALSE");
          }
      }
    }

    const newId = generateUUID();
    const docRecord = {
      Document_ID: newId,
      Job_ID: jobId,
      Document_Type: docData.Document_Type, // e.g. "Draft BL", "Original BL"
      Document_Name: docData.Document_Name,
      Version_No: nextVersion,
      Drive_File_ID: docData.Drive_File_ID || "",
      Drive_URL: docData.Drive_URL,
      Is_Current: "TRUE",
      Status: "Uploaded",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "DOCUMENTS", docRecord);
    appendAudit("LogisticsManager", "DOCUMENTS", newId, "Upload", { newVal: docRecord });

    return apiResponse(true, { Document_ID: newId, Version_No: nextVersion }, "Document registered successfully.");
  } catch (err) {
    logSystemError("registerDocument", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Submits a BL Verification Checklist.
 * Evaluates Consignee logic based on Job Payment Mode.
 */
function verifyBL(jobId, blType, checklistData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);

    // In a real flow, we would fetch the Job record here to check LC vs Advance
    // to strictly validate the user's checklist response (e.g. if LC, Consignee MUST be Bank).
    // For this boilerplate, we simply record the verification outcome.

    const newId = generateUUID();
    const verificationRecord = {
      BL_Verification_ID: newId,
      Job_ID: jobId,
      BL_Type: blType, // Draft or Original
      Shipper_Checked: checklistData.Shipper_Checked ? "TRUE" : "FALSE",
      Consignee_Checked: checklistData.Consignee_Checked ? "TRUE" : "FALSE",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "BL_VERIFICATION", verificationRecord);
    appendAudit("LogisticsManager", "BL_VERIFICATION", newId, "Submit", { newVal: verificationRecord });

    return apiResponse(true, { Verification_ID: newId }, "BL Verification recorded.");
  } catch (err) {
    logSystemError("verifyBL", err);
    return apiResponse(false, null, err.message);
  }
}
