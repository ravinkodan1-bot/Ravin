// Headers are at row 1!
// Wait. Is it possible that `txnId` was matched against a different row that had the same txnId?
// "txnId" is unique `TXN` + new Date().getTime().

// What if the user is saying "abhi bhhi 93.5 aa rha h" because they are looking at the Google Sheet itself directly?
// No, "Pending purchase me ... yaha abhi bhhi 93.5 aa rha h" implies the UI.

// Let's reconsider `data[i][txnIdx] === obj.txnId`.
// Is there a cache issue? Does `getReportsData` cache `mappedData` somehow?
// No, it fetches `SpreadsheetApp.openById(SUBMISSION_SHEET_ID)`.

// WHAT IF `routePurchase` doesn't find the transaction, but returns `saveTransaction` ANYWAY?
// Look at `routePurchase`.
