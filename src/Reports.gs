// Reports.gs
// Handles generating structured data for various report types (Orders, Dispatch, Performance)

/**
 * Generate a specific report based on type and date range
 */
function generateReport(reportType, startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Parse dates if provided
    const start = startDate ? new Date(startDate) : new Date(0); // Epoch start
    const end = endDate ? new Date(endDate) : new Date(); // Now
    end.setHours(23, 59, 59, 999); // End of day

    let reportData = [];
    let headers = [];

    switch (reportType) {
      case "ORDER_REPORT":
        const ordersRows = getActiveRows(ss, "ORDERS");
        const orderHeaders = getHeaders(ss, "ORDERS");

        headers = ["OrderID", "Date", "Customer", "Quantity", "OrderValue", "Status", "Stage"];

        ordersRows.forEach(row => {
          const o = mapRowToObject(row, orderHeaders);
          const oDate = new Date(o.OrderDate || o.CreatedAt);
          if (oDate >= start && oDate <= end) {
            reportData.push([
              o.OrderID,
              oDate.toLocaleDateString(),
              o.PartyName || o.Company,
              o.Quantity,
              o.OrderValue,
              o.OverallStatus,
              o.CurrentStage
            ]);
          }
        });
        break;

      case "PERFORMANCE_REPORT":
        const tasksRows = getActiveRows(ss, "TASKS");
        const taskHeaders = getHeaders(ss, "TASKS");
        const usersRows = getActiveRows(ss, "USERS");
        const userMap = {};

        usersRows.forEach(u => {
          userMap[u[0]] = u[1]; // UserID -> Name
        });

        headers = ["Employee", "Total Tasks", "Completed", "Delayed", "Avg Delay (Hrs)"];
        const empStats = {};

        tasksRows.forEach(row => {
          const t = mapRowToObject(row, taskHeaders);
          const tDate = new Date(t.AssignedDate);

          if (tDate >= start && tDate <= end && t.AssignedTo) {
            const empName = userMap[t.AssignedTo] || t.AssignedTo;
            if (!empStats[empName]) {
              empStats[empName] = { total: 0, completed: 0, delayedCount: 0, totalDelayHrs: 0 };
            }

            empStats[empName].total++;
            if (t.Status === "Completed") empStats[empName].completed++;

            const delay = parseFloat(t.DelayHours) || 0;
            if (delay > 0) {
              empStats[empName].delayedCount++;
              empStats[empName].totalDelayHrs += delay;
            }
          }
        });

        for (const emp in empStats) {
          const stat = empStats[emp];
          const avgDelay = stat.delayedCount > 0 ? (stat.totalDelayHrs / stat.delayedCount).toFixed(2) : 0;
          reportData.push([emp, stat.total, stat.completed, stat.delayedCount, avgDelay]);
        }
        break;

      default:
        return { success: false, message: "Unknown report type" };
    }

    return { success: true, headers: headers, data: reportData };

  } catch (error) {
    logSystemError("ERROR", "generateReport failed: " + error.toString(), "Reports");
    return { success: false, message: error.toString() };
  }
}
