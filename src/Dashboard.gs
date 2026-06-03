// Dashboard.gs
// APIs to calculate KPIs, metrics, and data for the Dashboard charts.

/**
 * Main function to fetch all dashboard metrics.
 * Designed to return a comprehensive JSON object for the frontend.
 */
function getDashboardMetrics() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Fetch data arrays
    const ordersData = getActiveRows(ss, "ORDERS");
    const tasksData = getActiveRows(ss, "TASKS");
    const usersData = getActiveRows(ss, "USERS");

    // Header maps for easier access
    const ordersHeaders = getHeaders(ss, "ORDERS");
    const tasksHeaders = getHeaders(ss, "TASKS");

    // KPI Counters
    let totalOrdersToday = 0;
    let pendingOrders = 0;
    let delayedOrdersCount = 0;
    let dispatchPending = 0;
    let deliveredOrders = 0;
    let closedOrders = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Arrays for charts
    const ordersByStatus = {};
    const ordersByWarehouse = {};
    const delayAnalysis = {}; // stage -> count

    const delayedOrdersList = []; // For "Top Delayed Orders"

    // Process Orders
    ordersData.forEach(row => {
      const order = mapRowToObject(row, ordersHeaders);

      // 1. Total Orders Today
      const orderDateStr = order.OrderDate ? new Date(order.OrderDate).toISOString().split('T')[0] : "";
      if (orderDateStr === todayStr) totalOrdersToday++;

      // 2. Pending Orders
      if (["Draft", "Open", "In Progress"].includes(order.OverallStatus)) pendingOrders++;

      // 3. Delayed Orders
      if (order.OverallStatus === "Delayed") {
        delayedOrdersCount++;
        delayedOrdersList.push(order);
      }

      // 4. Dispatch Pending (e.g. stage is BEFORE DISPATCHED but not closed)
      const preDispatchStages = ["ORDER_RECEIVED", "SO_CREATED", "STOCK_CONFIRMED", "TRANSPORT_ASSIGNED", "BILL_GENERATED"];
      if (preDispatchStages.includes(order.CurrentStage) && order.OverallStatus !== "Cancelled") dispatchPending++;

      // 5. Delivered / Closed
      if (order.OverallStatus === "Delivered") deliveredOrders++;
      if (order.OverallStatus === "Closed") closedOrders++;

      // Chart: Orders By Status
      ordersByStatus[order.OverallStatus] = (ordersByStatus[order.OverallStatus] || 0) + 1;

      // Chart: Orders By Warehouse
      const whId = order.WarehouseID || "Unassigned";
      ordersByWarehouse[whId] = (ordersByWarehouse[whId] || 0) + 1;
    });

    // Process Tasks (for Employee Performance, Delay Analysis, SLA Breach count)
    let slaBreachCount = 0;
    const employeePerformance = {};

    tasksData.forEach(row => {
      const task = mapRowToObject(row, tasksHeaders);

      // SLA Breaches
      if (parseFloat(task.DelayHours) > 0) {
        slaBreachCount++;
        delayAnalysis[task.TaskType] = (delayAnalysis[task.TaskType] || 0) + 1;
      }

      // Employee Performance
      if (task.AssignedTo) {
        if (!employeePerformance[task.AssignedTo]) {
          employeePerformance[task.AssignedTo] = { total: 0, completed: 0, delayed: 0 };
        }
        employeePerformance[task.AssignedTo].total++;
        if (task.Status === "Completed") employeePerformance[task.AssignedTo].completed++;
        if (parseFloat(task.DelayHours) > 0) employeePerformance[task.AssignedTo].delayed++;
      }
    });

    // Format Top Delayed Orders
    delayedOrdersList.sort((a, b) => new Date(a.OrderDate) - new Date(b.OrderDate));
    const topDelayedOrders = delayedOrdersList.slice(0, 5).map(o => ({
      OrderID: o.OrderID,
      Company: o.Company,
      Stage: o.CurrentStage,
      Date: o.OrderDate
    }));

    // Format Top Delayed Employees
    const empArr = Object.keys(employeePerformance).map(emp => {
      return { user: emp, delays: employeePerformance[emp].delayed };
    }).filter(e => e.delays > 0).sort((a, b) => b.delays - a.delays).slice(0, 5);

    // Map usernames to real names if needed
    const userNamesMap = {};
    usersData.forEach(row => {
       const id = row[0]; // Assuming UserID is col 1
       const name = row[1]; // Name is col 2
       userNamesMap[id] = name;
    });

    const topDelayedEmployees = empArr.map(e => ({
       User: userNamesMap[e.user] || e.user,
       Delays: e.delays
    }));

    return {
      success: true,
      data: {
        kpi: {
          totalOrdersToday,
          pendingOrders,
          delayedOrdersCount,
          dispatchPending,
          deliveredOrders,
          closedOrders,
          slaBreachCount
        },
        charts: {
          ordersByStatus,
          ordersByWarehouse,
          delayAnalysis
        },
        tables: {
          topDelayedOrders,
          topDelayedEmployees
        }
      }
    };

  } catch (error) {
    logSystemError("ERROR", "getDashboardMetrics failed: " + error.toString(), "Dashboard");
    return { success: false, message: error.toString() };
  }
}

/**
 * Utility: Get active (non-deleted) rows from a sheet.
 * Returns array of rows (excluding header).
 */
function getActiveRows(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const isDeletedIdx = data[0].indexOf("IsDeleted");
  const activeRows = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][isDeletedIdx] !== "TRUE") {
      activeRows.push(data[i]);
    }
  }
  return activeRows;
}

/**
 * Utility: Get headers for a sheet.
 */
function getHeaders(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * Utility: Map row array to object using headers.
 */
function mapRowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx];
  });
  return obj;
}
