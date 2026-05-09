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

function initSetup() {
  const masterSS = SpreadsheetApp.openById(MASTER_SHEET_ID);
  getOrCreateSheet(masterSS, "Items", ["ItemCode", "ItemName", "Brand"]);
  getOrCreateSheet(masterSS, "Brands", ["BrandCode", "BrandName"]);
  getOrCreateSheet(masterSS, "Godowns", ["GodownCode", "GodownName", "State"]);
  getOrCreateSheet(masterSS, "Parties", ["PartyCode", "PartyName"]);

  const transSS = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
  getOrCreateSheet(transSS, "Transactions", [
    "Timestamp", "TxnID", "Type", "ItemName", "Brand", "Qty",
    "SourceType", "SourceLocation", "DestType", "DestLocation",
    "Status", "Remarks"
  ]);
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
      // Assuming standard layout:
      // Items: Col 1 = Code, Col 2 = Name, Col 3 = Brand
      // Brands: Col 1 = Code, Col 2 = Name
      // Godowns: Col 1 = Code, Col 2 = Name, Col 3 = State
      // Parties: Col 1 = Code, Col 2 = Name, Col 3 = Type
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
      brands: getData("Brands"),
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
      "Timestamp", "TxnID", "Type", "ItemName", "Brand", "Qty",
      "SourceType", "SourceLocation", "DestType", "DestLocation",
      "Status", "Remarks"
    ]);

    const txnId = "TXN" + new Date().getTime();

    sheet.appendRow([
      new Date(),
      txnId,
      obj.type, // Opening, Purchase, Transfer, SaleOrder, Dispatch
      obj.itemName,
      obj.brand,
      obj.qty,
      obj.sourceType || "", // Godown, Party, Transit
      obj.sourceLocation || "",
      obj.destType || "",   // Godown, Transit
      obj.destLocation || "",
      obj.status || "Completed", // Completed, PendingSale
      obj.remarks || ""
    ]);

    return "Success";
  } catch (err) {
    return err.toString();
  }
}

function dispatchSale(txnId) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if(!sheet) return "Sheet not found";

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    const statusIndex = headers.indexOf("Status");
    const idIndex = headers.indexOf("TxnID");

    for(let i=0; i<data.length; i++){
      if(data[i][idIndex] === txnId){
        sheet.getRange(i+2, statusIndex+1).setValue("Completed");
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
      gData.shift(); // headers
      gData.forEach(row => {
        godownStates[row[1]] = row[2]; // Map Name -> State
      });
    }

    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = ss.getSheetByName("Transactions");
    if (!sheet) return { error: "No transactions found." };

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();

    // Process transactions into current state
    let inventory = {}; // Key: Item|Brand|LocationType|LocationName

    data.forEach(row => {
      let txn = {};
      headers.forEach((h, i) => txn[h] = row[i]);

      const itemKeyBase = `${txn.ItemName}|${txn.Brand}`;
      const qty = parseFloat(txn.Qty) || 0;

      const addInv = (type, loc, pQty, sQty, pendingQty) => {
        if(!type || !loc) return;
        let key = `${itemKeyBase}|${type}|${loc}`;
        if(!inventory[key]) inventory[key] = {
          itemName: txn.ItemName, brand: txn.Brand,
          locType: type, locName: loc,
          state: godownStates[loc] || '-',
          physical: 0, saleable: 0, pending: 0
        };
        inventory[key].physical += pQty;
        inventory[key].saleable += sQty;
        inventory[key].pending += pendingQty;
      };

      if (txn.Type === "Opening" || txn.Type === "Purchase") {
        addInv(txn.DestType, txn.DestLocation, qty, qty, 0);
      }
      else if (txn.Type === "Transfer") {
        addInv(txn.SourceType, txn.SourceLocation, -qty, -qty, 0);
        addInv(txn.DestType, txn.DestLocation, qty, qty, 0);
      }
      else if (txn.Type === "SaleOrder") {
        if(txn.Status === "PendingSale") {
          // Reduces saleable, increases pending, physical untouched
          addInv(txn.SourceType, txn.SourceLocation, 0, -qty, qty);
        } else if (txn.Status === "Completed") {
          // Dispatched! physical gone, saleable was already gone, pending gone
          addInv(txn.SourceType, txn.SourceLocation, -qty, -qty, 0);
        }
      }
    });

    let rawInv = Object.values(inventory).filter(i => i.physical !== 0 || i.pending !== 0 || i.saleable !== 0);

    // Report A: Detailed Stock
    // Report B: State-wise
    let stateWise = {};
    rawInv.forEach(i => {
      if(i.locType === "Godown") {
        let key = `${i.itemName}|${i.brand}|${i.state}`;
        if(!stateWise[key]) stateWise[key] = { state: i.state, item: i.itemName, brand: i.brand, physical: 0, saleable: 0 };
        stateWise[key].physical += i.physical;
        stateWise[key].saleable += i.saleable;
      }
    });

    // Report C: Total Brand Stock
    let brandWise = {};
    rawInv.forEach(i => {
      let key = `${i.brand}`;
      if(!brandWise[key]) brandWise[key] = { brand: i.brand, physical: 0, transit: 0, party: 0, pending: 0, saleable: 0, details: [] };
      brandWise[key].physical += i.physical;
      brandWise[key].pending += i.pending;
      brandWise[key].saleable += i.saleable;
      if(i.locType === "Transit") brandWise[key].transit += i.physical;
      if(i.locType === "Party") brandWise[key].party += i.physical;

      brandWise[key].details.push(i);
    });

    // Get Pending Sales for Dispatch UI
    let pendingSales = data.map(r => {
      let obj = {}; headers.forEach((h,i)=>obj[h]=r[i]); return obj;
    }).filter(t => t.Type === "SaleOrder" && t.Status === "PendingSale");

    return {
      detailed: rawInv,
      stateWise: Object.values(stateWise),
      brandWise: Object.values(brandWise),
      pendingSales: pendingSales
    };
  } catch (err) {
    return { error: err.toString() };
  }
}
