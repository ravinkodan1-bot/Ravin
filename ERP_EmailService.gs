function runScheduledEmailAlerts() {
  const tasks = getMasterDataList("TASKS");
  const users = getMasterDataList("USERS");
  const now = new Date();
  let overdueTasks = [];
  tasks.forEach(t => {
    if (t.Status !== "Completed" && new Date(t.Due_Date) < now) overdueTasks.push(t);
  });
  if (overdueTasks.length > 0) {
    const mgmtUsers = users.filter(u => u.Role === "Management");
    mgmtUsers.forEach(mu => {
      try {
        MailApp.sendEmail(mu.Email, "ERP Alert: Overdue Tasks", `There are ${overdueTasks.length} overdue tasks.`);
      } catch(e) {}
    });
  }
}
