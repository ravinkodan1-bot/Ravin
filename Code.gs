/**
 * Inventory Management System - Backend Core
 * Core Services & Common Utilities Architecture
 */


/**
 * Common Utilities Service
 */
function getDbId() {
  const props = PropertiesService.getScriptProperties();
  const dbId = props.getProperty("MASTER_SPREADSHEET_ID");
  if (!dbId) {
      throw new Error("MASTER_SPREADSHEET_ID is not configured in Script Properties. Exception: Invalid argument: id");
  }
  return dbId;
}
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Inventory Management System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Database Initialization
 */
function initializeDatabase() {
  try {
    const ss = SpreadsheetApp.openById(getDbId());

    // As per user requirement: RecordID + Tracking Cols
    const stdCols = ['CreatedBy', 'CreatedDateTime', 'UpdatedBy', 'UpdatedDateTime', 'DeletedBy', 'DeletedDateTime', 'IsDeleted'];

    const sheetsToCreate = [
      { name: 'USERS', headers: ['UserID', 'Name', 'Email', 'Role', 'Status', 'AllowedLocations', ...stdCols] },
      { name: 'ITEMS', headers: ['ItemID', 'ItemCode', 'ItemName', 'Category', 'UOM', 'HSNCode', 'BatchEnabled', 'LotEnabled', 'ContainerEnabled', 'ActiveStatus', ...stdCols] },
      { name: 'PARTIES', headers: ['PartyID', 'PartyCode', 'PartyName', 'PartyType', 'GSTNo', 'Address', 'ContactPerson', 'Mobile', 'Email', 'ActiveStatus', ...stdCols] },
      { name: 'LOCATIONS', headers: ['LocationID', 'LocationCode', 'LocationName', 'LocationType', 'Address', 'State', 'ActiveStatus', ...stdCols] },

      { name: 'PURCHASE_ORDERS', headers: ['RecordID', 'PO_Number', 'Date', 'Supplier_Code', 'Status', 'L1_ApprovedBy', 'L1_ApprovedAt', 'L2_ApprovedBy', 'L2_ApprovedAt', 'Final_ApprovedBy', 'Final_ApprovedAt', ...stdCols] },
      { name: 'PURCHASE_ORDER_ITEMS', headers: ['RecordID', 'Line_ID', 'PO_Number', 'Item_Code', 'Qty', 'Rate', 'Amount', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Serial_No', ...stdCols] },

      { name: 'SALES_ORDERS', headers: ['RecordID', 'SO_Number', 'Date', 'Customer_Code', 'Status', 'L1_ApprovedBy', 'L1_ApprovedAt', 'L2_ApprovedBy', 'L2_ApprovedAt', 'Final_ApprovedBy', 'Final_ApprovedAt', ...stdCols] },
      { name: 'SALES_ORDER_ITEMS', headers: ['RecordID', 'Line_ID', 'SO_Number', 'Item_Code', 'Loc_Code', 'Qty', 'Dispatched_Qty', 'Rate', 'Amount', 'Batch_No', 'Lot_No', 'Container_No', 'Serial_No', ...stdCols] },

      { name: 'DISPATCH', headers: ['RecordID', 'Dispatch_Number', 'Date', 'SO_Number', 'Customer_Code', 'Vehicle_No', 'LR_No', 'Remarks', 'Status', ...stdCols] },
      { name: 'DISPATCH_ITEMS', headers: ['RecordID', 'Line_ID', 'Dispatch_Number', 'Item_Code', 'Loc_Code', 'Dispatch_Qty', 'Batch_No', 'Lot_No', 'Container_No', 'Serial_No', ...stdCols] },

      { name: 'INTERNAL_TRANSFERS', headers: ['RecordID', 'Transfer_Number', 'Date', 'From_Loc', 'To_Loc', 'Status', ...stdCols] },
      { name: 'INTERNAL_TRANSFER_ITEMS', headers: ['RecordID', 'Line_ID', 'Transfer_Number', 'Item_Code', 'Qty', 'Batch_No', 'Lot_No', 'Container_No', 'Serial_No', ...stdCols] },

      { name: 'STOCK_ADJUSTMENTS', headers: ['RecordID', 'Adj_Number', 'Date', 'Adj_Type', 'Status', 'Remarks', ...stdCols] },
      { name: 'STOCK_ADJUSTMENT_ITEMS', headers: ['RecordID', 'Line_ID', 'Adj_Number', 'Item_Code', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Qty', ...stdCols] },

      { name: 'STOCK_LEDGER', headers: ['Trans_ID', 'Trans_Type', 'DateTime', 'Ref_Number', 'Item_Code', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Qty_In', 'Qty_Out', 'Running_Balance', 'User', 'Remarks'] },
      { name: 'INVENTORY', headers: ['Item_Code', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Physical_Stock', 'Reserved_Stock', 'Available_Stock'] },
      { name: 'DAILY_STOCK_HISTORY', headers: ['Snapshot_Date', 'Item_Code', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Physical_Stock', 'Reserved_Stock', 'Available_Stock'] },

      { name: 'AUDIT_LOGS', headers: ['AuditID', 'DateTime', 'User', 'Module', 'Action', 'RecordID', 'OldJSON', 'NewJSON'] },
      { name: 'SETTINGS', headers: ['Key', 'Value'] },
      { name: 'SEQUENCES', headers: ['Entity', 'Prefix', 'Current_Value', 'Financial_Year'] }
    ];

    let createdSheets = [];

    sheetsToCreate.forEach(config => {
      let sheet = ss.getSheetByName(config.name);
      if (!sheet) {
        sheet = ss.insertSheet(config.name);
        createdSheets.push(config.name);
      }
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    });

    // SETTINGS Setup
    const settingsSheet = ss.getSheetByName('SETTINGS');
    if (settingsSheet.getLastRow() <= 1) {
       settingsSheet.getRange(2, 1, 7, 2).setValues([
         ['COMPANY_NAME', 'My Enterprise'],
         ['FINANCIAL_YEAR', '26-27'],
         ['FY_START_DATE', '2026-04-01'],
         ['DEFAULT_PAGINATION', '50'],
         ['APP_VERSION', '1.0.0'],
         ['DB_VERSION', '1.0'],
         ['RELEASE_DATE', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')]
       ]);
    }

    // SEQUENCES Setup
    const seqSheet = ss.getSheetByName('SEQUENCES');
    if (seqSheet.getLastRow() <= 1) {
       seqSheet.getRange(2, 1, 9, 4).setValues([
         ['USERS', 'U', 0, 'ALL'],
         ['ITEMS', 'ITM', 0, 'ALL'],
         ['PARTIES', 'PRT', 0, 'ALL'],
         ['LOCATIONS', 'LOC', 0, 'ALL'],
         ['PURCHASE_ORDERS', 'PO', 0, '26-27'],
         ['SALES_ORDERS', 'SO', 0, '26-27'],
         ['DISPATCH', 'DIS', 0, '26-27'],
         ['INTERNAL_TRANSFERS', 'TRN', 0, '26-27'],
         ['STOCK_ADJUSTMENTS', 'ADJ', 0, '26-27']
       ]);
    }

    // Default Admin User
    const userSheet = ss.getSheetByName('USERS');
    if (userSheet.getLastRow() <= 1) {
       const email = Session.getActiveUser().getEmail() || 'admin@example.com';
       const now = new Date();
       userSheet.appendRow(['U-ALL-00001', 'Admin', email, 'Admin', 'Active', '', email, now, '', '', '', '', 'FALSE']);
    }

    setupDailyTriggers();
    return { success: true, message: "Database Initialized and Triggers active." };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// -----------------------------------------
// Security Service
// -----------------------------------------
function getCurrentUser() {
  return Session.getActiveUser().getEmail() || 'localdev@test.com';
}

function authenticateUser() {
  try {
    const email = getCurrentUser();

    const cache = CacheService.getScriptCache();
    const cachedUser = cache.get('USER_' + email);
    if (cachedUser) return { success: true, user: JSON.parse(cachedUser) };

    const ss = SpreadsheetApp.openById(getDbId());
    const userSheet = ss.getSheetByName('USERS');
    if (!userSheet) return { success: false, error: "Database not initialized." };

    const data = userSheet.getDataRange().getValues();
    const headers = data[0];

    const emailIdx = headers.indexOf('Email');
    const roleIdx = headers.indexOf('Role');
    const statusIdx = headers.indexOf('Status');
    const isDeletedIdx = headers.indexOf('IsDeleted');
    const allowedLocsIdx = headers.indexOf('AllowedLocations');

    if (emailIdx === -1) return { success: false, error: "Invalid USERS sheet schema." };

    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      if (String(row[emailIdx]).trim().toLowerCase() === String(email).trim().toLowerCase() &&
          String(row[isDeletedIdx]).trim().toUpperCase() !== 'TRUE') {

        if (String(row[statusIdx]).trim().toUpperCase() !== 'ACTIVE') {
           return { success: false, error: "User account is inactive." };
        }

        const userObj = {
          email: email,
          role: row[roleIdx],
          allowedLocations: row[allowedLocsIdx] ? String(row[allowedLocsIdx]).split(',') : []
        };

        cache.put('USER_' + email, JSON.stringify(userObj), 600); // cache 10 mins

        return { success: true, user: userObj };
      }
    }
    return { success: false, error: "Access Denied." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function checkPermission(requiredRoles = []) {
  const auth = authenticateUser();
  if (!auth.success) throw new Error(auth.error);
  if (requiredRoles.length > 0 && !requiredRoles.includes(auth.user.role)) {
     throw new Error("Permission Denied: Insufficient role.");
  }
  return auth.user;
}

function validateUser(requiredRoles = []) {
  return checkPermission(requiredRoles);
}

// -----------------------------------------
// Audit Service
// -----------------------------------------
function createAuditLog(module, action, recordId, oldData, newData) {
  try {
    const email = getCurrentUser();
    const ss = SpreadsheetApp.openById(getDbId());
    const logSheet = ss.getSheetByName('AUDIT_LOGS');

    logSheet.appendRow([
      Utilities.getUuid(),
      new Date(),
      email,
      module,
      action,
      recordId,
      oldData ? JSON.stringify(oldData) : "",
      newData ? JSON.stringify(newData) : ""
    ]);
  } catch(e) {
    console.error("Audit fail: " + e.toString());
  }
}

// -----------------------------------------
// Sequence Service
// -----------------------------------------
function getNextSequence(entityName) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(getDbId());
    const seqSheet = ss.getSheetByName('SEQUENCES');
    const settingsSheet = ss.getSheetByName('SETTINGS');

    const settingsData = settingsSheet.getDataRange().getValues();
    let currentFY = "26-27";
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === 'FINANCIAL_YEAR') {
        currentFY = settingsData[i][1];
        break;
      }
    }

    const seqData = seqSheet.getDataRange().getValues();
    for (let i = 1; i < seqData.length; i++) {
      if (seqData[i][0] === entityName) {
        let prefix = seqData[i][1];
        let currentValue = Number(seqData[i][2]);
        let seqFY = String(seqData[i][3]).trim();

        if (seqFY !== 'ALL' && seqFY !== currentFY) {
          currentValue = 0;
          seqFY = currentFY;
          seqSheet.getRange(i + 1, 4).setValue(seqFY);
        }

        currentValue += 1;
        seqSheet.getRange(i + 1, 3).setValue(currentValue);

        let padNum = String(currentValue).padStart(5, '0');
        return seqFY === 'ALL' ? `${prefix}-${padNum}` : `${prefix}-${seqFY}-${padNum}`;
      }
    }
    throw new Error(`Sequence config for ${entityName} not found.`);
  } finally {
    lock.releaseLock();
  }
}

// -----------------------------------------
// Master Data CRUD Framework Utilities
// -----------------------------------------
function softDeleteRecord(sheetName, idColumnName, recordId) {
  const user = validateUser();
  const ss = SpreadsheetApp.openById(getDbId());
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIdx = headers.indexOf(idColumnName);
  const isDelIdx = headers.indexOf('IsDeleted');
  const delByIdx = headers.indexOf('DeletedBy');
  const delAtIdx = headers.indexOf('DeletedDateTime');
  const activeStatusIdx = headers.indexOf('ActiveStatus') !== -1 ? headers.indexOf('ActiveStatus') : headers.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === recordId) {
      const oldData = {};
      headers.forEach((h, idx) => oldData[h] = data[i][idx]);

      const row = i + 1;
      const now = new Date();
      sheet.getRange(row, isDelIdx + 1).setValue('TRUE');
      sheet.getRange(row, delByIdx + 1).setValue(user.email);
      sheet.getRange(row, delAtIdx + 1).setValue(now);

      if (activeStatusIdx !== -1) {
         sheet.getRange(row, activeStatusIdx + 1).setValue('Inactive');
      }

      const newData = {...oldData, IsDeleted: 'TRUE', DeletedBy: user.email, DeletedDateTime: now};
      if (activeStatusIdx !== -1) newData[headers[activeStatusIdx]] = 'Inactive';

      createAuditLog(sheetName, 'Soft Delete', recordId, oldData, newData);
      return { success: true, message: "Record deleted." };
    }
  }
  return { success: false, error: "Record not found." };
}

function restoreRecord(sheetName, idColumnName, recordId) {
  const user = validateUser(['Admin']);
  const ss = SpreadsheetApp.openById(getDbId());
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIdx = headers.indexOf(idColumnName);
  const isDelIdx = headers.indexOf('IsDeleted');
  const delByIdx = headers.indexOf('DeletedBy');
  const delAtIdx = headers.indexOf('DeletedDateTime');
  const activeStatusIdx = headers.indexOf('ActiveStatus') !== -1 ? headers.indexOf('ActiveStatus') : headers.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === recordId) {
      const oldData = {};
      headers.forEach((h, idx) => oldData[h] = data[i][idx]);

      const row = i + 1;
      sheet.getRange(row, isDelIdx + 1).setValue('FALSE');
      sheet.getRange(row, delByIdx + 1).setValue('');
      sheet.getRange(row, delAtIdx + 1).setValue('');

      if (activeStatusIdx !== -1) {
         sheet.getRange(row, activeStatusIdx + 1).setValue('Active');
      }

      const newData = {...oldData, IsDeleted: 'FALSE', DeletedBy: '', DeletedDateTime: ''};
      if (activeStatusIdx !== -1) newData[headers[activeStatusIdx]] = 'Active';

      createAuditLog(sheetName, 'Restore', recordId, oldData, newData);
      return { success: true, message: "Record restored." };
    }
  }
  return { success: false, error: "Record not found." };
}

function getMasterData(sheetName) {
  const auth = validateUser();
  const ss = SpreadsheetApp.openById(getDbId());
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let records = [];

  const isDelIdx = headers.indexOf('IsDeleted');

  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (String(row[isDelIdx]).trim().toUpperCase() !== 'TRUE') {
      let obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx];
      });
      records.push(obj);
    }
  }
  return { success: true, data: records };
}

function saveMasterData(sheetName, recordObj, idColumnName) {
  const user = validateUser();
  const ss = SpreadsheetApp.openById(getDbId());
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idIdx = headers.indexOf(idColumnName);
  const recordId = recordObj[idColumnName];

  if (recordId) {
    // Edit Mode
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === recordId) {
        const oldData = {};
        headers.forEach((h, idx) => oldData[h] = data[i][idx]);

        recordObj['UpdatedBy'] = user.email;
        recordObj['UpdatedDateTime'] = new Date();
        recordObj['CreatedBy'] = oldData['CreatedBy'];
        recordObj['CreatedDateTime'] = oldData['CreatedDateTime'];

        let rowArr = [];
        headers.forEach(h => rowArr.push(recordObj[h] !== undefined ? recordObj[h] : oldData[h]));

        sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowArr]);
        createAuditLog(sheetName, 'Update', recordId, oldData, recordObj);

        return { success: true, message: "Record updated." };
      }
    }
  } else {
    // Create Mode
    const newId = getNextSequence(sheetName);
    recordObj[idColumnName] = newId;
    recordObj['CreatedBy'] = user.email;
    recordObj['CreatedDateTime'] = new Date();
    recordObj['IsDeleted'] = 'FALSE';

    let rowArr = [];
    headers.forEach(h => rowArr.push(recordObj[h] !== undefined ? recordObj[h] : ""));

    sheet.appendRow(rowArr);
    createAuditLog(sheetName, 'Create', newId, null, recordObj);
    return { success: true, message: "Record created." };
  }
}

