/**
 * Workflow Task Engine
 */

/**
 * Safely evaluates a structured JSON condition against the Job context.
 * Replaces the banned `eval()` approach.
 *
 * Example Condition JSON:
 * { "field": "Terms.advance", "operator": ">", "value": 0 }
 * { "all": [ { "field": "Terms.mode", "operator": "==", "value": "LC" } ] }
 */
function evaluateCondition(conditionObj, context) {
  if (!conditionObj) return true; // No condition means always run

  // Handle logical AND
  if (conditionObj.all && Array.isArray(conditionObj.all)) {
    return conditionObj.all.every(cond => evaluateCondition(cond, context));
  }

  // Handle logical OR
  if (conditionObj.any && Array.isArray(conditionObj.any)) {
    return conditionObj.any.some(cond => evaluateCondition(cond, context));
  }

  // Handle direct field comparison
  if (conditionObj.field && conditionObj.operator !== undefined) {
    // Resolve nested fields like 'Terms.mode'
    const parts = conditionObj.field.split('.');
    let actualValue = context;
    for (let p of parts) {
      if (actualValue === undefined || actualValue === null) break;
      actualValue = actualValue[p];
    }

    // Parse Terms JSON if it's stored as a string
    if (parts[0] === 'Terms' && typeof context.Terms === 'string') {
        try {
           const parsedTerms = JSON.parse(context.Terms);
           actualValue = parsedTerms;
           for (let i = 1; i < parts.length; i++) {
             actualValue = actualValue[parts[i]];
           }
        } catch(e) {}
    }

    const expectedValue = conditionObj.value;

    switch (conditionObj.operator) {
      case "==": return actualValue == expectedValue;
      case "!=": return actualValue != expectedValue;
      case "===": return actualValue === expectedValue;
      case ">": return actualValue > expectedValue;
      case ">=": return actualValue >= expectedValue;
      case "<": return actualValue < expectedValue;
      case "<=": return actualValue <= expectedValue;
      case "IN": return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case "NOT_IN": return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case "CONTAINS": return String(actualValue).includes(String(expectedValue));
      default: return false;
    }
  }

  return true; // Default safe fallback
}

/**
 * Generates tasks for a newly created Job based on WORKFLOW_TEMPLATES.
 * Called immediately after createJob().
 */
function generateWorkflowTasks(jobRecord) {
  try {
    const masterId = getMasterSpreadsheetId();
    const tasksDbId = getTaskDatabaseByFY(getCurrentFY());

    // 1. Fetch templates
    const templates = getRecords(masterId, "WORKFLOW_TEMPLATES");
    if (!templates || templates.length === 0) {
      Logger.log("No workflow templates found. Skipping task generation.");
      return;
    }

    // 2. Filter applicable templates based on JSON conditions
    const applicableTemplates = templates.filter(template => {
      if (String(template.Is_Active).toUpperCase() !== "TRUE") return false;

      let conditionObj = null;
      if (template.Condition_JSON) {
        try {
          conditionObj = JSON.parse(template.Condition_JSON);
        } catch (e) {
          logSystemError("generateWorkflowTasks", new Error(`Invalid Condition JSON in template ${template.Task_Code}`));
          return false;
        }
      }
      return evaluateCondition(conditionObj, jobRecord);
    });

    // 3. Prepare task records
    const timestamp = new Date();
    const tasksSS = SpreadsheetApp.openById(tasksDbId);
    const taskSheet = tasksSS.getSheetByName("WORKFLOW_TASKS");

    const taskRecordsToInsert = [];

    // Create a mapping of Template Code to Generated Task ID to resolve dependencies
    const codeToIdMap = {};

    applicableTemplates.forEach(t => {
      const taskId = generateUUID();
      codeToIdMap[t.Task_Code] = taskId;

      taskRecordsToInsert.push({
        Task_ID: taskId,
        Job_ID: jobRecord.Job_ID,
        Task_Code: t.Task_Code,
        Task_Name: t.Task_Name,
        Assigned_To: t.Default_Role || t.Department, // Default assignment
        Planned_Date: "", // Date logic to be populated later
        Actual_Date: "",
        Status: "LOCKED", // Default state, unlocked by dependency resolver
        Priority: "Normal",
        Delay: 0,
        Depends_On_Task_ID: t.Dependency_Code || "", // Temporary store code, map to ID below
        CreatedBy: "SYSTEM",
        CreatedDateTime: timestamp,
        IsDeleted: "FALSE"
      });
    });

    // 4. Resolve Dependencies & Initial Status
    taskRecordsToInsert.forEach(t => {
      if (t.Depends_On_Task_ID) {
        // Replace dependency code with the actual Task_ID if it exists in this job
        t.Depends_On_Task_ID = codeToIdMap[t.Depends_On_Task_ID] || "";
      }
      // If a task has no dependencies, it starts as PENDING immediately
      if (!t.Depends_On_Task_ID) {
        t.Status = "PENDING";
      }
    });

    // 5. Batch Insert (Converting Objects to Arrays based on Headers)
    if (taskRecordsToInsert.length > 0) {
      const headers = taskSheet.getRange(1, 1, 1, taskSheet.getLastColumn()).getValues()[0];
      const rowsToAppend = taskRecordsToInsert.map(record => {
        return headers.map(h => record[h] !== undefined ? record[h] : "");
      });

      taskSheet.getRange(taskSheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);

      appendAudit("TaskManager", "WORKFLOW_TASKS", jobRecord.Job_ID, "GenerateTasks", { reason: `Generated ${rowsToAppend.length} tasks for Job ${jobRecord.Job_No}` });
    }

  } catch (err) {
    logSystemError("generateWorkflowTasks", err);
  }
}

