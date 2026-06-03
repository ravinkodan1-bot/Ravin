// SLA.gs
// SLA Engine: Calculates delays, creates escalations, and integrates with time-driven triggers

/**
 * Main trigger function to be executed every 15 minutes.
 * Scans all pending/in-progress tasks, calculates delay, updates records, and creates notifications.
 */
function checkSLABreaches() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tasksSheet = ss.getSheetByName("TASKS");
    const data = tasksSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("TaskID");
    const orderIdx = headers.indexOf("OrderID");
    const typeIdx = headers.indexOf("TaskType");
    const dueDateIdx = headers.indexOf("DueDate");
    const statusIdx = headers.indexOf("Status");
    const delayIdx = headers.indexOf("DelayHours");
    const escIdx = headers.indexOf("EscalationLevel");
    const roleIdx = headers.indexOf("TaskOwnerRole");
    const assignIdx = headers.indexOf("AssignedTo");
    const isDeletedIdx = headers.indexOf("IsDeleted");

    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE") continue;

      const status = row[statusIdx];
      if (status === "Pending" || status === "In Progress") {
        const dueDate = new Date(row[dueDateIdx]);

        // Calculate delay in hours if overdue
        if (now > dueDate) {
          const diffMs = now - dueDate;
          const delayHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

          // Update Delay Hours
          tasksSheet.getRange(i + 1, delayIdx + 1).setValue(delayHours);

          let currentEscalation = parseInt(row[escIdx]) || 0;

          // Escalation Logic (e.g., Level 1 right after breach, Level 2 after 4 hours delay)
          let needsEscalation = false;
          let escMessage = "";

          if (delayHours > 0 && currentEscalation === 0) {
            currentEscalation = 1;
            needsEscalation = true;
            escMessage = `SLA Breached for ${row[typeIdx]} on Order ${row[orderIdx]}`;
          } else if (delayHours >= 4 && currentEscalation === 1) {
            currentEscalation = 2;
            needsEscalation = true;
            escMessage = `Critical Delay: ${row[typeIdx]} on Order ${row[orderIdx]} is delayed by > 4 hours`;
          }

          if (needsEscalation) {
            // Update Escalation Level
            tasksSheet.getRange(i + 1, escIdx + 1).setValue(currentEscalation);

            // Log Audit
            logAudit("TASKS", row[idIdx], "EscalationLevel", currentEscalation - 1, currentEscalation, "System");

            // Notify Assigned User or Role
            if (typeof createNotification === 'function') {
              if (row[assignIdx]) {
                createNotification(row[assignIdx], "SLA Breach", escMessage, "Alert", "TASKS", row[idIdx]);
              } else {
                createNotificationForRole(row[roleIdx], "SLA Breach", escMessage, "Alert", "TASKS", row[idIdx]);
              }
              // Also notify ADMIN for Level 2
              if (currentEscalation >= 2) {
                createNotificationForRole("ADMIN", "Critical Delay Alert", escMessage, "Alert", "ORDERS", row[orderIdx]);
              }
            }

            // Update Overall Status of the Order to "Delayed"
            updateOrderStatusToDelayed(row[orderIdx]);
          }
        }
      }
    }
  } catch (error) {
    logSystemError("ERROR", "checkSLABreaches failed: " + error.toString(), "SLA");
  }
}

/**
 * Sets the order status to delayed if not already closed/delivered.
 */
function updateOrderStatusToDelayed(orderId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("OrderID");
    const statusIdx = headers.indexOf("OverallStatus");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === orderId) {
        const currentStatus = data[i][statusIdx];
        if (currentStatus !== "Closed" && currentStatus !== "Delivered" && currentStatus !== "Cancelled" && currentStatus !== "Delayed") {
          ordersSheet.getRange(i + 1, statusIdx + 1).setValue("Delayed");
          logAudit("ORDERS", orderId, "OverallStatus", currentStatus, "Delayed", "System");
        }
        break;
      }
    }
  } catch (error) {
    logSystemError("ERROR", "updateOrderStatusToDelayed failed: " + error.toString(), "SLA");
  }
}

/**
 * Setup function to install the trigger.
 * Admin should call this once from the UI or Apps Script Editor.
 */
function installSLATrigger() {
  // Clear existing to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkSLABreaches") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Install trigger to run every 15 minutes
  ScriptApp.newTrigger("checkSLABreaches")
    .timeBased()
    .everyMinutes(15)
    .create();

  return "SLA Trigger installed successfully.";
}
