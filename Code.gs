const getSpreadsheetId = () => {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('MASTER_SPREADSHEET_ID');
  if (!id) {
    throw new Error("MASTER_SPREADSHEET_ID not found in Script Properties.");
  }
  return id;
}

function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle("Raw Material Management System")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * UTILITY: Get Database
 */
function getDB() {
  try {
    return SpreadsheetApp.openById(getSpreadsheetId());
  } catch (e) {
    throw new Error("Failed to open database spreadsheet. Check permissions and MASTER_SPREADSHEET_ID property.");
  }
}

/**
 * UTILITY: Database Setup - Creates missing sheets
 */
function setupDatabase() {
  const ss = getDB();
  let ms = ss.getSheetByName('RM_Master');
  let ts = ss.getSheetByName('Transactions');
  let logs = ss.getSheetByName('SYSTEM_LOGS');

  if (!ms) {
    ms = ss.insertSheet('RM_Master');
    ms.appendRow(['RM Code', 'Category', 'Item Name', 'UOM', 'Opening Stock', 'Minimum Stock', 'Status', 'RecordID', 'CreatedBy', 'CreatedDateTime', 'UpdatedBy', 'UpdatedDateTime', 'IsDeleted', 'DeletedBy', 'DeletedDateTime']);
    ms.getRange('A1:O1').setFontWeight('bold').setBackground('#f3f3f3');
    ms.setFrozenRows(1);
  }

  if (!ts) {
    ts = ss.insertSheet('Transactions');
    ts.appendRow(['Transaction ID', 'Batch ID', 'Date', 'Name', 'Transaction Type', 'Category', 'Item Name', 'RM Code', 'UOM', 'Quantity', 'Remarks', 'Timestamp', 'CreatedBy', 'IsDeleted']);
    ts.getRange('A1:N1').setFontWeight('bold').setBackground('#f3f3f3');
    ts.setFrozenRows(1);
  }

  if (!logs) {
    logs = ss.insertSheet('SYSTEM_LOGS');
    logs.appendRow(['Timestamp', 'User', 'Module', 'Error Message', 'Stack Trace']);
    logs.getRange('A1:E1').setFontWeight('bold').setBackground('#f3f3f3');
    logs.setFrozenRows(1);
  }

  return "Database Setup Complete";
}

/**
 * UTILITY: Centralized Error Logging
 */
function logError(moduleName, errorMessage, stackTrace) {
  try {
    const ss = getDB();
    const logSheet = ss.getSheetByName('SYSTEM_LOGS');
    if (logSheet) {
      logSheet.appendRow([
        new Date(),
        Session.getActiveUser().getEmail() || 'Unknown',
        moduleName,
        errorMessage,
        stackTrace || ''
      ]);
    }
  } catch (e) {
    console.error("Failed to log error to sheet: " + e.message);
  }
}

/**
 * UTILITY: Generate UUID
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * DATA: Get Master Data (Cached)
 */
function getMasterData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('MASTER_DATA');

  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const ss = getDB();
    const sheet = ss.getSheetByName('RM_Master');
    if (!sheet) throw new Error("RM_Master sheet not found");

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const colIdx = {
      rmCode: headers.indexOf('RM Code'),
      category: headers.indexOf('Category'),
      itemName: headers.indexOf('Item Name'),
      uom: headers.indexOf('UOM'),
      openStock: headers.indexOf('Opening Stock'),
      minStock: headers.indexOf('Minimum Stock'),
      status: headers.indexOf('Status'),
      isDeleted: headers.indexOf('IsDeleted')
    };

    let categories = new Set();
    let items = {};
    let itemsByCategory = {};

    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      let isDel = row[colIdx.isDeleted];
      let status = row[colIdx.status];

      if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
      if (status && String(status).trim().toUpperCase() !== 'ACTIVE') continue;

      let rmCode = row[colIdx.rmCode];
      if (!rmCode) continue;

      let category = row[colIdx.category] || 'Uncategorized';
      let itemName = row[colIdx.itemName];

      let itemObj = {
        rmCode: String(rmCode),
        category: String(category),
        itemName: String(itemName),
        uom: String(row[colIdx.uom] || ''),
        openingStock: Number(row[colIdx.openStock]) || 0,
        minimumStock: Number(row[colIdx.minStock]) || 0
      };

      items[itemObj.rmCode] = itemObj;
      categories.add(itemObj.category);

      if (!itemsByCategory[itemObj.category]) {
        itemsByCategory[itemObj.category] = [];
      }
      itemsByCategory[itemObj.category].push(itemObj);
    }

    const result = {
      categories: Array.from(categories).sort(),
      items: items,
      itemsByCategory: itemsByCategory
    };

    cache.put('MASTER_DATA', JSON.stringify(result), 900);
    return result;

  } catch (e) {
    logError('getMasterData', e.message, e.stack);
    throw new Error("Failed to load master data: " + e.message);
  }
}