/**
 * Updates a Task Status and triggers dependency unlocking.
 */
function updateTaskStatus(taskId, newStatus) {
  try {
    const user = requireRole(["Admin", "Management", "Import", "Accounts", "CHA"]);
    const tasksDbId = getTaskDatabaseByFY(getCurrentFY());
    const tasksSS = SpreadsheetApp.openById(tasksDbId);
    const sheet = tasksSS.getSheetByName("WORKFLOW_TASKS");

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === taskId && String(data[i][headers.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return apiResponse(false, null, "Task not found.");

    const statusCol = headers.indexOf("Status") + 1;
    const actualDateCol = headers.indexOf("Actual_Date") + 1;
    const oldStatus = sheet.getRange(rowIndex, statusCol).getValue();

    // Update status
    sheet.getRange(rowIndex, statusCol).setValue(newStatus);

    if (newStatus === "COMPLETED") {
      sheet.getRange(rowIndex, actualDateCol).setValue(new Date());
    }

    appendAudit("TaskManager", "WORKFLOW_TASKS", taskId, "UpdateStatus", { oldVal: oldStatus, newVal: newStatus });

    // Check if any locked tasks depend on this newly completed task
    if (newStatus === "COMPLETED") {
      unlockDependentTasks(taskId, sheet, data, headers);
    }

    return apiResponse(true, { Task_ID: taskId, Status: newStatus }, "Task updated successfully");

  } catch (err) {
    logSystemError("updateTaskStatus", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Scans for LOCKED tasks that depend on the completedTaskId and unlocks them.
 */
function unlockDependentTasks(completedTaskId, sheet, data, headers) {
  const dependsCol = headers.indexOf("Depends_On_Task_ID");
  const statusCol = headers.indexOf("Status") + 1; // 1-based for sheet.getRange

  for (let i = 1; i < data.length; i++) {
    // If Task is LOCKED and depends on the recently completed task
    if (data[i][headers.indexOf("Status")] === "LOCKED" && data[i][dependsCol] === completedTaskId) {
      const targetRow = i + 1;
      sheet.getRange(targetRow, statusCol).setValue("PENDING");
      appendAudit("TaskManager", "WORKFLOW_TASKS", data[i][0], "UnlockTask", { oldVal: "LOCKED", newVal: "PENDING" });
    }
  }
}
