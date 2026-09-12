/**

RAW MATERIAL MANAGEMENT SYSTEM (RMS) - BACKEND ENGINE */
const EXACT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EbIT8KscP2neEgYr4-ebKQyrLaOWoTbp3ajnH4UTqN0/edit';

// Sub-categories for which Color & Size fields should be shown on the form. const STRAP_SUBCATEGORIES = ['Strap without Accessories', 'Strap with Accessories'];

function doGet() { return HtmlService .createTemplateFromFile('index2') .evaluate() .setTitle("Raw Material Management System") .addMetaTag('viewport', 'width=device-width, initial-scale=1.0'); }

/**

UTILITY: Open Database Spreadsheet directly using verified URL */ function getDB() { try { return SpreadsheetApp.openByUrl(EXACT_SHEET_URL); } catch (e) { try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (err) { throw new Error("Failed to open spreadsheet: " + e.message); } } }
/**

UTILITY: Setup Database Sheets if missing */ function setupDatabase() { const ss = getDB(); let ts = ss.getSheetByName('Transactions'); let logs = ss.getSheetByName('SYSTEM_LOGS');
if (!ts) {
  ts = ss.insertSheet('Transactions');
  ts.appendRow(['Transaction ID', 'Batch ID', 'Date', 'Name', 'Transaction Type', 'Category', 'Sub Category', 'Item Name', 'RM Code', 'Color', 'Size', 'UOM', 'Quantity', 'Rate', 'Remarks', 'Timestamp', 'CreatedBy', 'IsDeleted']);
  ts.getRange('A1:R1').setFontWeight('bold').setBackground('#f3f3f3');
  ts.setFrozenRows(1);
} else {
  // Schema Migration: Add Rate column if missing
  const headers = ts.getRange(1, 1, 1, ts.getLastColumn()).getValues()[0];
  if (headers.indexOf('Rate') === -1) {
    const remarksIdx = headers.indexOf('Remarks');
    if (remarksIdx !== -1) {
      ts.insertColumnBefore(remarksIdx + 1);
      ts.getRange(1, remarksIdx + 1).setValue('Rate').setFontWeight('bold').setBackground('#f3f3f3');
    } else {
      ts.insertColumnAfter(ts.getLastColumn());
      ts.getRange(1, ts.getLastColumn() + 1).setValue('Rate').setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
}

if (!logs) { logs = ss.insertSheet('SYSTEM_LOGS'); logs.appendRow(['Timestamp', 'User', 'Module', 'Error Message', 'Stack Trace']); logs.getRange('A1:E1').setFontWeight('bold').setBackground('#f3f3f3'); logs.setFrozenRows(1); }

return "Database Setup Complete"; }

/**

UTILITY: Logging */ function logError(moduleName, errorMessage, stackTrace) { try { const ss = getDB(); const logSheet = ss.getSheetByName('SYSTEM_LOGS'); if (logSheet) { logSheet.appendRow([ new Date(), Session.getActiveUser().getEmail() || 'Unknown', moduleName, errorMessage, stackTrace || '' ]); } } catch (e) { console.error("Failed to log error: " + e.message); } }
function generateUUID() { return Utilities.getUuid(); }

/**

DATA: Read Master Data
Mapped to Master tab headers: Sku Code, Category, Sub Category, Item, color, Size, UOM, Photo Link, Opening */ function getMasterData() { const cache = CacheService.getScriptCache(); const cached = cache.get('MASTER_DATA');
if (cached) { return JSON.parse(cached); }

try { const ss = getDB(); const sheet = ss.getSheetByName('Master') || ss.getSheetByName('RM_Master'); if (!sheet) throw new Error("Could not find 'Master' tab in the spreadsheet.");

const data = sheet.getDataRange().getValues();
const headers = data[0].map(h => String(h).trim());

const findCol = (names) => {
  for (const n of names) {
    const idx = headers.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
};

const colIdx = {
  rmCode: findCol(['Sku Code', 'RM Code']),
  category: findCol(['Category']),
  subCategory: findCol(['Sub Category', 'Subcategory', 'Sub-Category']),
  itemName: findCol(['Item', 'Item Name']),
  color: findCol(['color', 'Color']),
  size: findCol(['Size']),
  uom: findCol(['UOM']),
  photoLink: findCol(['Photo Link', 'Photo', 'Image Link']),
  openStock: findCol(['Opening', 'Opening Stock']),
  minStock: findCol(['Minimum Stock']),
  status: findCol(['Status']),
  isDeleted: findCol(['IsDeleted'])
};

let categories = new Set();
let items = {};
let itemsByCategory = {};
let itemsBySubCategory = {};
let subCategoriesByCategorySet = {};

for (let i = 1; i < data.length; i++) {
  let row = data[i];
  let isDel = colIdx.isDeleted !== -1 ? row[colIdx.isDeleted] : false;
  let status = colIdx.status !== -1 ? row[colIdx.status] : 'ACTIVE';

  if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
  if (status && String(status).trim().toUpperCase() !== 'ACTIVE') continue;

  let rmCode = row[colIdx.rmCode];
  if (!rmCode) continue;

  let category = row[colIdx.category] || 'Uncategorized';
  let subCategory = colIdx.subCategory !== -1 ? (row[colIdx.subCategory] || '') : '';
  let itemName = row[colIdx.itemName] || rmCode;
  let color = colIdx.color !== -1 ? (row[colIdx.color] || '') : '';
  let size = colIdx.size !== -1 ? (row[colIdx.size] || '') : '';
  let photoLink = colIdx.photoLink !== -1 ? (row[colIdx.photoLink] || '') : '';

  let itemObj = {
    rmCode: String(rmCode).trim(),
    category: String(category).trim(),
    subCategory: String(subCategory).trim(),
    itemName: String(itemName).trim(),
    color: String(color).trim(),
    size: String(size).trim(),
    uom: String(colIdx.uom !== -1 ? row[colIdx.uom] : ''),
    photoLink: String(photoLink).trim(),
    openingStock: Number(colIdx.openStock !== -1 ? row[colIdx.openStock] : 0) || 0,
    minimumStock: Number(colIdx.minStock !== -1 ? row[colIdx.minStock] : 0) || 0
  };

  items[itemObj.rmCode] = itemObj;
  categories.add(itemObj.category);

  if (!itemsByCategory[itemObj.category]) {
    itemsByCategory[itemObj.category] = [];
  }
  itemsByCategory[itemObj.category].push(itemObj.rmCode);

  if (itemObj.subCategory) {
    if (!subCategoriesByCategorySet[itemObj.category]) {
      subCategoriesByCategorySet[itemObj.category] = new Set();
    }
    subCategoriesByCategorySet[itemObj.category].add(itemObj.subCategory);

    const subKey = itemObj.category + '||' + itemObj.subCategory;
    if (!itemsBySubCategory[subKey]) {
      itemsBySubCategory[subKey] = [];
    }
    itemsBySubCategory[subKey].push(itemObj.rmCode);
  }
}

let subCategoriesByCategory = {};
Object.keys(subCategoriesByCategorySet).forEach(cat => {
  subCategoriesByCategory[cat] = Array.from(subCategoriesByCategorySet[cat]).sort();
});

const result = {
  categories: Array.from(categories).sort(),
  subCategoriesByCategory: subCategoriesByCategory,
  items: items,
  itemsByCategory: itemsByCategory,
  itemsBySubCategory: itemsBySubCategory,
  strapSubCategories: STRAP_SUBCATEGORIES
};

try {
  cache.put('MASTER_DATA', JSON.stringify(result), 900);
} catch (cacheErr) {
  // Data too large for CacheService (100KB limit) - skip caching, still return data.
  console.error('Master data too large to cache, skipping cache: ' + cacheErr.message);
}
return result;
} catch (e) { logError('getMasterData', e.message, e.stack); throw new Error("Failed to load master data: " + e.message); } }

function clearCache() { CacheService.getScriptCache().remove('MASTER_DATA'); return "Cache cleared successfully."; }

function _calculateStockInternal(rmCodes, asOfDate = null) { const masterData = getMasterData(); const ss = getDB(); const txSheet = ss.getSheetByName('Transactions'); if (!txSheet) return _initializeStockMap(rmCodes, masterData);

const txData = txSheet.getDataRange().getValues(); if (txData.length <= 1) return _initializeStockMap(rmCodes, masterData);

const txHeaders = txData[0]; const idx = { rmCode: txHeaders.indexOf('RM Code'), type: txHeaders.indexOf('Transaction Type'), qty: txHeaders.indexOf('Quantity'), date: txHeaders.indexOf('Date'), isDeleted: txHeaders.indexOf('IsDeleted') };

let stockMap = _initializeStockMap(rmCodes, masterData);

let targetTime = null; if (asOfDate) { let t = new Date(asOfDate); t.setHours(23, 59, 59, 999); targetTime = t.getTime(); }

for (let i = 1; i < txData.length; i++) { let row = txData[i]; let code = String(row[idx.rmCode]).trim(); let isDel = row[idx.isDeleted];

if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
if (!stockMap.hasOwnProperty(code)) continue;

if (targetTime) {
  let txTime = new Date(row[idx.date]).getTime();
  if (txTime > targetTime) continue;
}

let type = String(row[idx.type]).trim().toUpperCase();
let qty = Number(row[idx.qty]) || 0;

if (type === 'IN') stockMap[code] += qty;
else if (type === 'OUT') stockMap[code] -= qty;
}

return stockMap; }

function _initializeStockMap(rmCodes, masterData) { let map = {}; rmCodes.forEach(code => { map[code] = masterData.items[code] ? masterData.items[code].openingStock : 0; }); return map; }

function getCurrentStock(rmCode) { try { const stocks = _calculateStockInternal([rmCode]); return Number(parseFloat(stocks[rmCode]).toFixed(2)) || 0; } catch(e) { logError('getCurrentStock', e.message, e.stack); throw new Error("Failed to calculate stock: " + e.message); } }

function _getFifoQueues(rmCodes, masterData, ss) {
  checkAndMigrateSchema(ss);
  let fifoQueues = {};
  rmCodes.forEach(code => {
    fifoQueues[code] = [];
    // Initialize with opening stock at rate 0
    if (masterData.items[code] && masterData.items[code].openingStock > 0) {
      fifoQueues[code].push({ qty: masterData.items[code].openingStock, rate: 0 });
    }
  });

  const txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return fifoQueues;

  const txData = txSheet.getDataRange().getValues();
  if (txData.length <= 1) return fifoQueues;

  const headers = txData[0];
  const idx = {
    rmCode: headers.indexOf('RM Code'),
    type: headers.indexOf('Transaction Type'),
    qty: headers.indexOf('Quantity'),
    rate: headers.indexOf('Rate'),
    isDeleted: headers.indexOf('IsDeleted')
  };

  for (let i = 1; i < txData.length; i++) {
    let row = txData[i];
    let isDel = row[idx.isDeleted];
    if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;

    let code = String(row[idx.rmCode]).trim();
    if (!fifoQueues.hasOwnProperty(code)) continue;

    let type = String(row[idx.type]).trim().toUpperCase();
    let qty = Number(row[idx.qty]) || 0;
    let rate = Number(row[idx.rate]) || 0;

    if (type === 'IN') {
      fifoQueues[code].push({ qty: qty, rate: rate });
    } else if (type === 'OUT') {
      let remainingOut = qty;
      while (remainingOut > 0 && fifoQueues[code].length > 0) {
        let oldestLayer = fifoQueues[code][0];
        if (oldestLayer.qty <= remainingOut) {
          remainingOut -= oldestLayer.qty;
          fifoQueues[code].shift(); // Remove the consumed layer entirely
        } else {
          oldestLayer.qty -= remainingOut;
          remainingOut = 0;
        }
      }
    }
  }

  return fifoQueues;
}

function checkAndMigrateSchema(ss) {
  let txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) {
    setupDatabase();
    return;
  }

  const headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Rate') === -1) {
    const remarksIdx = headers.indexOf('Remarks');
    if (remarksIdx !== -1) {
      txSheet.insertColumnBefore(remarksIdx + 1);
      txSheet.getRange(1, remarksIdx + 1).setValue('Rate').setFontWeight('bold').setBackground('#f3f3f3');
    } else {
      txSheet.insertColumnAfter(txSheet.getLastColumn());
      txSheet.getRange(1, txSheet.getLastColumn() + 1).setValue('Rate').setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
}

function submitTransactions(payload) { const lock = LockService.getScriptLock();

try { lock.waitLock(30000); } catch (e) { throw new Error('System is busy processing another transaction. Please try again.'); }

try { if (!payload || !payload.rows || payload.rows.length === 0) { throw new Error("No transaction data received."); } if (!payload.date || !payload.name) { throw new Error("Date and Name are required."); }

const ss = getDB();
checkAndMigrateSchema(ss);
let txSheet = ss.getSheetByName('Transactions');

const masterData = getMasterData();
const batchId = 'BATCH-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + generateUUID().split('-')[0].toUpperCase();
const timestamp = new Date();
const currentUser = Session.getActiveUser().getEmail() || payload.name;

let requiredRms = new Set();
payload.rows.forEach(r => requiredRms.add(r.rmCode));

let fifoQueues = _getFifoQueues(Array.from(requiredRms), masterData, ss);
let insertRows = [];

for (let i = 0; i < payload.rows.length; i++) {
  let row = payload.rows[i];
  let itemMaster = masterData.items[row.rmCode];

  if (!itemMaster) throw new Error(`Item Code ${row.rmCode} not found in Master.`);

  let type = String(row.type).toUpperCase();
  let qty = Number(row.qty);
  let userRate = Number(row.rate) || 0;

  if (qty <= 0 || isNaN(qty)) throw new Error(`Invalid quantity for item ${itemMaster.itemName}.`);
  if (type !== 'IN' && type !== 'OUT') throw new Error(`Invalid transaction type ${type}.`);

  const txnId = 'TXN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + generateUUID().split('-')[0].toUpperCase();

  if (type === 'IN') {
    fifoQueues[row.rmCode].push({ qty: qty, rate: userRate });
    insertRows.push([
      txnId, batchId, new Date(payload.date), payload.name, type,
      itemMaster.category, itemMaster.subCategory, itemMaster.itemName, itemMaster.rmCode,
      itemMaster.color, itemMaster.size, itemMaster.uom, qty, userRate, row.remarks || '',
      timestamp, currentUser, false
    ]);
  } else if (type === 'OUT') {
    let totalAvailable = fifoQueues[row.rmCode].reduce((sum, layer) => sum + layer.qty, 0);
    if (qty > totalAvailable) {
      throw new Error(`Insufficient stock for ${itemMaster.itemName}. Available: ${Number(parseFloat(totalAvailable).toFixed(2))}, Requested: ${qty}`);
    }

    let remainingOut = qty;
    while (remainingOut > 0 && fifoQueues[row.rmCode].length > 0) {
      let oldestLayer = fifoQueues[row.rmCode][0];
      let layerConsumedQty = 0;
      let layerRate = oldestLayer.rate;

      if (oldestLayer.qty <= remainingOut) {
        layerConsumedQty = oldestLayer.qty;
        remainingOut -= oldestLayer.qty;
        fifoQueues[row.rmCode].shift();
      } else {
        layerConsumedQty = remainingOut;
        oldestLayer.qty -= remainingOut;
        remainingOut = 0;
      }

      insertRows.push([
        txnId, batchId, new Date(payload.date), payload.name, type,
        itemMaster.category, itemMaster.subCategory, itemMaster.itemName, itemMaster.rmCode,
        itemMaster.color, itemMaster.size, itemMaster.uom, layerConsumedQty, layerRate, row.remarks || '',
        timestamp, currentUser, false
      ]);
    }
  }
}

if (insertRows.length > 0) {
  // Refresh headers to find exactly where to map columns in case of manual sheet edits
  const headers = txSheet.getRange(1, 1, 1, txSheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ['Transaction ID', 'Batch ID', 'Date', 'Name', 'Transaction Type', 'Category', 'Sub Category', 'Item Name', 'RM Code', 'Color', 'Size', 'UOM', 'Quantity', 'Rate', 'Remarks', 'Timestamp', 'CreatedBy', 'IsDeleted'];

  // If headers don't strictly match the expected order, we should re-map.
  // However, `insertRows` is constructed directly to match the ideal schema.
  // We'll trust the setupDatabase / schema migration ensures the exact columns.
  txSheet.getRange(txSheet.getLastRow() + 1, 1, insertRows.length, insertRows[0].length).setValues(insertRows);
}

return { success: true, batchId: batchId, message: `Successfully saved ${payload.rows.length} transactions.` };
} catch (err) { logError('submitTransactions', err.message, err.stack); throw err;
} finally { lock.releaseLock(); } }

function _buildStockTableData(asOfDate = null) { const masterData = getMasterData(); const ss = getDB(); const txSheet = ss.getSheetByName('Transactions');

let resultsMap = {}; Object.keys(masterData.items).forEach(rmCode => { let item = masterData.items[rmCode]; resultsMap[rmCode] = { rmCode: item.rmCode, category: item.category, subCategory: item.subCategory, itemName: item.itemName, color: item.color, size: item.size, uom: item.uom, photoLink: item.photoLink, openingStock: item.openingStock, minimumStock: item.minimumStock, totalIn: 0, totalOut: 0, closingStock: item.openingStock, status: '' }; });

if (txSheet) { const txData = txSheet.getDataRange().getValues(); if (txData.length > 1) { const txHeaders = txData[0]; const idx = { rmCode: txHeaders.indexOf('RM Code'), type: txHeaders.indexOf('Transaction Type'), qty: txHeaders.indexOf('Quantity'), date: txHeaders.indexOf('Date'), isDeleted: txHeaders.indexOf('IsDeleted') };

  let targetTime = null;
  if (asOfDate) {
    let t = new Date(asOfDate);
    t.setHours(23, 59, 59, 999);
    targetTime = t.getTime();
  }

  for (let i = 1; i < txData.length; i++) {
    let row = txData[i];
    let code = String(row[idx.rmCode]).trim();
    let isDel = row[idx.isDeleted];

    if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
    if (!resultsMap[code]) continue;

    if (targetTime) {
      let txTime = new Date(row[idx.date]).getTime();
      if (txTime > targetTime) continue;
    }

    let type = String(row[idx.type]).trim().toUpperCase();
    let qty = Number(row[idx.qty]) || 0;

    if (type === 'IN') {
      resultsMap[code].totalIn += qty;
      resultsMap[code].closingStock += qty;
    } else if (type === 'OUT') {
      resultsMap[code].totalOut += qty;
      resultsMap[code].closingStock -= qty;
    }
  }
}
}

let finalArray = []; Object.keys(resultsMap).forEach(code => { let r = resultsMap[code]; r.closingStock = Number(parseFloat(r.closingStock).toFixed(2)); r.totalIn = Number(parseFloat(r.totalIn).toFixed(2)); r.totalOut = Number(parseFloat(r.totalOut).toFixed(2));

if (r.closingStock <= 0) {
  r.status = 'OUT OF STOCK';
} else if (r.minimumStock > 0 && r.closingStock <= r.minimumStock) {
  r.status = 'LOW STOCK';
} else {
  r.status = 'OK';
}

finalArray.push(r);
});

finalArray.sort((a, b) => { if (a.category < b.category) return -1; if (a.category > b.category) return 1; if (a.itemName < b.itemName) return -1; if (a.itemName > b.itemName) return 1; return 0; });

return finalArray; }

function getLiveStock() { try { return _buildStockTableData(null); } catch(e) { logError('getLiveStock', e.message, e.stack); throw new Error("Failed to load live stock: " + e.message); } }

function getDailyClosing(dateStr) { try { if (!dateStr) throw new Error("Date is required"); return _buildStockTableData(dateStr); } catch(e) { logError('getDailyClosing', e.message, e.stack); throw new Error("Failed to load daily closing stock: " + e.message); } }

function getDashboardData() { try { const liveStock = _buildStockTableData(null);

let totalItems = liveStock.length;
let totalCurrentStock = 0;
let lowStockCount = 0;
let outOfStockCount = 0;

liveStock.forEach(item => {
  totalCurrentStock += item.closingStock;
  if (item.status === 'OUT OF STOCK') outOfStockCount++;
  else if (item.status === 'LOW STOCK') lowStockCount++;
});

const ss = getDB();
const txSheet = ss.getSheetByName('Transactions');
let todayIn = 0;
let todayOut = 0;

if (txSheet) {
  const txData = txSheet.getDataRange().getValues();
  if (txData.length > 1) {
    const idx = {
      type: txData[0].indexOf('Transaction Type'),
      qty: txData[0].indexOf('Quantity'),
      date: txData[0].indexOf('Date'),
      isDeleted: txData[0].indexOf('IsDeleted')
    };

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < txData.length; i++) {
      let row = txData[i];
      let isDel = row[idx.isDeleted];
      if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;

      let txDate = new Date(row[idx.date]);
      txDate.setHours(0, 0, 0, 0);

      if (txDate.getTime() === today.getTime()) {
        let type = String(row[idx.type]).trim().toUpperCase();
        let qty = Number(row[idx.qty]) || 0;
        if (type === 'IN') todayIn += qty;
        if (type === 'OUT') todayOut += qty;
      }
    }
  }
}

return {
  totalItems: totalItems,
  totalCurrentStock: Number(parseFloat(totalCurrentStock).toFixed(2)),
  lowStockCount: lowStockCount,
  outOfStockCount: outOfStockCount,
  todayIn: Number(parseFloat(todayIn).toFixed(2)),
  todayOut: Number(parseFloat(todayOut).toFixed(2))
};
} catch(e) { logError('getDashboardData', e.message, e.stack); throw new Error("Failed to load dashboard data: " + e.message); } }

function getTransactionsHistory(filters = {}) { try { const ss = getDB();
checkAndMigrateSchema(ss);
const txSheet = ss.getSheetByName('Transactions'); if (!txSheet) return [];

const txData = txSheet.getDataRange().getValues();
if (txData.length <= 1) return [];

const headers = txData[0];
const idx = {
  txnId: headers.indexOf('Transaction ID'),
  batchId: headers.indexOf('Batch ID'),
  date: headers.indexOf('Date'),
  name: headers.indexOf('Name'),
  type: headers.indexOf('Transaction Type'),
  category: headers.indexOf('Category'),
  subCategory: headers.indexOf('Sub Category'),
  itemName: headers.indexOf('Item Name'),
  rmCode: headers.indexOf('RM Code'),
  color: headers.indexOf('Color'),
  size: headers.indexOf('Size'),
  uom: headers.indexOf('UOM'),
  qty: headers.indexOf('Quantity'),
  remarks: headers.indexOf('Remarks'),
  timestamp: headers.indexOf('Timestamp'),
  isDeleted: headers.indexOf('IsDeleted')
};

  const rateIdx = headers.indexOf('Rate');
  let resultsMap = {};  // Map to group split OUT transactions
  let orderedTxnIds = []; // To keep reverse chronological order

for (let i = txData.length - 1; i >= 1; i--) {
  let row = txData[i];
  if (String(row[idx.isDeleted]).trim().toUpperCase() === 'TRUE' || String(row[idx.isDeleted]).trim() === '1') continue;

  let date = new Date(row[idx.date]);

  if (filters.fromDate) {
    let from = new Date(filters.fromDate);
    from.setHours(0, 0, 0, 0);
    if (date.getTime() < from.getTime()) continue;
  }
  if (filters.toDate) {
    let to = new Date(filters.toDate);
    to.setHours(23, 59, 59, 999);
    if (date.getTime() > to.getTime()) continue;
  }
  if (filters.type && filters.type !== '') {
    if (String(row[idx.type]).toUpperCase() !== String(filters.type).toUpperCase()) continue;
  }
    if (filters.category && filters.category !== '') {
      if (String(row[idx.category]) !== String(filters.category)) continue;
    }

    let txnId = row[idx.txnId];
    let qty = Number(parseFloat(row[idx.qty]).toFixed(2));
    let rate = rateIdx !== -1 ? (Number(row[rateIdx]) || 0) : 0;

    // For OUT transactions, we group them by txnId and calculate average rate or aggregate qty.
    // We can also group IN, though IN usually isn't split unless submitted manually as such.
    if (!resultsMap[txnId]) {
      orderedTxnIds.push(txnId);
      resultsMap[txnId] = {
        txnId: txnId,
        batchId: row[idx.batchId],
        dateStr: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        name: row[idx.name],
        type: row[idx.type],
        category: row[idx.category],
        subCategory: idx.subCategory !== -1 ? row[idx.subCategory] : '',
        itemName: row[idx.itemName],
        rmCode: row[idx.rmCode],
        color: idx.color !== -1 ? row[idx.color] : '',
        size: idx.size !== -1 ? row[idx.size] : '',
        uom: row[idx.uom],
        qty: qty,
        rate: rate,
        totalValue: qty * rate,
        remarks: row[idx.remarks],
        timestampStr: Utilities.formatDate(new Date(row[idx.timestamp]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
      };
    } else {
      resultsMap[txnId].qty += qty;
      resultsMap[txnId].totalValue += (qty * rate);
      // Recalculate average rate for the display
      resultsMap[txnId].rate = resultsMap[txnId].totalValue / resultsMap[txnId].qty;
    }
  }

  let results = orderedTxnIds.map(id => resultsMap[id]);
  return results;
} catch(e) { logError('getTransactionsHistory', e.message, e.stack); throw new Error("Failed to load transaction history: " + e.message); } }

function getRateComparisonData(filters = {}) {
  try {
    const ss = getDB();
    checkAndMigrateSchema(ss);
    const txSheet = ss.getSheetByName('Transactions');
    if (!txSheet) return [];

    const txData = txSheet.getDataRange().getValues();
    if (txData.length <= 1) return [];

    const headers = txData[0];
    const idx = {
      date: headers.indexOf('Date'),
      type: headers.indexOf('Transaction Type'),
      category: headers.indexOf('Category'),
      itemName: headers.indexOf('Item Name'),
      rmCode: headers.indexOf('RM Code'),
      uom: headers.indexOf('UOM'),
      qty: headers.indexOf('Quantity'),
      rate: headers.indexOf('Rate'),
      isDeleted: headers.indexOf('IsDeleted')
    };

    if (idx.rate === -1) return []; // No rate column yet

    // Gather all IN transactions chronologically (top to bottom)
    let inTxns = [];
    for (let i = 1; i < txData.length; i++) {
      let row = txData[i];
      if (String(row[idx.isDeleted]).trim().toUpperCase() === 'TRUE' || String(row[idx.isDeleted]).trim() === '1') continue;
      if (String(row[idx.type]).trim().toUpperCase() !== 'IN') continue;

      let date = new Date(row[idx.date]);

      inTxns.push({
        dateObj: date,
        dateStr: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        rmCode: row[idx.rmCode],
        itemName: row[idx.itemName],
        category: row[idx.category],
        uom: row[idx.uom],
        qty: Number(parseFloat(row[idx.qty]).toFixed(2)),
        rate: Number(row[idx.rate]) || 0
      });
    }

    // Sort chronological just in case
    inTxns.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Group by item to calculate previous rate
    let itemHistory = {};
    let enrichedTxns = [];

    for (let txn of inTxns) {
      if (!itemHistory[txn.rmCode]) {
        itemHistory[txn.rmCode] = [];
      }

      let prevRate = null;
      let rateDiff = 0;
      let rateDiffPct = 0;

      if (itemHistory[txn.rmCode].length > 0) {
        prevRate = itemHistory[txn.rmCode][itemHistory[txn.rmCode].length - 1].rate;
        rateDiff = txn.rate - prevRate;
        rateDiffPct = prevRate > 0 ? (rateDiff / prevRate) * 100 : 0;
      }

      itemHistory[txn.rmCode].push(txn);

      enrichedTxns.push({
        ...txn,
        prevRate: prevRate,
        rateDiff: rateDiff,
        rateDiffPct: rateDiffPct
      });
    }

    // Filter the enriched transactions based on user inputs
    let results = [];
    for (let txn of enrichedTxns) {
      if (filters.fromDate) {
        let from = new Date(filters.fromDate);
        from.setHours(0, 0, 0, 0);
        if (txn.dateObj.getTime() < from.getTime()) continue;
      }
      if (filters.toDate) {
        let to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);
        if (txn.dateObj.getTime() > to.getTime()) continue;
      }
      if (filters.category && filters.category !== '') {
        if (String(txn.category) !== String(filters.category)) continue;
      }
      results.push(txn);
    }

    // Return reverse chronological so newest are on top
    return results.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  } catch(e) {
    logError('getRateComparisonData', e.message, e.stack);
    throw new Error("Failed to load rate comparison data: " + e.message);
  }
}