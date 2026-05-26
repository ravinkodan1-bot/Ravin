// Wait... if `startCol + qtyIdx` is used...
// If `dataRange` starts at column A (1).
// `qtyIdx` is 4.
// `startCol + qtyIdx` -> `1 + 4 = 5`.
// Column 5 is E. This is PERFECT!
// Let's do the same fix in `editSaleOrder` and `dispatchSale` so it is mathematically robust everywhere.