// -----------------------------------------
// Inventory Service Skeleton
// -----------------------------------------
function createLedgerEntry(transData) {
  const user = validateUser();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
     const ss = SpreadsheetApp.openById(getDbId());
     const ledger = ss.getSheetByName('STOCK_LEDGER');
     const inv = ss.getSheetByName('INVENTORY');

     // 1. Write to Ledger
     // Schema: ['Trans_ID', 'Trans_Type', 'DateTime', 'Ref_Number', 'Item_Code', 'Loc_Code', 'Batch_No', 'Lot_No', 'Container_No', 'Qty_In', 'Qty_Out', 'Running_Balance', 'User', 'Remarks']
     const transId = Utilities.getUuid();
     const now = new Date();

     // Note: Running Balance calculation logic goes here by querying latest ledger entry for this Item/Loc combo.
     let runBal = 0; // Stub

     ledger.appendRow([
        transId, transData.Trans_Type, now, transData.Ref_Number, transData.Item_Code, transData.Loc_Code,
        transData.Batch_No, transData.Lot_No, transData.Container_No, transData.Qty_In, transData.Qty_Out,
        runBal, user.email, transData.Remarks
     ]);

     // 2. Update Materialized Inventory View
     updateInventoryView(inv, transData);

     return { success: true, transId: transId };

  } finally {
     lock.releaseLock();
  }
}

