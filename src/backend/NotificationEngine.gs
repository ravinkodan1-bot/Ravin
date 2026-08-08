/**
 * Hybrid Notification Engine & Reports
 * Designed to be executed via a Daily Time-Driven Trigger (e.g., 8:00 AM).
 */

/**
 * Main Daily CRON job function.
 * Scans tasks, checks ETAs, and generates daily digest emails for each department/user.
 */
function runDailyDigest() {
  try {
    const fy = getCurrentFY();
    const tasksDbId = getTaskDatabaseByFY(fy);
    const dbId = getDatabaseByFY(fy);

    const tasks = getRecords(tasksDbId, "WORKFLOW_TASKS");
    const jobs = getRecords(dbId, "JOBS");

    const now = new Date();
    // Group alerts by User/Role
    const digests = {};

    // 1. Process Overdue / Due Tasks
    tasks.forEach(task => {
      if (task.Status === "COMPLETED" || task.Status === "CANCELLED" || task.Status === "LOCKED") return;

      const assigned = task.Assigned_To; // Can be a Role (e.g. "Accounts") or Email
      if (!digests[assigned]) digests[assigned] = { overdue: [], dueToday: [], upcoming: [] };

      if (task.Planned_Date) {
        const pDate = new Date(task.Planned_Date);
        const diffDays = Math.ceil((pDate - now) / (1000 * 60 * 60 * 24));

        const job = jobs.find(j => j.Job_ID === task.Job_ID);
        const jobNo = job ? job.Job_No : task.Job_ID.substring(0,8);

        if (diffDays < 0) {
           // Overdue
           // Auto-update Status to OVERDUE if it was PENDING
           if (task.Status === "PENDING" || task.Status === "IN_PROGRESS") {
              updateTaskStatus(task.Task_ID, "OVERDUE");
           }
           digests[assigned].overdue.push(`[${jobNo}] ${task.Task_Name} (Overdue by ${Math.abs(diffDays)} days)`);
        } else if (diffDays === 0) {
           digests[assigned].dueToday.push(`[${jobNo}] ${task.Task_Name}`);
        }
      }
    });

    // 2. Queue emails
    const emailsToQueue = [];
    const users = getUsers(); // Master Data

    Object.keys(digests).forEach(assignee => {
       const summary = digests[assignee];
       if (summary.overdue.length === 0 && summary.dueToday.length === 0) return; // Nothing to report

       let html = `<h3>Daily ImportOps Digest for ${assignee}</h3>`;

       if (summary.overdue.length > 0) {
          html += `<h4 style="color:red;">Overdue Tasks</h4><ul>`;
          summary.overdue.forEach(t => html += `<li>${t}</li>`);
          html += `</ul>`;
       }

       if (summary.dueToday.length > 0) {
          html += `<h4 style="color:orange;">Due Today</h4><ul>`;
          summary.dueToday.forEach(t => html += `<li>${t}</li>`);
          html += `</ul>`;
       }

       // Resolve target email(s)
       // If assigned is a Role/Department, find all matching users.
       const targetUsers = users.filter(u => u.Role === assignee || u.Department === assignee || u.Email === assignee);

       targetUsers.forEach(u => {
          emailsToQueue.push({
             Target_Email: u.Email,
             Target_Role: u.Role,
             Subject: `ImportOps Daily Digest - ${summary.overdue.length} Overdue`,
             Message_HTML: html
          });
       });
    });

    // 3. Batch Append to Queue
    if (emailsToQueue.length > 0) {
       queueNotifications(tasksDbId, emailsToQueue);
    }

    // 4. Flush Queue (Send via MailApp)
    flushNotificationQueue(tasksDbId);

  } catch(err) {
    logSystemError("runDailyDigest", err);
  }
}

/**
 * Appends notifications to the queue
 */
function queueNotifications(tasksDbId, emailArr) {
    const ss = SpreadsheetApp.openById(tasksDbId);
    const sheet = ss.getSheetByName("NOTIFICATIONS_QUEUE");
    const timestamp = new Date();

    const rows = emailArr.map(e => [
       generateUUID(),
       e.Target_Email,
       e.Target_Role,
       e.Subject,
       e.Message_HTML,
       "FALSE", // Is_Sent
       timestamp
    ]);

    if(rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    }
}

/**
 * Sends pending emails from the queue
 */
function flushNotificationQueue(tasksDbId) {
    const ss = SpreadsheetApp.openById(tasksDbId);
    const sheet = ss.getSheetByName("NOTIFICATIONS_QUEUE");
    const data = sheet.getDataRange().getValues();

    const sentRows = [];

    for (let i = 1; i < data.length; i++) {
       if (data[i][5] === "FALSE" || data[i][5] === false) { // Is_Sent col
           const email = data[i][1];
           const subject = data[i][3];
           const html = data[i][4];

           try {
             MailApp.sendEmail({
                to: email,
                subject: subject,
                htmlBody: html
             });
             sentRows.push(i + 1); // Track row number to update
           } catch(e) {
             logSystemError("flushNotificationQueue", new Error(`Failed to send email to ${email}: ${e.message}`));
           }
       }
    }

    // Mark as sent
    sentRows.forEach(row => {
       sheet.getRange(row, 6).setValue("TRUE"); // Col 6 is Is_Sent
    });
}

/**
 * Triggers an immediate critical alert (e.g. System Errors, Management Escalations)
 */
function sendCriticalAlert(subject, htmlMessage, targetRole = "Admin") {
   const users = getUsers();
   const targets = users.filter(u => u.Role === targetRole);

   targets.forEach(u => {
      try {
         MailApp.sendEmail({
            to: u.Email,
            subject: "[URGENT] " + subject,
            htmlBody: htmlMessage
         });
      } catch(e) {
         Logger.log("Failed to send critical alert to " + u.Email);
      }
   });
}

/**
 * Report Generation: Exports Job Data as CSV string
 */
function generateJobReportCSV() {
  try {
     requireRole(["Admin", "Management"]);
     const dbId = getDatabaseByFY(getCurrentFY());
     const ss = SpreadsheetApp.openById(dbId);
     const sheet = ss.getSheetByName("JOBS");
     const data = sheet.getDataRange().getValues();

     // Convert 2D array to CSV string safely
     let csvContent = "";
     data.forEach(row => {
        let cleanRow = row.map(cell => {
           let val = String(cell).replace(/"/g, '""');
           return `"${val}"`;
        });
        csvContent += cleanRow.join(",") + "\n";
     });

     return apiResponse(true, { csv: csvContent }, "Report generated.");
  } catch(err) {
     return apiResponse(false, null, err.message);
  }
}
