const MASTER_SHEET_ID = "1oh5Nsb8wSjUtXov_8Hz_ifLOt1J1FYe-LN0ynjzIe3Q";
const SUBMISSION_SHEET_ID = "1n-7Lgd4_S4oUHWh_v4EV3OmHThB_mvR76qu28ToGD5k";

// Helper function to get sheet or create if not exists
function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle("Yashika Petrochem - Stock Management")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getMasterData() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);

    const getData = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      const data = sheet.getDataRange().getValues();
      if(data.length === 0) return [];
      data.shift(); // remove headers

      // We map directly by column index to avoid header name mismatch issues.
      // Col 1 = Code, Col 2 = Name, Col 3 = Extra Info
      return data.filter(row => row[1] && row[1].toString().trim() !== "").map(row => {
        return {
           code: row[0],
           name: row[1],
           extra: row[2] || ""
        };
      });
    };

    return {
      items: getData("Items"),
      godowns: getData("Godowns"),
      parties: getData("Parties")
    };
  } catch (err) {
    return { error: err.toString() };
  }
}

function saveTransaction(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = getOrCreateSheet(ss, "Transactions", [
      "Timestamp", "TxnID", "Type", "ItemName", "Qty",
      "SourceType", "SourceLocation", "DestType", "DestLocation",
      "Status", "Supplier", "OrderRef", "Remarks",
      "DriverName", "DriverPhone", "InvoiceNo", "InvoiceURL"
    ]);

    const txnId = "TXN" + new Date().getTime();

    sheet.appendRow([
      new Date(),
      txnId,
      obj.type, // Opening, Purchase, Transfer, SaleOrder, Dispatch
      obj.itemName,
      obj.qty,
      obj.sourceType || "", // Godown, Party, Transit
      obj.sourceLocation || "",
      obj.destType || "",   // Godown, Transit, Buyer
      obj.destLocation || "",
      obj.status || "Completed", // Completed, PendingSale
      obj.supplier || "",
      obj.orderRef || "",
      obj.remarks || "",
      "", "", "", "" // Empty cells for Driver/Invoice later
    ]);

    return "Success";
  } catch (err) {
    return err.toString();
  }
}

// Ensure DriveApp is used so Apps Script prompts for authorization.
function setupDriveFolder() {
  const folderName = "Yashika_Invoices";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function dispatchSale(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if(!sheet) return "Sheet not found";

    let fileUrl = "";
    if (obj.fileData && obj.fileName) {
      const folder = setupDriveFolder();
      const blob = Utilities.newBlob(Utilities.base64Decode(obj.fileData), obj.fileType, obj.fileName);
      const file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }

    const data = sheet.getDataRange().getValues();
    if(data.length === 0) return "No data";

    // Find headers dynamically lowercase to avoid mismatch
    const headers = data.shift().map(h => h.toString().toLowerCase());
    const idIndex = headers.indexOf("txnid");
    const statusIndex = headers.indexOf("status");
    const dNameIndex = headers.indexOf("drivername");
    const dPhoneIndex = headers.indexOf("driverphone");
    const invIndex = headers.indexOf("invoiceno");
    const urlIndex = headers.indexOf("invoiceurl");

    if(statusIndex === -1 || idIndex === -1) return "Missing columns (TxnID or Status) in Transactions sheet.";

    for(let i=0; i<data.length; i++){
      if(data[i][idIndex] === obj.txnId){
        sheet.getRange(i+2, statusIndex+1).setValue("Completed");
        if(dNameIndex > -1) sheet.getRange(i+2, dNameIndex+1).setValue(obj.driverName);
        if(dPhoneIndex > -1) sheet.getRange(i+2, dPhoneIndex+1).setValue(obj.driverPhone);
        if(invIndex > -1) sheet.getRange(i+2, invIndex+1).setValue(obj.invoiceNo);
        if(urlIndex > -1 && fileUrl) sheet.getRange(i+2, urlIndex+1).setValue(fileUrl);
        return "Success";
      }
    }
    return "Transaction not found";
  } catch(err) {
    return err.toString();
  }
}

