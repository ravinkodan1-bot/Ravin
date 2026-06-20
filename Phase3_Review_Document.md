# Phase 3 Backend Core Architecture & Workflows

## 1. Purchase Order Workflow
1. **Creation**: Header and Line Items inserted into `PURCHASE_ORDERS` and `PURCHASE_ORDER_ITEMS` with Status = `Draft` / `Pending Approval`.
2. **Approval**: Triggers `processLedgerImpactForApproval('PO', ...)`.
3. **Inventory Impact**:
   - `STOCK_LEDGER` Entry: `Trans_Type: 'PO'`, `Qty_In: <amount>`, `Qty_Out: 0`
   - `INVENTORY` View: Physical Stock increases. Available Stock increases. Reserved Stock is unchanged.

## 2. Sales Order Workflow
1. **Creation**: Inserted into `SALES_ORDERS` and `SALES_ORDER_ITEMS`. Loc_Code validation is prepared.
2. **Pre-Approval Validation**: `validateStockAvailability()` ensures `Available Stock >= SO Qty`.
3. **Approval**: Triggers `processLedgerImpactForApproval('SO', ...)`.
4. **Inventory Impact (Reservation Engine)**:
   - `STOCK_LEDGER` Entry: `Trans_Type: 'SO_RESERVE'`, `Qty_In: 0`, `Qty_Out: <amount>`
   - `INVENTORY` View: Reserved Stock increases. Available Stock decreases. **Physical Stock remains unchanged.**

## 3. Dispatch Workflow
1. **Rule Enforcement**: Dispatch hamesha SO ke against hi hoga. `SO_Number` is a mandatory Foreign Key in the `DISPATCH` header.
2. **Creation & Validation**: `processDispatch()` checks `SO Pending Qty >= Dispatch Qty` via the tracking fields on `SALES_ORDER_ITEMS`.
3. **Approval/Execution**:
   - Ledger Entry 1 (`Trans_Type: 'SO_RELEASE'`): `Qty_In: <amount>`, `Qty_Out: 0` (Releases the reservation).
   - Ledger Entry 2 (`Trans_Type: 'DISPATCH'`): `Qty_In: 0`, `Qty_Out: <amount>` (Deducts physical stock).
   - `INVENTORY` View: Reserved Stock decreases. Physical Stock decreases. Available Stock remains mathematically correct.
4. **State Engine**: The system calls `updateSOLineDispatchedQty()` and `updateSOHeaderStatus()`. SO Status changes dynamically from `Approved` to `Partially Dispatched` to `Completed` based on the balance.

## 4. Transfer Workflow
1. **Validation**: `validateStockAvailability(From_Loc)` verifies available stock.
2. **Approval/Execution**:
   - Ledger Entry 1 (`Trans_Type: 'TRANSFER_OUT'`): Source Location `Qty_Out: <amount>`.
   - Ledger Entry 2 (`Trans_Type: 'TRANSFER_IN'`): Destination Location `Qty_In: <amount>`.
   - Net Inventory Impact across the company is zero.

## 5. Reversal Flow Diagram
1. **Action**: `reverseTransaction(docType, recordId, reason)` is triggered.
2. **Ledger Scan**: Fetches all `STOCK_LEDGER` entries for `Ref_Number`.
3. **Negation**: For each entry, generates an exact opposite entry (In/Out swapped) with `Trans_Type: <Original>_CANCEL`.
4. **Safety Rule**: Existing ledger rows are strictly never edited.
5. **Re-sync**: The `INVENTORY` materialized view is updated exactly according to the negated inputs.

## 6. Dashboard Data Architecture
- Prepared via `getDashboardKPIs()`.
- Fetches in-memory Array data strictly from `INVENTORY` Materialized View (Total Physical, Total Reserved, Total Available) and filters Document headers (`PURCHASE_ORDERS`, `SALES_ORDERS`, `DISPATCH`) for aggregated pending/today counts.

## 7. Reporting Service Architecture
- Implemented via dynamic `getReportData(reportType, filters)` service.
- Server-side parsing enables generic Date, Item, Location, and SoftDelete filtering without hardcoding 20 individual SQL-like functions. Outputs directly to DataTables UI for CSV/Excel export.

## 8. Performance Standards Used
- **LockService**: Wrap all inventory/ledger functions to prevent DB collision.
- **CacheService**: Deployed on `authenticateUser` and `getMasterData` functions.
- **Batch Processing**: Matrix arrays (`setValues()`) are built in memory and dumped in a single sheet I/O cycle via `batchInsertRecords` concepts.
