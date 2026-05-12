// Ah! What if `openRoutePurchaseModal` formats the quantity `fmtQty(p.Qty)` and the value becomes a string like "93.50"?
// Then `inputQty > maxQty` compares the floats.
// This is fine.

// Let's think about `setValue(originalQty - routedQty)`.
// If `data` is from `sheet.getDataRange().getValues()`.
// `data[0]` = Row 1 (Headers).
// `data[1]` = Row 2 (Data).
// If `data[1][txnIdx] === obj.txnId`.
// Then `i = 1`.
// We call `sheet.getRange(i+1, qtyIdx+1).setValue(...)` -> `sheet.getRange(2, qtyIdx+1)`.
// This matches PERFECTLY.

// What if the sheet has a FROZEN ROW and a title at row 1, and headers at row 2??
// "Yashika Petrochem" in row 1?
// Let's look at `getOrCreateSheet` in `code.gs`.