function getReportsData() {
  try {
    const masterSS = SpreadsheetApp.openById(MASTER_SHEET_ID);
    const godownsSheet = masterSS.getSheetByName("Godowns");
    let godownStates = {};
    if(godownsSheet) {
      const gData = godownsSheet.getDataRange().getValues();
      if(gData.length > 0) {
        gData.shift(); // headers
        gData.forEach(row => {
          if(row[1]) godownStates[row[1]] = row[2]; // Map Name -> State
        });
      }
    }

    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if (!sheet) return { error: "No transactions found. Make sure you have saved at least one entry." };

    const data = sheet.getDataRange().getValues();
    if(data.length < 2) return { detailed: [], stateWise: [], itemWise: [], activeTransit: [], pendingSales: [] };

    const headersRaw = data.shift();
    const h = {};
    headersRaw.forEach((head, idx) => { h[head.toString().toLowerCase()] = idx; });

    let inventory = {};
    data.forEach(row => {
      const type = row[h["type"]];
      const itemName = row[h["itemname"]];
      const qtyStr = row[h["qty"]];
      if(!type || !itemName || !qtyStr) return; // skip bad rows

      const qty = parseFloat(qtyStr) || 0;
      const status = row[h["status"]];
      const sType = row[h["sourcetype"]];
      const sLoc = row[h["sourcelocation"]];
      const dType = row[h["desttype"]];
      const dLoc = row[h["destlocation"]];

      const addInv = (locType, locName, pQty, sQty, pendingQty) => {
        if(!locType || !locName) return;
        let key = `${itemName}|${locType}|${locName}`;
        if(!inventory[key]) inventory[key] = {
          itemName: itemName,
          locType: locType, locName: locName,
          state: godownStates[locName] || '-',
          physical: 0, saleable: 0, pending: 0
        };
        inventory[key].physical += pQty;
        inventory[key].saleable += sQty;
        inventory[key].pending += pendingQty;
      };

      if (type === "Opening" || type === "Purchase") {
        addInv(dType, dLoc, qty, qty, 0);
      }
      else if (type === "Transfer") {
        addInv(sType, sLoc, -qty, -qty, 0);
        addInv(dType, dLoc, qty, qty, 0);
      }
      else if (type === "SaleOrder") {
        if(status === "PendingSale") {
          addInv(sType, sLoc, 0, -qty, qty);
        } else if (status === "Completed") {
          addInv(sType, sLoc, -qty, -qty, 0);
        }
      }
    });

    let rawInv = Object.values(inventory).filter(i => i.physical > 0 || i.pending > 0 || i.saleable !== 0);

    let stateWise = {};
    rawInv.forEach(i => {
      if(i.locType === "Godown") {
        let key = `${i.itemName}|${i.state}`;
        if(!stateWise[key]) stateWise[key] = { state: i.state, item: i.itemName, physical: 0, saleable: 0 };
        stateWise[key].physical += i.physical;
        stateWise[key].saleable += i.saleable;
      }
    });

    let itemWise = {};
    rawInv.forEach(i => {
      let key = `${i.itemName}`;
      if(!itemWise[key]) itemWise[key] = { item: i.itemName, physical: 0, transit: 0, party: 0, pending: 0, saleable: 0, details: [] };
      itemWise[key].physical += i.physical;
      itemWise[key].pending += i.pending;
      itemWise[key].saleable += i.saleable;
      if(i.locType === "Transit") itemWise[key].transit += i.physical;
      if(i.locType === "Party") itemWise[key].party += i.physical;

      itemWise[key].details.push(i);
    });

    let activeTransit = rawInv.filter(i => i.locType === "Transit" && i.saleable > 0);

    let pendingSales = data.map(r => {
      return {
        Timestamp: r[h["timestamp"]],
        TxnID: r[h["txnid"]],
        Type: r[h["type"]],
        Status: r[h["status"]],
        ItemName: r[h["itemname"]],
        Qty: r[h["qty"]],
        SourceType: r[h["sourcetype"]],
        SourceLocation: r[h["sourcelocation"]],
        DestLocation: r[h["destlocation"]],
        OrderRef: h["orderref"] !== undefined ? r[h["orderref"]] : "-"
      };
    }).filter(t => t.Type === "SaleOrder" && t.Status === "PendingSale");

    return {
      detailed: rawInv,
      stateWise: Object.values(stateWise),
      itemWise: Object.values(itemWise),
      activeTransit: activeTransit,
      pendingSales: pendingSales
    };
  } catch (err) {
    return { error: err.toString() };
  }
}