function updateInventoryView(invSheet, transData) {
    const data = invSheet.getDataRange().getValues();
    const headers = data[0];

    const itemIdx = headers.indexOf('Item_Code');
    const locIdx = headers.indexOf('Loc_Code');
    const batchIdx = headers.indexOf('Batch_No');
    const lotIdx = headers.indexOf('Lot_No');
    const contIdx = headers.indexOf('Container_No');

    const physIdx = headers.indexOf('Physical_Stock');
    const resIdx = headers.indexOf('Reserved_Stock');
    const availIdx = headers.indexOf('Available_Stock');

    let rowToUpdate = -1;
    let phys = 0;
    let res = 0;

    for (let i = 1; i < data.length; i++) {
        if (data[i][itemIdx] === transData.Item_Code && data[i][locIdx] === transData.Loc_Code) {
            let matchBatch = (!transData.Batch_No || data[i][batchIdx] === transData.Batch_No);
            let matchLot = (!transData.Lot_No || data[i][lotIdx] === transData.Lot_No);
            let matchCont = (!transData.Container_No || data[i][contIdx] === transData.Container_No);

            if (matchBatch && matchLot && matchCont) {
                rowToUpdate = i + 1;
                phys = parseFloat(data[i][physIdx]) || 0;
                res = parseFloat(data[i][resIdx]) || 0;
                break;
            }
        }
    }

    // Process In/Out purely based on the ledger columns, regardless of specific Trans_Type string.
    // PO, TRANSFER_IN, ADJUSTMENT_IN, and Reversals that add stock use Qty_In against Physical.
    // DISPATCH, TRANSFER_OUT, ADJUSTMENT_OUT, and Reversals that deduct stock use Qty_Out against Physical.
    // Reservations use Qty_Out against Reserved, Releases use Qty_In against Reserved.

    if (transData.Trans_Type === 'SO_RESERVE') {
        res += parseFloat(transData.Qty_Out);
    } else if (transData.Trans_Type === 'SO_RELEASE') {
        res -= parseFloat(transData.Qty_In);
    } else if (transData.Trans_Type.includes('SO_RESERVE_CANCEL')) {
        res -= parseFloat(transData.Qty_In); // Reversal swapped the out to in
    } else if (transData.Trans_Type.includes('SO_RELEASE_CANCEL')) {
        res += parseFloat(transData.Qty_Out); // Reversal swapped the in to out
    } else {
        // Physical stock impacts
        phys += parseFloat(transData.Qty_In);
        phys -= parseFloat(transData.Qty_Out);
    }

    let avail = phys - res;

    if (rowToUpdate !== -1) {
        invSheet.getRange(rowToUpdate, physIdx + 1).setValue(phys);
        invSheet.getRange(rowToUpdate, resIdx + 1).setValue(res);
        invSheet.getRange(rowToUpdate, availIdx + 1).setValue(avail);
    } else {
        let newRow = Array(headers.length).fill("");
        newRow[itemIdx] = transData.Item_Code;
        newRow[locIdx] = transData.Loc_Code;
        newRow[batchIdx] = transData.Batch_No || "";
        newRow[lotIdx] = transData.Lot_No || "";
        newRow[contIdx] = transData.Container_No || "";
        newRow[physIdx] = phys;
        newRow[resIdx] = res;
        newRow[availIdx] = avail;

        invSheet.appendRow(newRow);
    }
}


// -----------------------------------------
// Phase 3: Transaction Framework & Validation Engine
// -----------------------------------------

/**
 * Validates stock availability for an Item at a specific Location.
 */
