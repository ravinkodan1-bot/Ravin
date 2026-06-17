/**
 * DB Configuration
 */
const HARDCODED_DB_ID = '1poJCOnIkHwmyIIixr34M9ofC7KTZAVl09JaqULANRso';

function getDbId() {
  const prop = PropertiesService.getScriptProperties().getProperty('SCRIPT_PROP_DB_ID');
  return prop ? prop : HARDCODED_DB_ID;
}

function getDb() {
  return SpreadsheetApp.openById(getDbId());
}

/**
 * Web App Routing
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Reconciliation App')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Error Logging
 */
function logError(module, errorMsg, user) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName('ERROR_LOG');
    if (!sheet) {
      sheet = ss.insertSheet('ERROR_LOG');
      sheet.appendRow(['Timestamp', 'Module', 'Error_Message', 'User']);
    }
    sheet.appendRow([new Date(), module, errorMsg, user || Session.getActiveUser().getEmail()]);
  } catch (e) {
    // Silently fail if log itself fails
  }
}

/**
 * Auto-Generate Sequences
 */
function getNextSequence(prefix) {
  try {
    const ss = getDb();
    let sheet = ss.getSheetByName('SEQUENCES');
    if (!sheet) {
      sheet = ss.insertSheet('SEQUENCES');
      sheet.appendRow(['Prefix', 'LastNumber']);
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let lastNumber = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === prefix) {
        rowIndex = i + 1;
        lastNumber = parseInt(data[i][1]) || 0;
        break;
      }
    }

    const nextNumber = lastNumber + 1;

    if (rowIndex === -1) {
      sheet.appendRow([prefix, nextNumber]);
    } else {
      sheet.getRange(rowIndex, 2).setValue(nextNumber);
    }

    return prefix + "-" + String(nextNumber).padStart(5, '0');
  } catch (error) {
    logError('getNextSequence', error.toString(), '');
    throw error;
  }
}

/**
 * Fetch Initial Data
 */
