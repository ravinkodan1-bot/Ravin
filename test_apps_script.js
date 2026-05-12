// Mock Google Apps Script
class Range {
  constructor(row, col, value) {
    this.row = row;
    this.col = col;
    this.value = value;
  }
  setValue(val) {
    this.value = val;
    // Update the mock sheet data
    mockSheetData[this.row - 1][this.col - 1] = val;
  }
}

let mockSheetData = [
  ["Timestamp", "TxnID", "Type", "ItemName", "Qty", "SourceType", "SourceLocation", "DestType", "DestLocation", "Status", "Supplier", "OrderRef", "Remarks", "DriverName", "DriverPhone", "InvoiceNo", "InvoiceURL"],
  ["2023-01-01", "TXN123", "SaleOrder", "ItemA", 10, "Godown", "Godown A", "Buyer", "Buyer A", "PendingSale", "SupA", "SO-1", "{}", "DriverA", "123", "INV-1", ""]
];

class Sheet {
  getDataRange() {
    return {
      getValues: () => JSON.parse(JSON.stringify(mockSheetData)) // Return deep copy
    };
  }
  getRange(row, col) {
    return new Range(row, col, mockSheetData[row - 1][col - 1]);
  }
}

class SpreadsheetApp {
  static openById(id) {
    return {
      getSheetByName: (name) => {
        if (name === "Transactions") return new Sheet();
        return null;
      }
    };
  }
}

global.SpreadsheetApp = SpreadsheetApp;
global.SUBMISSION_SHEET_ID = "mock_id";

// Include the editSaleOrder function
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

        // Let's print what it sets
        console.log("Setting obj.supplier", obj.supplier);
        if(supIndex > -1 && obj.supplier !== undefined) sheet.getRange(i+2, supIndex+1).setValue(obj.supplier);
        if(dNameIndex > -1 && obj.driverName !== undefined) sheet.getRange(i+2, dNameIndex+1).setValue(obj.driverName);
        if(invIndex > -1 && obj.invoiceNo !== undefined) sheet.getRange(i+2, invIndex+1).setValue(obj.invoiceNo);
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
  sourceLocation: "Godown B", // Simulated change of location
  supplier: undefined, // Simulated missing supplier due to catch block in frontend
});

console.log("Result:", result);
console.log("After:");
console.log(mockSheetData[1]);
