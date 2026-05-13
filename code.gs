const MASTER_SHEET_ID = "1VjA2TPRxVbo2NdHYHWp3O_gD3qYP-B6x6JRKR5-OjWI";
const SUBMISSION_SHEET_ID = "1VjA2TPRxVbo2NdHYHWp3O_gD3qYP-B6x6JRKR5-OjWI";

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

    let destType = obj.destType || "";
    let destLoc = obj.destLocation || "";
    let status = obj.status || "Completed";

    // When purchasing, initial placement is physically at the Supplier (Party).
    // It remains in PendingRoute until explicitly routed.
    // However, if we pass status explicitly (e.g., "Routed" from a split purchase), don't override it.
    if (obj.type === "Purchase" && !obj.status) {
      destType = "Party";
      destLoc = obj.supplier;
      status = "PendingRoute";
    } else if (obj.type === "Purchase" && obj.status) {
      destType = obj.destType;
      destLoc = obj.destLocation;
      status = obj.status;
    }

    let remarksObj = {
        intendedDestType: obj.destType,
        intendedDestLoc: obj.destLocation,
        remarks: obj.remarks || ""
    };
    if (obj.purchaseType) remarksObj.purchaseType = obj.purchaseType;

    sheet.appendRow([
      new Date(),
      txnId,
      obj.type, // Opening, Purchase, Transfer, SaleOrder, Dispatch
      obj.itemName,
      obj.qty,
      obj.sourceType || "", // Godown, Party, Transit, CFS
      obj.sourceLocation || "",
      destType,   // Godown, Transit, Buyer, Party, CFS
      destLoc,
      status, // Completed, PendingSale, PendingRoute
      obj.supplier || "",
      obj.orderRef || "",
      JSON.stringify(remarksObj), // Store intended destination and purchaseType in remarks
      obj.driverName || "", // Add driver name support here for transit/dispatch updates that pass it
      obj.driverPhone || "",
      obj.invoiceNo || "",
      "" // Empty cell for InvoiceURL later
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

function editSaleOrder(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if(!sheet) return "Sheet not found";

    const data = sheet.getDataRange().getValues();
    if(data.length === 0) return "No data";

    const headers = data.shift().map(h => h.toString().toLowerCase().trim());
    const idIndex = headers.indexOf("txnid");
    const qtyIndex = headers.indexOf("qty");
    const typeIndex = headers.indexOf("sourcetype");
    const locIndex = headers.indexOf("sourcelocation");
    const supIndex = headers.indexOf("supplier");
    const dNameIndex = headers.indexOf("drivername");
    const invIndex = headers.indexOf("invoiceno");

    if(idIndex === -1) return "Missing TxnID column.";

    for(let i=0; i<data.length; i++){
      if(data[i][idIndex] === obj.txnId){
        if(qtyIndex > -1) sheet.getRange(i+2, qtyIndex+1).setValue(obj.qty);
        if(typeIndex > -1) sheet.getRange(i+2, typeIndex+1).setValue(obj.sourceType);
        if(locIndex > -1) sheet.getRange(i+2, locIndex+1).setValue(obj.sourceLocation);
        if(supIndex > -1 && obj.supplier !== undefined) sheet.getRange(i+2, supIndex+1).setValue(obj.supplier);
        if(dNameIndex > -1 && obj.driverName !== undefined) sheet.getRange(i+2, dNameIndex+1).setValue(obj.driverName);
        if(invIndex > -1 && obj.invoiceNo !== undefined) sheet.getRange(i+2, invIndex+1).setValue(obj.invoiceNo);

        SpreadsheetApp.flush();
        return "Success";
      }
    }
    return "Sale Order not found";
  } catch(err) {
    return err.toString();
  }
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

function routePurchase(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if(!sheet) return "Transactions sheet not found";

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const txnIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === "txnid");
    const statusIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === "status");
    const qtyIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === "qty");

    let found = false;
    let isPartial = false;

    for(let i=1; i<data.length; i++) {
      if(data[i][txnIdx] === obj.txnId) {
        let originalQty = parseFloat(data[i][qtyIdx]) || 0;
        let routedQty = parseFloat(obj.qty) || 0;

        if (routedQty < originalQty) {
          // Partial Route: We don't reduce original Qty here because "Transfer" will safely deduct it.
          // BUT since the original row needs to stay 'PendingRoute' for the remainder,
          // we shouldn't change the status either. The easiest and mathematically safest way is:
          // Just let the "Transfer" transaction deduct the routedQty from Party.
          // However, the report logic expects "PendingPurchases" to show only items with status "PendingRoute".
          // If we leave it PendingRoute but transfer some out, it will still show the original Qty in Pending Purchases, which is wrong.
          // Correct fix: Split the purchase into two.
          isPartial = true;
          // IMPORTANT: we must update the sheet with the remaining quantity, so subsequent fetches are correct.
          // Due to header being at i=0 in `data` (row 1 in sheet), the current data row is i.
          // Since getRange starts at 1, the row in sheet is i + 1.
          sheet.getRange(i+1, qtyIdx+1).setValue(originalQty - routedQty); // Original keeps remainder
        } else {
          // Full Route: Mark as completed/routed
          sheet.getRange(i+1, statusIdx+1).setValue("Routed");
        }
        found = true;
        break;
      }
    }

    if(!found) return "Purchase transaction not found";

    if (isPartial) {
        // If partial, create a NEW Purchase directly at the destination, bypassing the Transfer completely.
        // Because we reduced the original purchase qty, the Party stock is already correct.
        return saveTransaction({
          type: "Purchase",
          itemName: obj.itemName,
          qty: obj.qty,
          sourceType: "",
          sourceLocation: "",
          destType: obj.destType,
          destLocation: obj.destLocation,
          status: "Routed",
          supplier: obj.supplier,
          driverName: obj.driverName || "", // save driver/vehicle no
          driverPhone: obj.driverPhone || "",
          invoiceNo: obj.invoiceNo || "",
          remarks: "Split Purchase (Partially Routed)"
        });
    } else {
        // Full route: Use transfer as before to move from Party to Dest.
        return saveTransaction({
          type: "Transfer",
          itemName: obj.itemName,
          qty: obj.qty,
          sourceType: "Party",
          sourceLocation: obj.supplier,
          destType: obj.destType,
          destLocation: obj.destLocation,
          driverName: obj.driverName || "", // save driver/vehicle no
          driverPhone: obj.driverPhone || "",
          invoiceNo: obj.invoiceNo || "",
          remarks: "Routed from Pending Purchases"
        });
    }

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
    headersRaw.forEach((head, idx) => { h[head.toString().toLowerCase().trim()] = idx; });

    let inventory = {};
    data.forEach(row => {
      const typeRaw = row[h["type"]];
      const type = typeRaw ? typeRaw.toString().trim() : "";

      const itemNameRaw = row[h["itemname"]];
      const itemName = itemNameRaw ? itemNameRaw.toString().trim() : "";

      const qtyStr = row[h["qty"]];
      if(!type || !itemName || !qtyStr) return; // skip bad rows

      const qty = parseFloat(qtyStr) || 0;

      const statusRaw = row[h["status"]];
      const status = statusRaw ? statusRaw.toString().trim() : "";

      const sType = row[h["sourcetype"]] ? row[h["sourcetype"]].toString().trim() : "";
      const sLoc = row[h["sourcelocation"]] ? row[h["sourcelocation"]].toString().trim() : "";
      const dType = row[h["desttype"]] ? row[h["desttype"]].toString().trim() : "";
      const dLoc = row[h["destlocation"]] ? row[h["destlocation"]].toString().trim() : "";

      const supplier = row[h["supplier"]] ? row[h["supplier"]].toString().trim() : "";
      // Use driverName as Vehicle No if present, otherwise just generic locName
      const driverName = row[h["drivername"]] ? row[h["drivername"]].toString().trim() : "";
      const invoiceNo = row[h["invoiceno"]] ? row[h["invoiceno"]].toString().trim() : "";

      const addInv = (locType, locName, pQty, sQty, pendingQty, sup, veh, inv) => {
        if(!locType || !locName) return;

        // For Transit & CFS, group by supplier and vehicle No so they don't mix!
        let uniqueGroupSuffix = "";
        if (locType === "Transit" || locType === "CFS") {
          uniqueGroupSuffix = `|${sup}|${veh}|${inv}`;
        }

        let key = `${itemName}|${locType}|${locName}${uniqueGroupSuffix}`;

        if(!inventory[key]) inventory[key] = {
          itemName: itemName,
          locType: locType,
          locName: locName,
          state: godownStates[locName] || '-',
          supplier: sup,
          vehicleNo: veh,
          invoiceNo: inv,
          physical: 0, godown: 0, party: 0, transit: 0, cfs: 0, saleable: 0, pending: 0
        };
        inventory[key].physical += pQty;
        inventory[key].saleable += sQty;
        inventory[key].pending += pendingQty;

        if(locType === "Godown") inventory[key].godown += pQty;
        else if(locType === "Party") inventory[key].party += pQty;
        else if(locType === "Transit") inventory[key].transit += pQty;
        else if(locType === "CFS") inventory[key].cfs += pQty;
      };

      if (type === "Opening" || type === "Purchase") {
        // For direct purchase or split purchase, pass the supplier and driver
        addInv(dType, dLoc, qty, qty, 0, supplier, driverName, invoiceNo);
      }
      else if (type === "Transfer") {
        addInv(sType, sLoc, -qty, -qty, 0, supplier, driverName, invoiceNo);
        addInv(dType, dLoc, qty, qty, 0, supplier, driverName, invoiceNo);
      }
      else if (type === "SaleOrder") {
        if(status === "PendingSale") {
          addInv(sType, sLoc, 0, -qty, qty, supplier, driverName, invoiceNo);
        } else if (status === "Completed") {
          addInv(sType, sLoc, -qty, -qty, 0, supplier, driverName, invoiceNo);
        }
      }
    });

    let rawInv = Object.values(inventory).filter(i => i.physical > 0 || i.pending > 0 || i.saleable !== 0);

    let stateWise = {};
    rawInv.forEach(i => {
      // Grouping all items by state. If it doesn't have a state (e.g. Party/Transit), it groups under 'N/A' or '-'
      let st = i.state || "N/A";
      let key = `${i.itemName}|${st}`;
      if(!stateWise[key]) stateWise[key] = {
        state: st, item: i.itemName,
        physical: 0, godown: 0, party: 0, transit: 0, cfs: 0,
        pending: 0, saleable: 0
      };
      stateWise[key].physical += i.physical;
      stateWise[key].godown += i.godown;
      stateWise[key].party += i.party;
      stateWise[key].transit += i.transit;
      stateWise[key].cfs += i.cfs;
      stateWise[key].pending += i.pending;
      stateWise[key].saleable += i.saleable;
    });

    let itemWise = {};
    rawInv.forEach(i => {
      let key = `${i.itemName}`;
      if(!itemWise[key]) itemWise[key] = { item: i.itemName, physical: 0, godown: 0, transit: 0, cfs: 0, party: 0, pending: 0, saleable: 0, details: [] };
      itemWise[key].physical += i.physical;
      itemWise[key].pending += i.pending;
      itemWise[key].saleable += i.saleable;
      if(i.locType === "Transit") itemWise[key].transit += i.physical;
      else if(i.locType === "Party") itemWise[key].party += i.physical;
      else if(i.locType === "Godown") itemWise[key].godown += i.physical;
      else if(i.locType === "CFS") itemWise[key].cfs += i.physical;

      itemWise[key].details.push(i);
    });

    let activeTransit = rawInv.filter(i => i.locType === "Transit" && i.saleable > 0);
    let activeCFS = rawInv.filter(i => i.locType === "CFS" && i.saleable > 0);

    let mappedData = data.map(r => {
      const t = r[h["type"]] ? r[h["type"]].toString().trim() : "";
      const s = r[h["status"]] ? r[h["status"]].toString().trim() : "";

      let ts = r[h["timestamp"]];
      if(ts && ts instanceof Date) {
        ts = ts.toISOString(); // Convert Date objects to strings for serialization
      } else {
        ts = ts ? ts.toString() : "";
      }

      let remarksObj = {};
      try {
        let remarksRaw = r[h["remarks"]] ? r[h["remarks"]].toString().trim() : "{}";
        if (remarksRaw.startsWith("{")) remarksObj = JSON.parse(remarksRaw);
      } catch(e) {}

      return {
        Timestamp: ts,
        TxnID: r[h["txnid"]] ? r[h["txnid"]].toString() : "",
        Type: t,
        Status: s,
        ItemName: r[h["itemname"]] ? r[h["itemname"]].toString().trim() : "",
        Qty: parseFloat(r[h["qty"]]) || 0,
        Supplier: r[h["supplier"]] ? r[h["supplier"]].toString().trim() : "",
        SourceType: r[h["sourcetype"]] ? r[h["sourcetype"]].toString().trim() : "",
        SourceLocation: r[h["sourcelocation"]] ? r[h["sourcelocation"]].toString().trim() : "",
        DestType: remarksObj.intendedDestType || (r[h["desttype"]] ? r[h["desttype"]].toString().trim() : ""),
        DestLocation: remarksObj.intendedDestLoc || (r[h["destlocation"]] ? r[h["destlocation"]].toString().trim() : ""),
        OrderRef: (h["orderref"] !== undefined && r[h["orderref"]]) ? r[h["orderref"]].toString().trim() : "-",
        DriverName: r[h["drivername"]] ? r[h["drivername"]].toString().trim() : "",
        DriverPhone: r[h["driverphone"]] ? r[h["driverphone"]].toString().trim() : "",
        InvoiceNo: r[h["invoiceno"]] ? r[h["invoiceno"]].toString().trim() : ""
      };
    });

    let pendingSales = mappedData.filter(t => t.Type === "SaleOrder" && t.Status === "PendingSale");

    let partyStock = {};
    rawInv.filter(i => i.locType === "Party").forEach(i => {
      partyStock[`${i.itemName}|${i.locName}`] = i.physical;
    });

    let pendingPurchases = [];
    mappedData.filter(t => t.Type === "Purchase" && t.Status === "PendingRoute").forEach(p => {
      let key = `${p.ItemName}|${p.Supplier}`;
      let available = partyStock[key] || 0;
      if (available > 0) {
        let displayQty = Math.min(p.Qty, available);
        let pClone = Object.assign({}, p);
        pClone.Qty = displayQty;
        partyStock[key] -= displayQty;
        pendingPurchases.push(pClone);
      }
    });

    // Important: Google Apps Script can silently fail to return objects if they contain Dates or Functions.
    // By strictly converting values above, we ensure it serializes properly into JSON for the frontend.
    return {
      detailed: rawInv,
      stateWise: Object.values(stateWise),
      itemWise: Object.values(itemWise),
      activeTransit: activeTransit,
      activeCFS: activeCFS,
      pendingSales: pendingSales,
      pendingPurchases: pendingPurchases
    };
  } catch (err) {
    return { error: err.toString() };
  }
}