function clearCache() {
  CacheService.getScriptCache().remove('MASTER_DATA');
  return "Cache cleared successfully.";
}


/**
 * TRANSACTION ENGINE: Core Stock Calculator (Memory-based)
 */
function _calculateStockInternal(rmCodes, asOfDate = null) {
  const masterData = getMasterData();
  const ss = getDB();
  const txSheet = ss.getSheetByName('Transactions');
  if (!txSheet) return _initializeStockMap(rmCodes, masterData); // empty tx sheet

  const txData = txSheet.getDataRange().getValues();
  if (txData.length <= 1) return _initializeStockMap(rmCodes, masterData);

  const txHeaders = txData[0];
  const idx = {
    rmCode: txHeaders.indexOf('RM Code'),
    type: txHeaders.indexOf('Transaction Type'),
    qty: txHeaders.indexOf('Quantity'),
    date: txHeaders.indexOf('Date'),
    isDeleted: txHeaders.indexOf('IsDeleted')
  };

  let stockMap = _initializeStockMap(rmCodes, masterData);

  // Optional date filtering
  let targetTime = null;
  if (asOfDate) {
      let t = new Date(asOfDate);
      t.setHours(23,59,59,999); // end of that day
      targetTime = t.getTime();
  }

  for (let i = 1; i < txData.length; i++) {
    let row = txData[i];
    let code = String(row[idx.rmCode]);
    let isDel = row[idx.isDeleted];

    if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
    if (!stockMap.hasOwnProperty(code)) continue;

    if (targetTime) {
      let txTime = new Date(row[idx.date]).getTime();
      if (txTime > targetTime) {
        continue;
      }
    }

    let type = String(row[idx.type]).trim().toUpperCase();
    let qty = Number(row[idx.qty]) || 0;

    if (type === 'IN') stockMap[code] += qty;
    else if (type === 'OUT') stockMap[code] -= qty;
  }

  return stockMap;
}

function _initializeStockMap(rmCodes, masterData) {
    let map = {};
    rmCodes.forEach(code => {
        map[code] = masterData.items[code] ? masterData.items[code].openingStock : 0;
    });
    return map;
}

/**
 * API: Get Current Stock for single item (used by form live check)
 */
function getCurrentStock(rmCode) {
    try {
        const stocks = _calculateStockInternal([rmCode]);
        return Number(parseFloat(stocks[rmCode]).toFixed(2)) || 0;
    } catch(e) {
        logError('getCurrentStock', e.message, e.stack);
        throw new Error("Failed to calculate stock: " + e.message);
    }
}

/**
 * TRANSACTION ENGINE: Submit Transactions
 */
