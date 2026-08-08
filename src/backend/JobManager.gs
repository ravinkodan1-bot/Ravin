/**
 * Job Management Backend Core
 */

/**
 * Creates a new Job from the frontend UI.
 * Must be executed by Admin, Management, or Import roles.
 */
function createJob(jobData) {
  try {
    const user = requireRole(["Admin", "Management", "Import"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);

    // Validate required fields
    if (!jobData.PI_No || !jobData.Supplier || !jobData.Item) {
       return apiResponse(false, null, "PI No, Supplier, and Item are required.");
    }

    // Generate IDs safely
    const jobId = generateUUID();
    const jobNo = getNextSequence("JOB_NO");
    const timestamp = new Date();

    // Ensure payment terms default safely if missing
    let terms = jobData.Terms || "";
    if (typeof terms === 'object') {
       terms = JSON.stringify(terms);
    }

    const newJob = {
      Job_ID: jobId,
      Job_No: jobNo,
      PI_No: jobData.PI_No,
      Supplier: jobData.Supplier,
      Item: jobData.Item,
      Value: jobData.Value || 0,
      Terms: terms,
      Overall_Status: "PI_RECEIVED", // Initial state
      CreatedBy: user.Email,
      CreatedDateTime: timestamp,
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "JOBS", newJob);

    appendAudit("JobManager", "JOBS", jobId, "Create", { newVal: newJob });

    // Trigger drive folder creation asynchronously (to avoid UI locking)
    // In GAS, we can't truly run async without a trigger or side-effect,
    // so we do it synchronously but quickly.
    const folderUrl = initializeJobFolder(jobNo);

    // Once Job is created, we need to generate workflow tasks.
    // (This calls the TaskManager engine, to be implemented in Phase 5)
    if (typeof generateWorkflowTasks === "function") {
      generateWorkflowTasks(newJob);
    }

    return apiResponse(true, { Job_No: jobNo, Job_ID: jobId, Folder_URL: folderUrl }, "Job Created Successfully");

  } catch (err) {
    logSystemError("createJob", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Creates Google Drive folder structure for the new job
 */
function initializeJobFolder(jobNo) {
  try {
    const config = getConfig();
    const rootFolderId = config['IMPORTOPS_ROOT_FOLDER_ID'];

    // If not configured, just return dummy URL (e.g., during setup/testing)
    if (!rootFolderId || rootFolderId === "INSERT_DRIVE_FOLDER_ID_HERE") {
       return "https://drive.google.com/drive/my-drive";
    }

    const rootFolder = DriveApp.getFolderById(rootFolderId);

    // Ensure FY folder exists
    const fy = getCurrentFY().replace("_", "-").replace("FY-", "FY "); // e.g. "FY 26-27"
    let fyFolder;
    const fyIter = rootFolder.getFoldersByName(fy);
    if (fyIter.hasNext()) {
      fyFolder = fyIter.next();
    } else {
      fyFolder = rootFolder.createFolder(fy);
    }

    // Create Job Folder
    const jobFolder = fyFolder.createFolder(jobNo);

    // Create standard subfolders
    const subfolders = ["PI", "Contract", "Payment", "Shipment", "BL", "NN Documents", "CHA", "Customs", "Dispatch"];
    subfolders.forEach(sub => jobFolder.createFolder(sub));

    return jobFolder.getUrl();

  } catch (err) {
    logSystemError("initializeJobFolder", err);
    return ""; // Soft fail if Drive permission issue
  }
}