function validateStockAvailability(itemCode, locCode, requiredQty) {
    const ss = SpreadsheetApp.openById(getDbId());
    const invSheet = ss.getSheetByName('INVENTORY');
    const data = invSheet.getDataRange().getValues();
    const headers = data[0];

    const itemIdx = headers.indexOf('Item_Code');
    const locIdx = headers.indexOf('Loc_Code');
    const availIdx = headers.indexOf('Available_Stock');

    let available = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i][itemIdx] === itemCode && data[i][locIdx] === locCode) {
            available += parseFloat(data[i][availIdx]) || 0;
        }
    }

    if (requiredQty > available) {
        throw new Error(`Insufficient stock. Required: ${requiredQty}, Available: ${available} for Item: ${itemCode} at Location: ${locCode}`);
    }
    return true;
}

/**
 * Rebuilds INVENTORY Materialized View completely from STOCK_LEDGER.
 * Mandatory ERP Rule.
 */
function rebuildInventory() {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); // Wait up to 30s for full rebuild
    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const ledgerSheet = ss.getSheetByName('STOCK_LEDGER');
        const invSheet = ss.getSheetByName('INVENTORY');

        const lData = ledgerSheet.getDataRange().getValues();
        const lHeaders = lData[0];

        const typeIdx = lHeaders.indexOf('Trans_Type');
        const itemIdx = lHeaders.indexOf('Item_Code');
        const locIdx = lHeaders.indexOf('Loc_Code');
        const inIdx = lHeaders.indexOf('Qty_In');
        const outIdx = lHeaders.indexOf('Qty_Out');

        // Stock Accumulator Map
        // Map Key: ItemCode_LocCode
        let stockMap = {};

        for (let i = 1; i < lData.length; i++) {
            let row = lData[i];
            let item = row[itemIdx];
            let loc = row[locIdx];
            let type = row[typeIdx]; // 'PO', 'SO_RESERVE', 'SO_RELEASE', 'DISPATCH', 'TRANSFER_IN', 'TRANSFER_OUT', etc.
            let qIn = parseFloat(row[inIdx]) || 0;
            let qOut = parseFloat(row[outIdx]) || 0;

            let key = item + "_" + loc;
            if (!stockMap[key]) {
                stockMap[key] = { physical: 0, reserved: 0 };
            }

            if (type === 'PO' || type === 'TRANSFER_IN' || type === 'ADJUSTMENT_IN' || type === 'DISPATCH_CANCEL') {
                stockMap[key].physical += qIn;
            } else if (type === 'DISPATCH' || type === 'TRANSFER_OUT' || type === 'ADJUSTMENT_OUT') {
                stockMap[key].physical -= qOut;
            } else if (type === 'SO_RESERVE') {
                stockMap[key].reserved += qOut; // Qty_Out represents reservation amount
            } else if (type === 'SO_RELEASE') {
                stockMap[key].reserved -= qIn; // Qty_In represents releasing the reservation amount
            }
        }

        // Write back to INVENTORY
        const invHeaders = invSheet.getRange(1, 1, 1, invSheet.getLastColumn()).getValues()[0];
        if (invSheet.getLastRow() > 1) {
            invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn()).clearContent();
        }

        let invOutput = [];
        for (let key in stockMap) {
            let parts = key.split("_");
            let item = parts[0];
            let loc = parts[1];
            let phys = stockMap[key].physical;
            let res = stockMap[key].reserved;
            let avail = phys - res;

            let rowArr = Array(invHeaders.length).fill("");
            rowArr[invHeaders.indexOf('Item_Code')] = item;
            rowArr[invHeaders.indexOf('Loc_Code')] = loc;
            rowArr[invHeaders.indexOf('Physical_Stock')] = phys;
            rowArr[invHeaders.indexOf('Reserved_Stock')] = res;
            rowArr[invHeaders.indexOf('Available_Stock')] = avail;
            invOutput.push(rowArr);
        }

        if (invOutput.length > 0) {
            invSheet.getRange(2, 1, invOutput.length, invOutput[0].length).setValues(invOutput);
        }
        return { success: true, message: "Inventory successfully rebuilt from Ledger." };
    } catch(e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Common Document Approval Engine Logic
 * Approves a document and fires off ledger creation.
 */
function approveDocument(sheetName, idColName, recordId, docType) {
    const auth = validateUser();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const headerSheet = ss.getSheetByName(sheetName);
        const data = headerSheet.getDataRange().getValues();
        const headers = data[0];

        const idIdx = headers.indexOf(idColName);
        const statusIdx = headers.indexOf('Status');

        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === recordId) {
                if (data[i][statusIdx] === 'Approved') throw new Error("Document is already approved.");

                // Set Header to Approved
                headerSheet.getRange(i+1, statusIdx+1).setValue('Approved');
                // Assume logic here also fills out L1/Final ApprovedBy depending on the workflow matrix

                // Fetch line items and push to ledger
                processLedgerImpactForApproval(docType, recordId);

                createAuditLog(sheetName, 'Approve', recordId, {Status: data[i][statusIdx]}, {Status: 'Approved'});

                // Immediately rebuild inventory to guarantee consistency
                // rebuildInventory();

                return { success: true, message: "Document Approved and Inventory Updated." };
            }
        }
        throw new Error("Record not found.");
    } finally {
        lock.releaseLock();
    }
}

/**
 * Routing logic for Ledger Impact based on docType
 */
function processLedgerImpactForApproval(docType, recordId) {
    const ss = SpreadsheetApp.openById(getDbId());

    if (docType === 'PO') {
        const lines = fetchLines('PURCHASE_ORDER_ITEMS', 'PO_Number', recordId);
        lines.forEach(line => {
            createLedgerEntry({
                Trans_Type: 'PO', Ref_Number: recordId, Item_Code: line.Item_Code, Loc_Code: line.Loc_Code,
                Batch_No: line.Batch_No, Lot_No: line.Lot_No, Container_No: line.Container_No,
                Qty_In: line.Qty, Qty_Out: 0, Remarks: 'PO Approved'
            });
        });
    }
    else if (docType === 'SO') {
        const lines = fetchLines('SALES_ORDER_ITEMS', 'SO_Number', recordId);
        // Requirement 3: SO Approval must reserve stock.
        // Location is needed, looking at schema it doesn't have Loc_Code on lines, but requirement says "Warehouse A = 50 MT".
        // Assuming Loc_Code on SO items will be added or is required to know where to reserve.
        // For now, if no Loc_Code, fallback to default. We will use a dynamically fetched Loc_Code if present.
        lines.forEach(line => {
            const loc = line.Loc_Code || 'WH-DEFAULT';
            validateStockAvailability(line.Item_Code, loc, line.Qty);
            createLedgerEntry({
                Trans_Type: 'SO_RESERVE', Ref_Number: recordId, Item_Code: line.Item_Code, Loc_Code: loc,
                Batch_No: line.Batch_No, Lot_No: line.Lot_No, Container_No: line.Container_No,
                Qty_In: 0, Qty_Out: line.Qty, Remarks: 'SO Approved Reservation'
            });
        });
    }
}