function submitTransactions(payload) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('System is busy processing another transaction. Please try again in a moment.');
  }

  try {
    if (!payload || !payload.rows || payload.rows.length === 0) {
      throw new Error("No transaction data received.");
    }
    if (!payload.date || !payload.name) {
      throw new Error("Date and Name are required.");
    }

    const masterData = getMasterData();
    const batchId = 'BATCH-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + generateUUID().split('-')[0].toUpperCase();
    const timestamp = new Date();
    const currentUser = Session.getActiveUser().getEmail() || payload.name;

    let requiredRms = new Set();
    payload.rows.forEach(r => requiredRms.add(r.rmCode));

    const currentStocks = _calculateStockInternal(Array.from(requiredRms));
    let insertRows = [];
    let batchRunningStock = {...currentStocks};

    for (let i = 0; i < payload.rows.length; i++) {
      let row = payload.rows[i];
      let itemMaster = masterData.items[row.rmCode];

      if (!itemMaster) throw new Error(`Item Code ${row.rmCode} not found in Active Master Data.`);

      let type = String(row.type).toUpperCase();
      let qty = Number(row.qty);

      if (qty <= 0 || isNaN(qty)) throw new Error(`Invalid quantity for item ${itemMaster.itemName}. Must be > 0.`);
      if (type !== 'IN' && type !== 'OUT') throw new Error(`Invalid transaction type ${type} for item ${itemMaster.itemName}.`);

      if (type === 'OUT') {
        if (qty > batchRunningStock[row.rmCode]) {
           throw new Error(`Insufficient stock for ${itemMaster.itemName}. Available: ${Number(parseFloat(batchRunningStock[row.rmCode]).toFixed(2))}, Requested: ${qty}`);
        }
        batchRunningStock[row.rmCode] -= qty;
      } else {
        batchRunningStock[row.rmCode] += qty;
      }

      const txnId = 'TXN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + generateUUID().split('-')[0].toUpperCase();

      insertRows.push([
        txnId,
        batchId,
        new Date(payload.date),
        payload.name,
        type,
        itemMaster.category,
        itemMaster.itemName,
        itemMaster.rmCode,
        itemMaster.uom,
        qty,
        row.remarks || '',
        timestamp,
        currentUser,
        false
      ]);
    }

    if (insertRows.length > 0) {
      const ss = getDB();
      const txSheet = ss.getSheetByName('Transactions');
      txSheet.getRange(txSheet.getLastRow() + 1, 1, insertRows.length, insertRows[0].length).setValues(insertRows);
    }

    return { success: true, batchId: batchId, message: `Successfully submitted ${insertRows.length} transactions.` };

  } catch (err) {
    logError('submitTransactions', err.message, err.stack);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * ENGINE: Build Full Stock Table (Live or Historical)
 * Performs single pass over transactions to aggregate IN/OUT and calculates closing balance.
 */
function _buildStockTableData(asOfDate = null) {
    const masterData = getMasterData();
    const ss = getDB();
    const txSheet = ss.getSheetByName('Transactions');

    // Initialize results map
    let resultsMap = {};
    Object.keys(masterData.items).forEach(rmCode => {
        let item = masterData.items[rmCode];
        resultsMap[rmCode] = {
            rmCode: item.rmCode,
            category: item.category,
            itemName: item.itemName,
            uom: item.uom,
            openingStock: item.openingStock,
            minimumStock: item.minimumStock,
            totalIn: 0,
            totalOut: 0,
            closingStock: item.openingStock,
            status: ''
        };
    });

    if (txSheet) {
        const txData = txSheet.getDataRange().getValues();
        if (txData.length > 1) {
            const txHeaders = txData[0];
            const idx = {
                rmCode: txHeaders.indexOf('RM Code'),
                type: txHeaders.indexOf('Transaction Type'),
                qty: txHeaders.indexOf('Quantity'),
                date: txHeaders.indexOf('Date'),
                isDeleted: txHeaders.indexOf('IsDeleted')
            };

            let targetTime = null;
            if (asOfDate) {
                let t = new Date(asOfDate);
                t.setHours(23,59,59,999);
                targetTime = t.getTime();
            }

            // Map-reduce transactions
            for (let i = 1; i < txData.length; i++) {
                let row = txData[i];
                let code = String(row[idx.rmCode]);
                let isDel = row[idx.isDeleted];

                if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;
                if (!resultsMap[code]) continue; // only process active master items

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

    // Format numbers and determine status
    let finalArray = [];
    Object.keys(resultsMap).forEach(code => {
        let r = resultsMap[code];
        r.closingStock = Number(parseFloat(r.closingStock).toFixed(2));
        r.totalIn = Number(parseFloat(r.totalIn).toFixed(2));
        r.totalOut = Number(parseFloat(r.totalOut).toFixed(2));

        if (r.closingStock <= 0) {
            r.status = 'OUT OF STOCK';
        } else if (r.closingStock <= r.minimumStock) {
            r.status = 'LOW STOCK';
        } else {
            r.status = 'OK';
        }

        finalArray.push(r);
    });

    // Sort by category, then item name
    finalArray.sort((a, b) => {
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.itemName < b.itemName) return -1;
        if (a.itemName > b.itemName) return 1;
        return 0;
    });

    return finalArray;
}

/**
 * API: Get Live Stock Data
 */
function getLiveStock() {
    try {
        return _buildStockTableData(null);
    } catch(e) {
        logError('getLiveStock', e.message, e.stack);
        throw new Error("Failed to load live stock: " + e.message);
    }
}

/**
 * API: Get Daily Closing Stock Data
 */
function getDailyClosing(dateStr) {
    try {
        if (!dateStr) throw new Error("Date is required");
        return _buildStockTableData(dateStr);
    } catch(e) {
        logError('getDailyClosing', e.message, e.stack);
        throw new Error("Failed to load daily closing stock: " + e.message);
    }
}

/**
 * API: Get Dashboard Metrics
 */
function getDashboardData() {
    try {
        const liveStock = _buildStockTableData(null);

        let totalItems = liveStock.length;
        let totalCurrentStock = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        liveStock.forEach(item => {
            totalCurrentStock += item.closingStock;
            if (item.status === 'OUT OF STOCK') outOfStockCount++;
            else if (item.status === 'LOW STOCK') lowStockCount++;
        });

        // Calculate Today's IN/OUT separately
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
                today.setHours(0,0,0,0);

                for (let i = 1; i < txData.length; i++) {
                    let row = txData[i];
                    let isDel = row[idx.isDeleted];
                    if (String(isDel).trim().toUpperCase() === 'TRUE' || String(isDel).trim() === '1') continue;

                    let txDate = new Date(row[idx.date]);
                    txDate.setHours(0,0,0,0);

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

    } catch(e) {
        logError('getDashboardData', e.message, e.stack);
        throw new Error("Failed to load dashboard data: " + e.message);
    }
}

/**
 * API: Get Transaction History
 */
function getTransactionsHistory(filters = {}) {
    try {
        const ss = getDB();
        const txSheet = ss.getSheetByName('Transactions');
        if (!txSheet) return [];

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
            itemName: headers.indexOf('Item Name'),
            rmCode: headers.indexOf('RM Code'),
            uom: headers.indexOf('UOM'),
            qty: headers.indexOf('Quantity'),
            remarks: headers.indexOf('Remarks'),
            timestamp: headers.indexOf('Timestamp'),
            isDeleted: headers.indexOf('IsDeleted')
        };

        let results = [];

        // Map data backwards to get newest first
        for (let i = txData.length - 1; i >= 1; i--) {
            let row = txData[i];

            if (String(row[idx.isDeleted]).trim().toUpperCase() === 'TRUE' || String(row[idx.isDeleted]).trim() === '1') continue;

            let date = new Date(row[idx.date]);

            // Apply Filters
            if (filters.fromDate) {
                let from = new Date(filters.fromDate);
                from.setHours(0,0,0,0);
                if (date.getTime() < from.getTime()) continue;
            }
            if (filters.toDate) {
                let to = new Date(filters.toDate);
                to.setHours(23,59,59,999);
                if (date.getTime() > to.getTime()) continue;
            }
            if (filters.type && filters.type !== '') {
                if (String(row[idx.type]).toUpperCase() !== String(filters.type).toUpperCase()) continue;
            }
            if (filters.category && filters.category !== '') {
                if (String(row[idx.category]) !== String(filters.category)) continue;
            }

            results.push({
                txnId: row[idx.txnId],
                batchId: row[idx.batchId],
                dateStr: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
                name: row[idx.name],
                type: row[idx.type],
                category: row[idx.category],
                itemName: row[idx.itemName],
                rmCode: row[idx.rmCode],
                uom: row[idx.uom],
                qty: Number(parseFloat(row[idx.qty]).toFixed(2)),
                remarks: row[idx.remarks],
                timestampStr: Utilities.formatDate(new Date(row[idx.timestamp]), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
            });
        }

        return results;

    } catch(e) {
        logError('getTransactionsHistory', e.message, e.stack);
        throw new Error("Failed to load transaction history: " + e.message);
    }
}
