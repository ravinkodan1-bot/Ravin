// If `isPartial` is evaluated as FALSE?
// `let routedQty = parseFloat(obj.qty) || 0;`
// `let originalQty = parseFloat(data[i][qtyIdx]) || 0;`
// If `routedQty < originalQty` it is partial.
// 41 < 93.5. So `isPartial` is TRUE.
// Then it calls `sheet.getRange(i+1, qtyIdx+1).setValue(originalQty - routedQty);`
// AND `SpreadsheetApp.flush();`
// AND `return saveTransaction({ type: "Purchase", ... status: "Routed" })`

// WHAT if the Google App Script executes `saveTransaction`, which does `appendRow`, and THAT SUCCEEDS.
// BUT `sheet.getRange(...).setValue(...)` THROWS AN ERROR?
// No, if it threw an error, it would catch in the `catch(err)` block and return `err.toString()`.
// Then the UI would say the error message, NOT "Purchase routed successfully!".

// What if the Google API is just dropping `setValue`?
// Maybe `SpreadsheetApp.flush()` works but it wasn't deployed?
// Oh wait. We are editing `code.gs`. Does it auto deploy or do we need to do something?
// It auto deploys on the Google Apps Script side if we were using clasp, but the user is deploying it.
// The user said "abhi bhhi 93.5 aa rha h" just now.
// Since we don't have clasp, the user is running the code from their Google Apps Script console.
// They copy-pasted my new `code.gs` into their editor and ran it.
