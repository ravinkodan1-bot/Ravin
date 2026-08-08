/**
 * Master Data Management (Users, Suppliers, Importers)
 */

/**
 * Gets all active users from the Master DB.
 * Uses caching to optimize reads.
 */
function getUsers() {
  const cache = CacheService.getScriptCache();
  const cachedUsers = cache.get('MASTER_USERS');
  if (cachedUsers) {
    return JSON.parse(cachedUsers);
  }

  const masterId = getMasterSpreadsheetId();
  const records = getRecords(masterId, "USERS");
  const users = records.filter(u => u.Status === "Active");

  cache.put('MASTER_USERS', JSON.stringify(users), CACHE_DURATION_USERS);
  return users;
}

/**
 * Validates RBAC for a specific action.
 * Throws error if user lacks permission.
 */
function requireRole(allowedRoles) {
  const email = getCurrentUserEmail();
  const users = getUsers();
  const user = users.find(u => String(u.Email).toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error(`User ${email} not found in system.`);
  }

  if (user.Role === "Admin") return user; // Admin bypasses checks

  if (!allowedRoles.includes(user.Role)) {
    throw new Error(`Access Denied: User role '${user.Role}' lacks permission. Expected: ${allowedRoles.join(", ")}`);
  }

  return user;
}

/**
 * Gets all active suppliers.
 */
function getSuppliers() {
  const masterId = getMasterSpreadsheetId();
  const records = getRecords(masterId, "SUPPLIERS");
  return records.filter(s => s.Status === "Active");
}

/**
 * Gets all active Importers (Company entities).
 */
function getImporters() {
  const masterId = getMasterSpreadsheetId();
  const records = getRecords(masterId, "IMPORTERS");
  return records.filter(i => i.Status === "Active");
}

/**
 * Generic function to append a new Master Data record.
 * Must be executed by Admin or authorized Management.
 */
function createMasterRecord(sheetName, recordData) {
  const user = requireRole(["Admin", "Management"]);
  const masterId = getMasterSpreadsheetId();

  // Add tracking metadata
  recordData.CreatedBy = user.Email;
  recordData.CreatedDateTime = new Date();
  recordData.IsDeleted = "FALSE";

  const savedRecord = appendRecord(masterId, sheetName, recordData);

  // Audit log
  appendAudit(
    "MasterData",
    sheetName,
    recordData[Object.keys(recordData)[0]], // Assumes first key is ID
    "Create",
    { newVal: recordData }
  );

  return apiResponse(true, savedRecord, "Record created successfully.");
}
