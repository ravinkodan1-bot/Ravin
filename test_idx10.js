// Wait! "Calculation is correct everywhere else".
// Overall inventory calculates Physical stock by adding logic based on rows:
//    if (type === "Opening" || type === "Purchase") {
//      addInv(dType, dLoc, qty, qty, 0);
//    }
// Since Party stock is 93.5 (from the original row which failed to update), AND Transit is 41 (from the newly spawned partial route purchase row).
// WAIT! If the original row failed to update, Party stock would STILL BE 93.5.
// AND the new purchase adds 41 to Transit.
// Total physical stock would be 93.5 + 41 = 134.5 !!!
// But the user says "baki jagah shi h calculation" (Calculation is right everywhere else).
// This implies Total Stock is NOT 134.5. It implies Total Stock IS 93.5.
// HOW is that possible?
// In my code, for `isPartial = true`, I do `saveTransaction(...)` with type="Purchase".
// A "Purchase" transaction ADDS stock!
// If the original row didn't update, there are two "Purchases" in the sheet: 93.5 and 41. Total = 134.5.
// Why did the user say calculation is right everywhere else?

// Ah! Did the user try to do a "Transfer"?
// "Pending purchases" maps rows where Type === "Purchase" && Status === "PendingRoute".
// What if they DID NOT use the Route modal??
// Wait, the user said "m 41 ton transist me kr chuka hu".