function fetchLines(sheetName, foreignKeyCol, foreignKeyValue) {
    const ss = SpreadsheetApp.openById(getDbId());
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const fkIdx = headers.indexOf(foreignKeyCol);
    const isDelIdx = headers.indexOf('IsDeleted');

    let lines = [];
    for (let i=1; i<data.length; i++) {
        if (data[i][fkIdx] === foreignKeyValue && String(data[i][isDelIdx]).trim().toUpperCase() !== 'TRUE') {
            let obj = {};
            headers.forEach((h, idx) => obj[h] = data[i][idx]);
            lines.push(obj);
        }
    }
    return lines;
}

// -----------------------------------------
// Phase 3: Transaction Modules - Dispatch & Internal Transfers
// -----------------------------------------

/**
 * Handles Dispatch Creation and Ledger Impact.
 * Dispatches must originate from an Approved SO and process partial dispatches correctly.
 */
function processDispatch(dispatchData, dispatchLines) {
    const auth = validateUser();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const headerSheet = ss.getSheetByName('DISPATCH');
        const linesSheet = ss.getSheetByName('DISPATCH_ITEMS');
        const soLinesSheet = ss.getSheetByName('SALES_ORDER_ITEMS');

        const dispatchNo = getNextSequence('DISPATCH');
        const now = new Date();

        const headerHeaders = headerSheet.getRange(1, 1, 1, headerSheet.getLastColumn()).getValues()[0];
        let hRow = Array(headerHeaders.length).fill("");
        hRow[headerHeaders.indexOf('RecordID')] = Utilities.getUuid();
        hRow[headerHeaders.indexOf('Dispatch_Number')] = dispatchNo;
        hRow[headerHeaders.indexOf('Date')] = dispatchData.Date || now;
        hRow[headerHeaders.indexOf('SO_Number')] = dispatchData.SO_Number;
        hRow[headerHeaders.indexOf('Customer_Code')] = dispatchData.Customer_Code;
        hRow[headerHeaders.indexOf('Vehicle_No')] = dispatchData.Vehicle_No;
        hRow[headerHeaders.indexOf('LR_No')] = dispatchData.LR_No;
        hRow[headerHeaders.indexOf('Remarks')] = dispatchData.Remarks;
        hRow[headerHeaders.indexOf('Status')] = 'Approved';
        hRow[headerHeaders.indexOf('CreatedBy')] = auth.email;
        hRow[headerHeaders.indexOf('CreatedDateTime')] = now;
        hRow[headerHeaders.indexOf('IsDeleted')] = 'FALSE';
        headerSheet.appendRow(hRow);

        const lineHeaders = linesSheet.getRange(1, 1, 1, linesSheet.getLastColumn()).getValues()[0];

        dispatchLines.forEach(line => {
            const loc = line.Loc_Code;
            let lRow = Array(lineHeaders.length).fill("");
            lRow[lineHeaders.indexOf('RecordID')] = Utilities.getUuid();
            lRow[lineHeaders.indexOf('Dispatch_Number')] = dispatchNo;
            lRow[lineHeaders.indexOf('Item_Code')] = line.Item_Code;
            lRow[lineHeaders.indexOf('Loc_Code')] = loc;
            lRow[lineHeaders.indexOf('Dispatch_Qty')] = line.Dispatch_Qty;
            lRow[lineHeaders.indexOf('CreatedBy')] = auth.email;
            lRow[lineHeaders.indexOf('CreatedDateTime')] = now;
            lRow[lineHeaders.indexOf('IsDeleted')] = 'FALSE';
            linesSheet.appendRow(lRow);

            createLedgerEntry({
                Trans_Type: 'SO_RELEASE', Ref_Number: dispatchNo, Item_Code: line.Item_Code, Loc_Code: loc,
                Qty_In: line.Dispatch_Qty, Qty_Out: 0, Remarks: `Release Reserve for SO: ${dispatchData.SO_Number}`
            });

            createLedgerEntry({
                Trans_Type: 'DISPATCH', Ref_Number: dispatchNo, Item_Code: line.Item_Code, Loc_Code: loc,
                Qty_In: 0, Qty_Out: line.Dispatch_Qty, Remarks: `Dispatch for SO: ${dispatchData.SO_Number}`
            });

            updateSOLineDispatchedQty(soLinesSheet, dispatchData.SO_Number, line.Item_Code, line.Dispatch_Qty);
        });

        updateSOHeaderStatus(dispatchData.SO_Number);

        // rebuildInventory(); // Sync view

        return { success: true, dispatchNo: dispatchNo, message: "Dispatch successful." };

    } finally {
        lock.releaseLock();
    }
}

/**
 * Updates SO Line with newly dispatched qty
 */
function updateSOLineDispatchedQty(soLinesSheet, soNo, itemCode, dispatchedQty) {
    const data = soLinesSheet.getDataRange().getValues();
    const headers = data[0];
    const soIdx = headers.indexOf('SO_Number');
    const itIdx = headers.indexOf('Item_Code');
    const dqIdx = headers.indexOf('Dispatched_Qty');

    for (let i = 1; i < data.length; i++) {
        if (data[i][soIdx] === soNo && data[i][itIdx] === itemCode) {
            let current = parseFloat(data[i][dqIdx]) || 0;
            soLinesSheet.getRange(i+1, dqIdx+1).setValue(current + parseFloat(dispatchedQty));
            break;
        }
    }
}

/**
 * Evaluates SO lines to check if Fully Dispatched and updates Header
 */
function updateSOHeaderStatus(soNo) {
    const ss = SpreadsheetApp.openById(getDbId());
    const soLinesSheet = ss.getSheetByName('SALES_ORDER_ITEMS');
    const soHeaderSheet = ss.getSheetByName('SALES_ORDERS');

    const lData = soLinesSheet.getDataRange().getValues();
    const lHeaders = lData[0];
    const soIdx = lHeaders.indexOf('SO_Number');
    const qIdx = lHeaders.indexOf('Qty');
    const dqIdx = lHeaders.indexOf('Dispatched_Qty');

    let totalOrdered = 0;
    let totalDispatched = 0;

    for (let i = 1; i < lData.length; i++) {
        if (lData[i][soIdx] === soNo) {
            totalOrdered += parseFloat(lData[i][qIdx]) || 0;
            totalDispatched += parseFloat(lData[i][dqIdx]) || 0;
        }
    }

    let newStatus = (totalDispatched >= totalOrdered) ? 'Completed' : 'Partially Dispatched';

    const hData = soHeaderSheet.getDataRange().getValues();
    const hHeaders = hData[0];
    const hSoIdx = hHeaders.indexOf('SO_Number');
    const sIdx = hHeaders.indexOf('Status');

    for (let i = 1; i < hData.length; i++) {
        if (hData[i][hSoIdx] === soNo) {
            if (hData[i][sIdx] !== 'Completed') {
               soHeaderSheet.getRange(i+1, sIdx+1).setValue(newStatus);
            }
            break;
        }
    }
}

/**
 * Handles Internal Transfer Dual Ledger Entries
 */
