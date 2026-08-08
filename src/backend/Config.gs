/**
 * Config & Environment Resolution
 */

const CACHE_DURATION_CONFIG = 1800; // 30 minutes in seconds
const CACHE_DURATION_USERS = 900; // 15 minutes in seconds

/**
 * Gets the Master Spreadsheet ID from Script Properties.
 * Does not hardcode IDs.
 */
function getMasterSpreadsheetId() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('MASTER_SPREADSHEET_ID');
  if (!id) throw new Error("MASTER_SPREADSHEET_ID property is missing.");
  return id;
}

/**
 * Gets the current FY from CONFIG sheet (e.g. "FY_26_27").
 */
function getCurrentFY() {
  const config = getConfig();
  if (!config['CURRENT_FY']) throw new Error("CURRENT_FY missing from CONFIG");
  return config['CURRENT_FY'];
}

/**
 * Gets all config key-values from the CONFIG sheet in Master Spreadsheet.
 * Uses caching.
 */
function getConfig() {
  const cache = CacheService.getScriptCache();
  const cachedConfig = cache.get('CONFIG');
  if (cachedConfig) {
    return JSON.parse(cachedConfig);
  }

  const masterId = getMasterSpreadsheetId();
  const ss = SpreadsheetApp.openById(masterId);
  const sheet = ss.getSheetByName('CONFIG');
  if (!sheet) throw new Error("CONFIG sheet missing in Master Spreadsheet");

  const data = sheet.getDataRange().getValues();
  let configObj = {};

  // Assuming Col 1 is Key, Col 2 is Value
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const val = data[i][1];
    if (key) {
      configObj[key] = val;
    }
  }

  cache.put('CONFIG', JSON.stringify(configObj), CACHE_DURATION_CONFIG);
  return configObj;
}

/**
 * Resolves the Data Spreadsheet ID for a given FY.
 * If not passed, uses CURRENT_FY.
 */
function getDatabaseByFY(fy) {
  if (!fy) fy = getCurrentFY();
  const config = getConfig();
  const key = `DATA_SPREADSHEET_ID_${fy}`;
  const id = config[key];
  if (!id) throw new Error(`Data Spreadsheet ID not configured for FY: ${fy} (Key: ${key})`);
  return id;
}

/**
 * Resolves the Task Spreadsheet ID for a given FY.
 */
function getTaskDatabaseByFY(fy) {
  if (!fy) fy = getCurrentFY();
  const config = getConfig();
  const key = `TASKS_SPREADSHEET_ID_${fy}`;
  const id = config[key];
  if (!id) throw new Error(`Task Spreadsheet ID not configured for FY: ${fy} (Key: ${key})`);
  return id;
}

/**
 * Validates that the current user has access to the Drive Root Folder.
 */
function validateDriveAccess() {
  try {
    const config = getConfig();
    const folderId = config['IMPORTOPS_ROOT_FOLDER_ID'];
    if (!folderId) throw new Error("IMPORTOPS_ROOT_FOLDER_ID missing from config");

    // Attempt to get the folder. Will throw error if user has no access.
    DriveApp.getFolderById(folderId);
    return true;
  } catch (e) {
    logSystemError("validateDriveAccess", e);
    return false;
  }
}
