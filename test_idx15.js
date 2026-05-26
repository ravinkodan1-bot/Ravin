// Let's reconsider the ROW index.
// What if `data` returned by `sheet.getDataRange().getValues()` starts from row 2 because row 1 is completely empty?
// No, row 1 has headers like Timestamp, TxnID.
// Wait! `sheet.getDataRange()` gets the range in which there is data.
// If A1:Q1 are headers, it starts at row 1.
// The ONLY WAY `sheet.getRange(i+1, qtyIdx+1)` updates the WRONG cell is if the data range starts from a row OTHER than 1.
// To make it absolutely bulletproof, we can use `row` index from the actual sheet.
// Since `data = sheet.getDataRange().getValues()`, `const startRow = sheet.getDataRange().getRow();`.
// Then `sheet.getRange(startRow + i, qtyIdx + 1)` !!
// Let's implement this to be 100% safe.
