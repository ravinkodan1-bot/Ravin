/**
 * Dashboard & Summary Analytics
 * Pre-aggregates data to prevent frontend from scanning millions of rows.
 */

/**
 * Generates the summary object required for the Dashboard KPIs.
 * Uses caching to ensure fast loading times for large databases.
 */
function getDashboardSummary() {
  try {
    const user = requireRole(["Admin", "Management", "Import", "Accounts", "CHA", "Viewer"]);

    // We can use a short cache (e.g. 5 minutes) for dashboard metrics
    // to prevent hammering the spreadsheet on every reload
    const cache = CacheService.getScriptCache();
    const cacheKey = `DASHBOARD_SUMMARY_${getCurrentFY()}_${user.Role}`; // Cache by role (for future RBAC filtering)
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return apiResponse(true, JSON.parse(cachedData), "Loaded from cache");
    }

    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const tasksDbId = getTaskDatabaseByFY(fy);

    // 1. Fetch Jobs Summary
    const jobs = getRecords(dbId, "JOBS");
    const activeJobs = jobs.filter(j => j.Overall_Status !== "COMPLETED" && j.Overall_Status !== "CANCELLED").length;

    // Status aggregations for charts
    const jobsByStatus = jobs.reduce((acc, job) => {
      acc[job.Overall_Status] = (acc[job.Overall_Status] || 0) + 1;
      return acc;
    }, {});

    // 2. Fetch Tasks Summary (For Pending Task Center summary)
    const tasks = getRecords(tasksDbId, "WORKFLOW_TASKS");
    let pendingTasks = 0;
    let overdueTasks = 0;

    const now = new Date();

    tasks.forEach(task => {
      // If task is accessible by this user's department/role or is Admin
      if (user.Role === "Admin" || user.Role === "Management" || task.Assigned_To === user.Department || task.Assigned_To === user.Role) {
        if (task.Status === "PENDING" || task.Status === "IN_PROGRESS") {
          pendingTasks++;

          if (task.Planned_Date) {
            const pDate = new Date(task.Planned_Date);
            if (pDate < now) {
              overdueTasks++;
            }
          }
        }
      }
    });

    // 3. Pending Payments
    const payments = getRecords(dbId, "PAYMENTS");
    const pendingPayments = payments.filter(p => p.Status === "Requested" || p.Status === "Submitted").length;

    // 4. Pending Empty Container Returns
    const containers = getRecords(dbId, "CONTAINERS");
    let pendingContainerReturns = 0;
    containers.forEach(c => {
      if (c.Container_Status === "Dispatched") {
        pendingContainerReturns++;
      }
    });

    const summary = {
      activeJobs: activeJobs,
      jobsByStatus: jobsByStatus,
      myPendingTasks: pendingTasks,
      myOverdueTasks: overdueTasks,
      pendingPayments: pendingPayments,
      pendingContainerReturns: pendingContainerReturns
    };

    // Cache for 5 minutes
    cache.put(cacheKey, JSON.stringify(summary), 300);

    return apiResponse(true, summary, "Dashboard metrics calculated.");

  } catch (err) {
    logSystemError("getDashboardSummary", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Gets the actual Task List for the Pending Task Center
 */
function getMyTasks() {
   try {
      const user = requireRole(["Admin", "Management", "Import", "Accounts", "CHA"]);
      const tasksDbId = getTaskDatabaseByFY(getCurrentFY());
      const tasks = getRecords(tasksDbId, "WORKFLOW_TASKS");

      const myTasks = tasks.filter(task => {
          if (task.Status === "COMPLETED" || task.Status === "LOCKED") return false;
          // Filter by assigned user role/dept
          if (user.Role === "Admin" || user.Role === "Management") return true;
          return (task.Assigned_To === user.Department || task.Assigned_To === user.Role);
      });

      return apiResponse(true, myTasks, "");
   } catch(err) {
      logSystemError("getMyTasks", err);
      return apiResponse(false, null, err.message);
   }
}
