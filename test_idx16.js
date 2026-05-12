// Wait. Could it be that the value `93.5` in the user's sheet is treated as text because of commas or something?
// `parseFloat("93.5")` is 93.5. `parseFloat("93,5")` is 93.
// The user says "abhi bhhi 93.5 aa rha h", so it is 93.5.

// Let's reconsider `isPartial` branch.
// Is it possible the app script execution is exceeding time limit? No.

// Wait. Is it possible that `txnIdx` or `qtyIdx` is WRONG?
// `const txnIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === "txnid");`
// The header in the sheet is "TxnID". `toLowerCase()` makes it "txnid". It matches!
// `const qtyIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === "qty");`
// The header in the sheet is "Qty". `toLowerCase()` makes it "qty". It matches!

// Is it possible there are DUPLICATE HEADERS? No.

// WHAT IF `sheet.getRange(startRow + i, qtyIdx + 1).setValue(...)` is being written as a string, and it doesn't calculate?
// `setValue(originalQty - routedQty)` writes a number. 93.5 - 41 = 52.5.
// Why did the user say "Pending Purchase me Qty wala issue still same h"?
// If the original transaction was saved as `93.5` and we wrote `52.5` to the `Qty` column, when `getReportsData` runs:
// `const qtyStr = row[h["qty"]]; const qty = parseFloat(qtyStr) || 0;`
// It pulls 52.5.
// And `pendingPurchases = mappedData.filter(...)` pulls the row.
// AND the UI prints `fmtQty(p.Qty)`.
// It should be 52.5.

// Let me provide the user with the most robust way to find the row index:
// `const range = sheet.getDataRange();`
// `const startRow = range.getRow();`
// `const startCol = range.getColumn();`
// `sheet.getRange(startRow + i, startCol + qtyIdx).setValue(...)`
// This handles any blank rows or columns at the top/left of the sheet!
