/**
 * Database Abstraction Layer
 */

/**
 * Returns the active database spreadsheet based on current FY
 */
function getActiveDatabase() {
  return SpreadsheetApp.openById(getDatabaseByFY(getCurrentFY()));
}

/**
 * Utility to batch read data from a sheet
 * Returns array of objects based on headers.
 */
function getRecords(spreadsheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found.`);

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j];
    }
    // Only include if not IsDeleted
    if (String(record['IsDeleted']).trim().toUpperCase() !== "TRUE") {
      records.push(record);
    }
  }

  return records;
}

/**
 * Utility to append a row safely
 */
function appendRecord(spreadsheetId, sheetName, recordObj) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found.`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];

  for (let j = 0; j < headers.length; j++) {
    row.push(recordObj[headers[j]] !== undefined ? recordObj[headers[j]] : "");
  }

  sheet.appendRow(row);
  return recordObj;
}
