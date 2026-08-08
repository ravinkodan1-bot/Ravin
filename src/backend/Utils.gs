/**
 * Utilities
 */

/**
 * Generates a UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generates the next Sequence value safely using LockService.
 * @param {string} sequenceName - e.g., "JOB_NO"
 * @returns {string} - The new sequence string
 */
function getNextSequence(sequenceName) {
  const lock = LockService.getScriptLock();

  // Wait up to 10 seconds for other processes
  if (!lock.tryLock(10000)) {
    throw new Error("Could not obtain lock to generate sequence number.");
  }

  try {
    const masterId = getMasterSpreadsheetId();
    const ss = SpreadsheetApp.openById(masterId);
    const sheet = ss.getSheetByName("SEQUENCES");
    if (!sheet) throw new Error("SEQUENCES sheet missing.");

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let currentValue = 0;
    let prefix = "";

    // Find the sequence row
    // Assuming Columns: Sequence_Name, Prefix, Current_Value
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sequenceName) {
        rowIndex = i + 1; // 1-based index for spreadsheet
        prefix = data[i][1];
        currentValue = parseInt(data[i][2], 10) || 0;
        break;
      }
    }

    if (rowIndex === -1) {
       throw new Error(`Sequence ${sequenceName} not found.`);
    }

    const nextValue = currentValue + 1;

    // Update the sheet
    sheet.getRange(rowIndex, 3).setValue(nextValue);

    // Format: IMP-26-27-0001
    // Number format padded to 4 digits, supporting numbers > 9999
    const paddedNum = String(nextValue).padStart(4, '0');

    // Replace year template if needed, e.g., if prefix is "IMP-{FY}-"
    // For now we will rely on current FY from config if prefix requires it.
    let finalPrefix = prefix;
    if (finalPrefix.includes("{FY}")) {
      const fy = getCurrentFY().replace("FY_", "").replace("_", "-");
      finalPrefix = finalPrefix.replace("{FY}", fy);
    }

    return finalPrefix + paddedNum;

  } finally {
    lock.releaseLock();
  }
}

/**
 * Retrieves the currently active user's email safely
 */
function getCurrentUserEmail() {
  const email = Session.getActiveUser().getEmail();
  return email ? email.toLowerCase() : "unknown_user";
}
