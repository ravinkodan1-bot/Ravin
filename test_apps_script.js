class Range {
  constructor(row, col, value) {
    this.row = row;
    this.col = col;
    this.value = value;
  }
  setValue(val) {
    this.value = val;
    mockSheetData[this.row - 1][this.col - 1] = val;
  }
}

let mockSheetData = [
  ["Timestamp", "TxnID", "Type", "ItemName", "Qty", "SourceType", "SourceLocation", "DestType", "DestLocation", "Status", "Supplier", "OrderRef", "Remarks", "DriverName", "DriverPhone", "InvoiceNo", "InvoiceURL"],
  ["2023-01-01", "TXN123", "SaleOrder", "ItemA", 50, "Godown", "Godown A", "Buyer", "Buyer A", "PendingSale", "SupA", "SO-1", "{}", "DriverA", "123", "INV-1", ""]
];

class Sheet {
  getDataRange() {
    return {
      getValues: () => JSON.parse(JSON.stringify(mockSheetData))
    };
  }
  getRange(row, col) {
    return new Range(row, col, mockSheetData[row - 1][col - 1]);
  }
  appendRow(rowArr) {
    mockSheetData.push(rowArr);
  }
  setFrozenRows() {}
}

class SpreadsheetApp {
  static openById(id) {
    return {
      getSheetByName: (name) => {
        if (name === "Transactions") return new Sheet();
        return null;
      },
      insertSheet: (name) => new Sheet()
    };
  }
  static flush() {
    console.log("Flushed sheet data.");
  }
}

global.SpreadsheetApp = SpreadsheetApp;
global.SUBMISSION_SHEET_ID = "mock_id";

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function saveTransaction(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    const sheet = getOrCreateSheet(ss, "Transactions", []);

    const txnId = "TXN" + new Date().getTime();

    let destType = obj.destType || "";
    let destLoc = obj.destLocation || "";
    let status = obj.status || "Completed";

    let remarksObj = {
        intendedDestType: obj.destType,
        intendedDestLoc: obj.destLocation,
        remarks: obj.remarks || ""
    };

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
        let oldQty = 0;
        if(qtyIndex > -1) {
          oldQty = parseFloat(data[i][qtyIndex]) || 0;
          sheet.getRange(i+2, qtyIndex+1).setValue(obj.qty);
        }

        if(typeIndex > -1) sheet.getRange(i+2, typeIndex+1).setValue(obj.sourceType);
        if(locIndex > -1) sheet.getRange(i+2, locIndex+1).setValue(obj.sourceLocation);
        if(supIndex > -1 && obj.supplier !== undefined) sheet.getRange(i+2, supIndex+1).setValue(obj.supplier);
        if(dNameIndex > -1 && obj.driverName !== undefined) sheet.getRange(i+2, dNameIndex+1).setValue(obj.driverName);
        if(invIndex > -1 && obj.invoiceNo !== undefined) sheet.getRange(i+2, invIndex+1).setValue(obj.invoiceNo);

        // If splitPending is true and new qty is less than old qty, create a new pending sale row for the remainder
        let newQty = parseFloat(obj.qty) || 0;
        if (obj.splitPending && newQty < oldQty) {
           let remainder = oldQty - newQty;

           let itemNameIdx = headers.indexOf("itemname");
           let destTypeIdx = headers.indexOf("desttype");
           let destLocIdx = headers.indexOf("destlocation");
           let orderRefIdx = headers.indexOf("orderref");

           let itemName = itemNameIdx > -1 ? data[i][itemNameIdx] : "";
           let destType = destTypeIdx > -1 ? data[i][destTypeIdx] : "";
           let destLoc = destLocIdx > -1 ? data[i][destLocIdx] : "";
           let orderRef = orderRefIdx > -1 ? data[i][orderRefIdx] : "";

           let oldSourceType = typeIndex > -1 ? data[i][typeIndex] : "";
           let oldSourceLoc = locIndex > -1 ? data[i][locIndex] : "";
           let oldSupplier = supIndex > -1 ? data[i][supIndex] : "";

           saveTransaction({
             type: "SaleOrder",
             itemName: itemName,
             qty: remainder,
             sourceType: oldSourceType,
             sourceLocation: oldSourceLoc,
             supplier: oldSupplier,
             destType: destType,
             destLocation: destLoc,
             orderRef: orderRef + "-SPLIT",
             status: "PendingSale",
             remarks: "Split from modified sale order"
           });
        }

        SpreadsheetApp.flush();
        return "Success";
      }
    }
    return "Sale Order not found";
  } catch(err) {
    return err.toString();
  }
}

console.log("Before:");
console.log(mockSheetData[1]);

let result = editSaleOrder({
  txnId: "TXN123",
  qty: 20,
  sourceType: "Godown",
  sourceLocation: "Godown B",
  splitPending: true
});

console.log("Result:", result);
console.log("After:");
console.log(mockSheetData[1]);
console.log("Split row:");
console.log(mockSheetData[2]);
