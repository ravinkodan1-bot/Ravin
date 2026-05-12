// Is it possible the front end code passes `txnId` with spaces or something?
// Wait, if it matched, then `found` is true, so it didn't fail finding it.
// If it modified it, but it didn't stick...
// Wait, DOES `getDataRange` start at row 1?
// `sheet.getDataRange().getRow()` returns the starting row number of the data range.
// If the user deleted row 1 by accident and row 2 became row 1?
// No, the UI headers are still there.
// A common issue: `SpreadsheetApp.flush()` works but maybe `isPartial` doesn't trigger `saveTransaction` correctly?
// "m 41 ton transist me kr chuka hu" means it WAS routed to transit! So it created the new row!
// This means `saveTransaction` ran and successfully returned.

// Could it be that the front end doesn't refresh the data?
// `loadReports()` is called in `submitRoutePurchase`.
// `loadReports` fetches data from the backend.
// In `getReportsData`: `const data = sheet.getDataRange().getValues();`
// If `data` is fetched before the sheet update propagates?
// `SpreadsheetApp.flush()` in `code.gs` fixes the backend propagation delay. I JUST added `SpreadsheetApp.flush()` in my PREVIOUS commit. The user reported "abhi bhhi 93.5 aa rha h" AFTER my previous commit?
// Wait! The user said "abhi bhhi 93.5 aa rha h". Did they refresh? "baki jagah shi h calculation bas issme me glt ho rhi h" (Calculation is correct everywhere else, only wrong here).
// If "baki jagah shi h" it means the OVERALL stock is correct.
// WHY would the overall stock be correct but Pending Purchases shows 93.5??