function getAppData() {
  try {
    const ss = getDb();

    const getData = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return [];

      const headers = data[0];
      const isDeletedIndex = headers.indexOf('IsDeleted');

      return data.slice(1)
        .filter(row => isDeletedIndex === -1 || (row[isDeletedIndex] !== true && row[isDeletedIndex] !== 'TRUE' && row[isDeletedIndex] !== true))
        .map(row => {
          let obj = {};
          headers.forEach((h, i) => {
            // Convert dates to proper formats if needed, or just let them pass
            if (row[i] instanceof Date) {
              obj[h] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), 'yyyy-MM-dd');
            } else {
              obj[h] = row[i];
            }
          });
          return obj;
        });
    };

    return {
      success: true,
      data: {
        vendors: getData('VENDORS'),
        items: getData('ITEMS'),
        dispatch: getData('DISPATCH'),
        grn: getData('GRN'),
        invoice: getData('INVOICE')
      }
    };
  } catch (error) {
    logError('getAppData', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

/**
 * CRUD Operations
 */

function ensureSheet(sheetName, headers) {
  const ss = getDb();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function saveVendor(data) {
  try {
    const sheet = ensureSheet('VENDORS', ['VendorID', 'VendorName', 'Status', 'IsDeleted', 'CreatedAt']);
    sheet.appendRow([
      Utilities.getUuid(),
      data.VendorName,
      data.Status || 'Active',
      false,
      new Date()
    ]);
    return { success: true };
  } catch (error) {
    logError('saveVendor', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function saveItem(data) {
  try {
    const sheet = ensureSheet('ITEMS', ['ItemID', 'ItemName', 'Status', 'IsDeleted', 'CreatedAt']);
    sheet.appendRow([
      Utilities.getUuid(),
      data.ItemName,
      data.Status || 'Active',
      false,
      new Date()
    ]);
    return { success: true };
  } catch (error) {
    logError('saveItem', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function saveDispatch(data) {
  try {
    const sheet = ensureSheet('DISPATCH', ['DispatchID', 'DispatchDate', 'VendorName', 'ItemName', 'ContainerNumber', 'VehicleNumber', 'DispatchQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
    const dispatchId = getNextSequence('DSP');

    sheet.appendRow([
      dispatchId,
      data.DispatchDate, // Assumed to be string 'YYYY-MM-DD' from frontend HTML5 input
      data.VendorName,
      data.ItemName,
      data.ContainerNumber,
      data.VehicleNumber,
      data.DispatchQuantity,
      data.Remarks,
      false,
      new Date()
    ]);
    return { success: true, dispatchId: dispatchId };
  } catch (error) {
    logError('saveDispatch', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function saveGRN(data) {
  try {
    const sheet = ensureSheet('GRN', ['GRNNumber', 'ReceiptDate', 'ContainerNumber', 'VendorName', 'ItemName', 'ReceivedQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
    const grnNumber = getNextSequence('GRN');

    sheet.appendRow([
      grnNumber,
      data.ReceiptDate, // Assumed string 'YYYY-MM-DD'
      data.ContainerNumber,
      data.VendorName,
      data.ItemName,
      data.ReceivedQuantity,
      data.Remarks,
      false,
      new Date()
    ]);
    return { success: true, grnNumber: grnNumber };
  } catch (error) {
    logError('saveGRN', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function saveInvoice(data) {
  try {
    const sheet = ensureSheet('INVOICE', ['InvoiceNumber', 'InvoiceDate', 'VendorName', 'ItemName', 'InvoiceQuantity', 'InvoiceAmount', 'Remarks', 'IsDeleted', 'CreatedAt']);

    sheet.appendRow([
      data.InvoiceNumber,
      data.InvoiceDate,
      data.VendorName,
      data.ItemName,
      data.InvoiceQuantity,
      data.InvoiceAmount,
      data.Remarks,
      false,
      new Date()
    ]);
    return { success: true };
  } catch (error) {
    logError('saveInvoice', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function setupDatabase() {
  ensureSheet('VENDORS', ['VendorID', 'VendorName', 'Status', 'IsDeleted', 'CreatedAt']);
  ensureSheet('ITEMS', ['ItemID', 'ItemName', 'Status', 'IsDeleted', 'CreatedAt']);
  ensureSheet('DISPATCH', ['DispatchID', 'DispatchDate', 'VendorName', 'ItemName', 'ContainerNumber', 'VehicleNumber', 'DispatchQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
  ensureSheet('GRN', ['GRNNumber', 'ReceiptDate', 'ContainerNumber', 'VendorName', 'ItemName', 'ReceivedQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
  ensureSheet('INVOICE', ['InvoiceNumber', 'InvoiceDate', 'VendorName', 'ItemName', 'InvoiceQuantity', 'InvoiceAmount', 'Remarks', 'IsDeleted', 'CreatedAt']);
  ensureSheet('SEQUENCES', ['Prefix', 'LastNumber']);
  ensureSheet('ERROR_LOG', ['Timestamp', 'Module', 'Error_Message', 'User']);
  return "Database Setup Complete";
}

function updateRecord(sheetName, idColumn, idValue, dataObj) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet not found" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf(idColumn);

    if (idIndex === -1) return { success: false, message: "ID Column not found" };

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === idValue) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: "Record not found" };

    // Update row based on dataObj keys matching headers
    for (const key in dataObj) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(dataObj[key]);
      }
    }

    return { success: true };
  } catch (error) {
    logError('updateRecord - ' + sheetName, error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function deleteRecord(sheetName, idColumn, idValue) {
  return updateRecord(sheetName, idColumn, idValue, { 'IsDeleted': true });
}

function ensureColumn(sheetName, columnName) {
  const ss = getDb();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf(columnName) === -1) {
    sheet.getRange(1, headers.length + 1).setValue(columnName);
  }
}

function saveDispatchBulk(headerData, lineItems) {
  try {
    ensureColumn('DISPATCH', 'RefInvoice');
    const sheet = ensureSheet('DISPATCH', ['DispatchID', 'DispatchDate', 'VendorName', 'ItemName', 'ContainerNumber', 'VehicleNumber', 'DispatchQuantity', 'Remarks', 'IsDeleted', 'CreatedAt', 'RefInvoice']);
    const dispatchId = getNextSequence('DSP');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    lineItems.forEach(item => {
      let row = new Array(headers.length).fill('');
      row[headers.indexOf('DispatchID')] = dispatchId;
      row[headers.indexOf('DispatchDate')] = headerData.DispatchDate;
      row[headers.indexOf('VendorName')] = headerData.VendorName;
      row[headers.indexOf('RefInvoice')] = headerData.RefInvoice;

      row[headers.indexOf('ItemName')] = item.ItemName;
      row[headers.indexOf('ContainerNumber')] = item.ContainerNumber;
      row[headers.indexOf('VehicleNumber')] = item.VehicleNumber;
      row[headers.indexOf('DispatchQuantity')] = item.DispatchQuantity;
      row[headers.indexOf('Remarks')] = item.Remarks;

      row[headers.indexOf('IsDeleted')] = false;
      row[headers.indexOf('CreatedAt')] = new Date();

      sheet.appendRow(row);
    });
    return { success: true, dispatchId: dispatchId };
  } catch (error) {
    logError('saveDispatchBulk', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function saveGRNBulk(headerData, lineItems) {
  try {
    const sheet = ensureSheet('GRN', ['GRNNumber', 'ReceiptDate', 'ContainerNumber', 'VendorName', 'ItemName', 'ReceivedQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
    const grnNumber = getNextSequence('GRN');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    lineItems.forEach(item => {
      if (parseFloat(item.ReceivedQuantity) > 0) {
        let row = new Array(headers.length).fill('');
        row[headers.indexOf('GRNNumber')] = grnNumber;
        row[headers.indexOf('ReceiptDate')] = headerData.ReceiptDate;
        row[headers.indexOf('VendorName')] = item.VendorName;

        row[headers.indexOf('ItemName')] = item.ItemName;
        row[headers.indexOf('ContainerNumber')] = item.ContainerNumber;
        row[headers.indexOf('ReceivedQuantity')] = item.ReceivedQuantity;
        row[headers.indexOf('Remarks')] = item.Remarks;

        row[headers.indexOf('IsDeleted')] = false;
        row[headers.indexOf('CreatedAt')] = new Date();

        sheet.appendRow(row);
      }
    });
    return { success: true, grnNumber: grnNumber };
  } catch (error) {
    logError('saveGRNBulk', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function markContainerNotReceived(containerNo, remarks) {
  try {
    if (!remarks || remarks.trim() === '') {
      return { success: false, message: "Remarks are mandatory for marking a container as Not Received." };
    }

    const ss = getDb();
    const dispSheet = ss.getSheetByName('DISPATCH');
    const dispData = dispSheet.getDataRange().getValues();
    const dispHeaders = dispData[0];

    let containerInfo = null;
    for (let i = 1; i < dispData.length; i++) {
      if (dispData[i][dispHeaders.indexOf('ContainerNumber')] === containerNo) {
        containerInfo = {
          VendorName: dispData[i][dispHeaders.indexOf('VendorName')],
          ItemName: dispData[i][dispHeaders.indexOf('ItemName')],
          DispatchDate: dispData[i][dispHeaders.indexOf('DispatchDate')]
        };
        break;
      }
    }

    if (!containerInfo) {
      return { success: false, message: "Container not found in Dispatch." };
    }

    const grnSheet = ensureSheet('GRN', ['GRNNumber', 'ReceiptDate', 'ContainerNumber', 'VendorName', 'ItemName', 'ReceivedQuantity', 'Remarks', 'IsDeleted', 'CreatedAt']);
    const grnNumber = getNextSequence('GRN');
    const grnHeaders = grnSheet.getRange(1, 1, 1, grnSheet.getLastColumn()).getValues()[0];

    let row = new Array(grnHeaders.length).fill('');
    row[grnHeaders.indexOf('GRNNumber')] = grnNumber;
    row[grnHeaders.indexOf('ReceiptDate')] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    row[grnHeaders.indexOf('ContainerNumber')] = containerNo;
    row[grnHeaders.indexOf('VendorName')] = containerInfo.VendorName;
    row[grnHeaders.indexOf('ItemName')] = containerInfo.ItemName;
    row[grnHeaders.indexOf('ReceivedQuantity')] = 0; // 0 qty indicates not received but locks status
    row[grnHeaders.indexOf('Remarks')] = "NOT RECEIVED: " + remarks;
    row[grnHeaders.indexOf('IsDeleted')] = false;
    row[grnHeaders.indexOf('CreatedAt')] = new Date();

    grnSheet.appendRow(row);
    return { success: true, grnNumber: grnNumber };

  } catch (error) {
    logError('markContainerNotReceived', error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function updateRecordByContainer(sheetName, containerNo, dataObj) {
  try {
    const ss = getDb();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet not found" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('ContainerNumber');

    if (idIndex === -1) return { success: false, message: "ContainerNumber Column not found" };

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === containerNo) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: "Record not found" };

    for (const key in dataObj) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(dataObj[key]);
      }
    }

    return { success: true };
  } catch (error) {
    logError('updateRecordByContainer - ' + sheetName, error.toString(), '');
    return { success: false, message: error.toString() };
  }
}

function deleteRecordByContainer(sheetName, containerNo) {
  return updateRecordByContainer(sheetName, containerNo, { 'IsDeleted': true });
}