function processInternalTransfer(transferData, transferLines) {
    const auth = validateUser();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const headerSheet = ss.getSheetByName('INTERNAL_TRANSFERS');
        const linesSheet = ss.getSheetByName('INTERNAL_TRANSFER_ITEMS');

        const transferNo = getNextSequence('INTERNAL_TRANSFERS');
        const now = new Date();

        const hHeaders = headerSheet.getRange(1, 1, 1, headerSheet.getLastColumn()).getValues()[0];
        let hRow = Array(hHeaders.length).fill("");
        hRow[hHeaders.indexOf('RecordID')] = Utilities.getUuid();
        hRow[hHeaders.indexOf('Transfer_Number')] = transferNo;
        hRow[hHeaders.indexOf('Date')] = transferData.Date || now;
        hRow[hHeaders.indexOf('From_Loc')] = transferData.From_Loc;
        hRow[hHeaders.indexOf('To_Loc')] = transferData.To_Loc;
        hRow[hHeaders.indexOf('Status')] = 'Approved';
        hRow[hHeaders.indexOf('CreatedBy')] = auth.email;
        hRow[hHeaders.indexOf('CreatedDateTime')] = now;
        hRow[hHeaders.indexOf('IsDeleted')] = 'FALSE';
        headerSheet.appendRow(hRow);

        const lHeaders = linesSheet.getRange(1, 1, 1, linesSheet.getLastColumn()).getValues()[0];

        transferLines.forEach(line => {
            validateStockAvailability(line.Item_Code, transferData.From_Loc, line.Qty);

            let lRow = Array(lHeaders.length).fill("");
            lRow[lHeaders.indexOf('RecordID')] = Utilities.getUuid();
            lRow[lHeaders.indexOf('Transfer_Number')] = transferNo;
            lRow[lHeaders.indexOf('Item_Code')] = line.Item_Code;
            lRow[lHeaders.indexOf('Qty')] = line.Qty;
            lRow[lHeaders.indexOf('Batch_No')] = line.Batch_No || "";
            lRow[lHeaders.indexOf('Lot_No')] = line.Lot_No || "";
            lRow[lHeaders.indexOf('Container_No')] = line.Container_No || "";
            lRow[lHeaders.indexOf('Serial_No')] = line.Serial_No || "";
            lRow[lHeaders.indexOf('CreatedBy')] = auth.email;
            lRow[lHeaders.indexOf('CreatedDateTime')] = now;
            lRow[lHeaders.indexOf('IsDeleted')] = 'FALSE';
            linesSheet.appendRow(lRow);

            createLedgerEntry({
                Trans_Type: 'TRANSFER_OUT', Ref_Number: transferNo, Item_Code: line.Item_Code, Loc_Code: transferData.From_Loc,
                Qty_In: 0, Qty_Out: line.Qty, Remarks: `Transfer to ${transferData.To_Loc}`
            });

            createLedgerEntry({
                Trans_Type: 'TRANSFER_IN', Ref_Number: transferNo, Item_Code: line.Item_Code, Loc_Code: transferData.To_Loc,
                Qty_In: line.Qty, Qty_Out: 0, Remarks: `Transfer from ${transferData.From_Loc}`
            });
        });

        // rebuildInventory(); // Sync view handled by ledger

        return { success: true, transferNo: transferNo, message: "Internal Transfer successful." };
    } finally {
        lock.releaseLock();
    }
}


// -----------------------------------------
// Phase 3: Transaction Reversal Framework
// -----------------------------------------

/**
 * Common Reversal Framework.
 * Creates opposite ledger entries to negate previous impacts without mutating historical records.
 */
function reverseTransaction(docType, recordId, reason) {
    const auth = validateUser(['Admin', 'Manager']); // Reversals require privilege
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const ledgerSheet = ss.getSheetByName('STOCK_LEDGER');

        const lData = ledgerSheet.getDataRange().getValues();
        const headers = lData[0];

        const typeIdx = headers.indexOf('Trans_Type');
        const refIdx = headers.indexOf('Ref_Number');
        const itemIdx = headers.indexOf('Item_Code');
        const locIdx = headers.indexOf('Loc_Code');
        const batchIdx = headers.indexOf('Batch_No');
        const inIdx = headers.indexOf('Qty_In');
        const outIdx = headers.indexOf('Qty_Out');

        // Find all ledger entries related to this Ref_Number
        let entriesToReverse = [];
        for (let i=1; i<lData.length; i++) {
            if (lData[i][refIdx] === recordId) {
                entriesToReverse.push({
                    Trans_Type: lData[i][typeIdx],
                    Item_Code: lData[i][itemIdx],
                    Loc_Code: lData[i][locIdx],
                    Batch_No: lData[i][batchIdx],
                    Qty_In: parseFloat(lData[i][inIdx]) || 0,
                    Qty_Out: parseFloat(lData[i][outIdx]) || 0
                });
            }
        }

        if (entriesToReverse.length === 0) throw new Error("No ledger entries found for this reference.");

        // Create Reversal Entries
        entriesToReverse.forEach(e => {
            // Reversal logic: Swap Qty_In and Qty_Out, tag type as _CANCEL
            createLedgerEntry({
                Trans_Type: e.Trans_Type + '_CANCEL',
                Ref_Number: recordId,
                Item_Code: e.Item_Code,
                Loc_Code: e.Loc_Code,
                Batch_No: e.Batch_No,
                Qty_In: e.Qty_Out,   // Reverse the Out
                Qty_Out: e.Qty_In,   // Reverse the In
                Remarks: `Reversal: ${reason}`
            });
        });

        // Also update Header Status to 'Cancelled' (Generic Logic)
        let headerSheetName = "";
        if (docType === 'DISPATCH') headerSheetName = 'DISPATCH';
        else if (docType === 'TRANSFER') headerSheetName = 'INTERNAL_TRANSFERS';
        // etc...

        if (headerSheetName !== "") {
           const hSheet = ss.getSheetByName(headerSheetName);
           const hData = hSheet.getDataRange().getValues();
           const idCol = (docType === 'DISPATCH') ? 'Dispatch_Number' : 'Transfer_Number'; // Generic fallback logic needed depending on schema

           for(let i=1; i<hData.length; i++){
               if(hData[i][hData[0].indexOf(idCol)] === recordId){
                   hSheet.getRange(i+1, hData[0].indexOf('Status')+1).setValue('Cancelled');
                   createAuditLog(headerSheetName, 'Cancel', recordId, {Status: 'Approved'}, {Status: 'Cancelled', Reason: reason});
                   break;
               }
           }
        }

        // // rebuildInventory(); // Sync view

        return { success: true, message: `Transaction ${recordId} successfully reversed.` };

    } finally {
        lock.releaseLock();
    }
}

// -----------------------------------------
// Phase 4: Dashboard & Reports Integration
// -----------------------------------------

/**
 * Fetches Dashboard KPIs efficiently using the cached INVENTORY view
 * and iterating quickly over open documents.
 */
