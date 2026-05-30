function getTasksForDashboard() {
  const allTasks = getMasterDataList("TASKS");
  const user = getCurrentUser();
  const now = new Date();
  let myTasks = []; let overdue = []; let critical = [];
  allTasks.forEach(t => {
    if (t.Status === "Completed") return;
    if (t.Assigned_Role === user.role || user.role === "Admin" || user.role === "Management") myTasks.push(t);
    if (new Date(t.Due_Date) < now) overdue.push(t);
    if (t.Priority === "Critical") critical.push(t);
  });
  return { myTasks, overdue, critical };
}

function completeTask(taskId) {
  // Assuming anyone assigned a task (handled by UI filtering) or Admin can complete
  validatePermission(['Admin', 'Import Team', 'Accounts Team', 'CHA Coordinator']);
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("TASKS");
  const data = sheet.getDataRange().getValues();
  const statusIdx = data[0].indexOf("Status");
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      sheet.getRange(i + 1, statusIdx + 1).setValue("Completed");
      logAudit("TASKS", taskId, "COMPLETE_TASK", "Pending", "Completed");
      clearCacheKeys();
      return true;
    }
  }
  return false;
}

/**
 * Automatically generates the next task based on the current shipment stage.
 */
function generateAutoTask(jobNo, newStage) {
  const rules = {
    "ETA Updated": { title: "Original Documents Follow-up", role: "Import Team" },
    "Original Documents Received": { title: "IGM Filing", role: "CHA Coordinator" },
    "IGM Filed": { title: "BOE Filing", role: "CHA Coordinator" },
    "BOE Filed": { title: "Duty Planning", role: "Accounts Team" },
    "Duty Planned": { title: "Duty Payment", role: "Accounts Team" },
    "Duty Paid": { title: "OOC Follow-up", role: "CHA Coordinator" },
    "OOC Received": { title: "Shipping Line Payment", role: "Accounts Team" },
    "Shipping Line Paid": { title: "DO Collection", role: "CHA Coordinator" },
    "DO Released": { title: "Dispatch Planning", role: "Import Team" },
    "Dispatch Planned": { title: "Vehicle Arrangement", role: "Import Team" },
    "Goods Dispatched": { title: "Delivery Confirmation", role: "Import Team" }
  };

  const nextTask = rules[newStage];
  if (nextTask) {
    createTask({
      Job_No: jobNo,
      Stage: nextTask.title,
      Priority: "High",
      Status: "Pending",
      Assigned_Role: nextTask.role,
      Due_Date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Due tomorrow
      Generated_Auto: true
    });
  }
}

/**
 * Creates a new task record.
 */
function createTask(taskData) {
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("TASKS");
  const taskId = Utilities.getUuid();

  sheet.appendRow([
    taskId,
    taskData.Job_No,
    taskData.Stage,
    taskData.Priority || "Medium",
    taskData.Status || "Pending",
    taskData.Assigned_Role,
    taskData.Due_Date,
    taskData.Generated_Auto || false,
    true // IS_ACTIVE
  ]);

  logAudit("TASKS", taskId, "CREATE", null, taskData);
  return taskId;
}