function getDashboardKPIs() {
    const auth = validateUser();

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const invSheet = ss.getSheetByName('INVENTORY');
        const poSheet = ss.getSheetByName('PURCHASE_ORDERS');
        const soSheet = ss.getSheetByName('SALES_ORDERS');
        const dispSheet = ss.getSheetByName('DISPATCH');
        const locSheet = ss.getSheetByName('LOCATIONS');

        // 1. Inventory KPIs
        const invData = invSheet.getDataRange().getValues();
        let totalPhys = 0;
        let totalRes = 0;
        let totalAvail = 0;

        const physIdx = invData[0].indexOf('Physical_Stock');
        const resIdx = invData[0].indexOf('Reserved_Stock');
        const availIdx = invData[0].indexOf('Available_Stock');

        for (let i = 1; i < invData.length; i++) {
            totalPhys += parseFloat(invData[i][physIdx]) || 0;
            totalRes += parseFloat(invData[i][resIdx]) || 0;
            totalAvail += parseFloat(invData[i][availIdx]) || 0;
        }

        // 2. Pending Orders KPIs
        let pendingPOs = 0;
        const poData = poSheet.getDataRange().getValues();
        const poStatusIdx = poData[0].indexOf('Status');
        const poDelIdx = poData[0].indexOf('IsDeleted');
        for (let i = 1; i < poData.length; i++) {
            if (poData[i][poStatusIdx] === 'Approved' && String(poData[i][poDelIdx]).trim().toUpperCase() !== 'TRUE') {
                pendingPOs++; // Very simplistic 'Pending' PO count logic. Usually requires line item GRN check.
            }
        }

        let pendingSOs = 0;
        const soData = soSheet.getDataRange().getValues();
        const soStatusIdx = soData[0].indexOf('Status');
        const soDelIdx = soData[0].indexOf('IsDeleted');
        for (let i = 1; i < soData.length; i++) {
            if ((soData[i][soStatusIdx] === 'Approved' || soData[i][soStatusIdx] === 'Partially Dispatched') &&
                 String(soData[i][soDelIdx]).trim().toUpperCase() !== 'TRUE') {
                pendingSOs++;
            }
        }

        // 3. Dispatch Today KPI
        let dispToday = 0;
        const dispData = dispSheet.getDataRange().getValues();
        const dispDateIdx = dispData[0].indexOf('Date');
        const dispDelIdx = dispData[0].indexOf('IsDeleted');

        const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        for (let i = 1; i < dispData.length; i++) {
            if (String(dispData[i][dispDelIdx]).trim().toUpperCase() !== 'TRUE') {
                let dDate = new Date(dispData[i][dispDateIdx]);
                if (!isNaN(dDate.getTime())) {
                    let dStr = Utilities.formatDate(dDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
                    if (dStr === todayStr) dispToday++;
                }
            }
        }

        return {
            success: true,
            kpis: {
                totalPhysical: Number(totalPhys.toFixed(2)),
                totalReserved: Number(totalRes.toFixed(2)),
                totalAvailable: Number(totalAvail.toFixed(2)),
                pendingPOs: pendingPOs,
                pendingSOs: pendingSOs,
                dispatchToday: dispToday
            }
        };

    } catch(e) {
        return { success: false, error: e.toString() };
    }
}

/**
 * Universal Reporting Query Builder Engine
 * Avoids hardcoding individual report endpoints. Filters server-side for speed.
 */
function getReportData(reportType, filters) {
    const auth = validateUser();

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        let sheetName = "";

        switch(reportType) {
            case 'INVENTORY_REPORT': sheetName = 'INVENTORY'; break;
            case 'STOCK_LEDGER_REPORT': sheetName = 'STOCK_LEDGER'; break;
            case 'PO_REPORT': sheetName = 'PURCHASE_ORDER_ITEMS'; break;
            case 'SO_REPORT': sheetName = 'SALES_ORDER_ITEMS'; break;
            case 'DISPATCH_REPORT': sheetName = 'DISPATCH_ITEMS'; break;
            default: throw new Error("Invalid Report Type");
        }

        const sheet = ss.getSheetByName(sheetName);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        let reportSet = [];

        const isDelIdx = headers.indexOf('IsDeleted');
        const itemIdx = headers.indexOf('Item_Code');
        const locIdx = headers.indexOf('Loc_Code');
        const dateIdx = headers.indexOf('DateTime'); // Varies by sheet, handle generic fallback

        for (let i = 1; i < data.length; i++) {
            let row = data[i];

            // Core Soft Delete Check
            if (isDelIdx !== -1 && String(row[isDelIdx]).trim().toUpperCase() === 'TRUE') continue;

            // Dynamic Filtering Block
            let passFilters = true;

            if (filters.itemCode && itemIdx !== -1 && row[itemIdx] !== filters.itemCode) passFilters = false;
            if (filters.locCode && locIdx !== -1 && row[locIdx] !== filters.locCode) passFilters = false;

            // Date Range Filtering
            if (filters.startDate && filters.endDate) {
                // Determine which column holds the date
                let rowDateCol = headers.indexOf('Date') !== -1 ? headers.indexOf('Date') : headers.indexOf('DateTime');
                if (rowDateCol !== -1) {
                    let rDate = new Date(row[rowDateCol]);
                    if (!isNaN(rDate.getTime())) {
                        let rStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
                        if (rStr < filters.startDate || rStr > filters.endDate) passFilters = false;
                    }
                }
            }

            if (passFilters) {
                let obj = {};
                headers.forEach((h, idx) => obj[h] = row[idx]);
                reportSet.push(obj);
            }
        }

        return { success: true, data: reportSet };

    } catch(e) {
        return { success: false, error: e.toString() };
    }
}

// -----------------------------------------
// Phase 5: Caching & Optimization Hardening
// -----------------------------------------

/**
 * Advanced Batch Update Wrapper for heavy row inserts.
 * Prevents Apps Script timeout limits by pushing data in 2D arrays natively.
 */
function batchInsertRecords(sheetName, dataMatrix) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); // Higher wait for batch operations

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const sheet = ss.getSheetByName(sheetName);
        if (dataMatrix && dataMatrix.length > 0) {
            const startRow = sheet.getLastRow() + 1;
            const numRows = dataMatrix.length;
            const numCols = dataMatrix[0].length;

            sheet.getRange(startRow, 1, numRows, numCols).setValues(dataMatrix);
            return { success: true, count: numRows };
        }
        return { success: true, count: 0 };
    } catch(e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

// -----------------------------------------
// Phase 5: Admin Utilities & Recovery Tools
// -----------------------------------------

/**
 * Recalculates the Running Balance for all entries in the STOCK_LEDGER.
 * Admin-only utility for recovery scenarios.
 */
function recalculateRunningBalance() {
    validateUser(['Admin']);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());
        const ledgerSheet = ss.getSheetByName('STOCK_LEDGER');
        const data = ledgerSheet.getDataRange().getValues();
        const headers = data[0];

        const itemIdx = headers.indexOf('Item_Code');
        const locIdx = headers.indexOf('Loc_Code');
        const inIdx = headers.indexOf('Qty_In');
        const outIdx = headers.indexOf('Qty_Out');
        const balIdx = headers.indexOf('Running_Balance');

        // Ensure standard time-series sort for calculation if necessary (skipped here assuming natural insertion order is accurate)

        let runMap = {};
        let updateBatch = [];

        for (let i = 1; i < data.length; i++) {
            let item = data[i][itemIdx];
            let loc = data[i][locIdx];
            let qIn = parseFloat(data[i][inIdx]) || 0;
            let qOut = parseFloat(data[i][outIdx]) || 0;

            let key = item + "_" + loc;
            if (runMap[key] === undefined) runMap[key] = 0;

            runMap[key] = runMap[key] + qIn - qOut;
            updateBatch.push([runMap[key]]);
        }

        if (updateBatch.length > 0) {
            ledgerSheet.getRange(2, balIdx + 1, updateBatch.length, 1).setValues(updateBatch);
        }

        return { success: true, message: "Running Balances recalculated successfully." };
    } catch (e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}

/**
 * Triggers full Inventory rebuild from the frontend.
 */
function triggerInventoryRebuild() {
    validateUser(['Admin']);
    return rebuildInventory();
}

// -----------------------------------------
// Phase 5: Automated Backup Architecture
// -----------------------------------------

/**
 * Creates a physical duplicate of the entire Master Spreadsheet database
 * every night to guarantee long-term data security against catastrophic loss.
 */
function dailyDatabaseBackup() {
    // Only triggers via time-driven event or Admin manually.
    try {
        const dbId = getDbId();
        const ss = SpreadsheetApp.openById(dbId);

        const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
        const backupName = `IMS_Enterprise_Backup_${todayStr}`;

        // This copies the entire file, all sheets, data, formulas, and formatting exactly as is.
        // It saves the backup to the same Google Drive folder the original script/sheet runs within.
        const backupFile = DriveApp.getFileById(dbId).makeCopy(backupName);

        // Log the successful backup
        createAuditLog('SYSTEM_BACKUP', 'Auto-Backup', backupFile.getId(), {}, { Name: backupName, URL: backupFile.getUrl() });

        return { success: true, message: `Backup created: ${backupName}` };

    } catch(e) {
        console.error("Daily Backup Failed: " + e.toString());
        return { success: false, error: e.toString() };
    }
}

/**
 * Setup Time-Driven Triggers for Daily Operations
 */
function setupDailyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let snapshotExists = false;
  let backupExists = false;

  for (let i = 0; i < triggers.length; i++) {
    let fn = triggers[i].getHandlerFunction();
    if (fn === 'recordDailyStockSnapshot') snapshotExists = true;
    if (fn === 'dailyDatabaseBackup') backupExists = true;
  }

  if (!snapshotExists) {
    ScriptApp.newTrigger('recordDailyStockSnapshot')
      .timeBased()
      .atHour(23)
      .nearMinute(50)
      .everyDays(1)
      .create();
  }

  if (!backupExists) {
    ScriptApp.newTrigger('dailyDatabaseBackup')
      .timeBased()
      .atHour(2) // 2 AM Daily
      .nearMinute(0)
      .everyDays(1)
      .create();
  }
}

// -----------------------------------------
// Transaction Engine API Layer
// -----------------------------------------

/**
 * Saves a Multi-line Transaction Document
 * Inserts into Header and Line Items synchronously.
 */
function saveTransactionDoc(docType, headerData, lines) {
    const auth = validateUser();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
        const ss = SpreadsheetApp.openById(getDbId());

        let headerSheetName, linesSheetName, docIdPrefix;
        if (docType === 'Purchase Orders') {
            headerSheetName = 'PURCHASE_ORDERS';
            linesSheetName = 'PURCHASE_ORDER_ITEMS';
            docIdPrefix = 'PO';
        } else if (docType === 'Sales Orders') {
            headerSheetName = 'SALES_ORDERS';
            linesSheetName = 'SALES_ORDER_ITEMS';
            docIdPrefix = 'SO';
        } else if (docType === 'Dispatch') {
            headerSheetName = 'DISPATCH';
            linesSheetName = 'DISPATCH_ITEMS';
            docIdPrefix = 'Dispatch';
        } else if (docType === 'Internal Transfers') {
            headerSheetName = 'INTERNAL_TRANSFERS';
            linesSheetName = 'INTERNAL_TRANSFER_ITEMS';
            docIdPrefix = 'Transfer';
        } else {
            throw new Error('Unsupported docType for generic save: ' + docType);
        }

        const hSheet = ss.getSheetByName(headerSheetName);
        const lSheet = ss.getSheetByName(linesSheetName);
        const docNo = getNextSequence(headerSheetName);
        const now = new Date();

        // Write Header
        const hHeaders = hSheet.getRange(1, 1, 1, hSheet.getLastColumn()).getValues()[0];
        let hRow = Array(hHeaders.length).fill("");
        hRow[hHeaders.indexOf('RecordID')] = Utilities.getUuid();
        hRow[hHeaders.indexOf(docIdPrefix + '_Number')] = docNo;
        hRow[hHeaders.indexOf('Date')] = headerData.Date || now;

        if (docType === 'Purchase Orders') {
            hRow[hHeaders.indexOf('Supplier_Code')] = headerData.Party_Code;
        } else if (docType === 'Sales Orders' || docType === 'Dispatch') {
            hRow[hHeaders.indexOf('Customer_Code')] = headerData.Party_Code;
        }

        if (docType === 'Dispatch') {
            hRow[hHeaders.indexOf('SO_Number')] = headerData.SO_Number || '';
            hRow[hHeaders.indexOf('Vehicle_No')] = headerData.Vehicle_No || '';
        } else if (docType === 'Internal Transfers') {
             hRow[hHeaders.indexOf('From_Loc')] = headerData.From_Loc || '';
             hRow[hHeaders.indexOf('To_Loc')] = headerData.To_Loc || '';
        }

        hRow[hHeaders.indexOf('Status')] = 'Pending Approval';
        hRow[hHeaders.indexOf('CreatedBy')] = auth.email;
        hRow[hHeaders.indexOf('CreatedDateTime')] = now;
        hRow[hHeaders.indexOf('IsDeleted')] = 'FALSE';
        hSheet.appendRow(hRow);

        // Write Lines
        const lHeaders = lSheet.getRange(1, 1, 1, lSheet.getLastColumn()).getValues()[0];
        let linesBatch = [];

        lines.forEach(line => {
            let lRow = Array(lHeaders.length).fill("");
            lRow[lHeaders.indexOf('RecordID')] = Utilities.getUuid();
            lRow[lHeaders.indexOf(docIdPrefix + '_Number')] = docNo;
            lRow[lHeaders.indexOf('Item_Code')] = line.Item_Code;
            lRow[lHeaders.indexOf('Loc_Code')] = line.Loc_Code || '';
            lRow[lHeaders.indexOf('Qty')] = line.Qty;

            if (docType === 'Sales Orders') {
                lRow[lHeaders.indexOf('Dispatched_Qty')] = 0;
            } else if (docType === 'Dispatch') {
                lRow[lHeaders.indexOf('Dispatch_Qty')] = line.Qty;
            }

            lRow[lHeaders.indexOf('CreatedBy')] = auth.email;
            lRow[lHeaders.indexOf('CreatedDateTime')] = now;
            lRow[lHeaders.indexOf('IsDeleted')] = 'FALSE';
            linesBatch.push(lRow);
        });

        if (linesBatch.length > 0) {
            lSheet.getRange(lSheet.getLastRow() + 1, 1, linesBatch.length, linesBatch[0].length).setValues(linesBatch);
        }

        createAuditLog(headerSheetName, 'Create', docNo, null, {headerData, lines});

        return { success: true, docNo: docNo, message: `${docType} ${docNo} created successfully.` };

    } catch(e) {
        return { success: false, error: e.toString() };
    } finally {
        lock.releaseLock();
    }
}
