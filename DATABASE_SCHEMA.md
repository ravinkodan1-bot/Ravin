# Database Schema Design - IMS Enterprise v1.0

The database uses Google Sheets as a relational surrogate with strict Header/Line-Item decoupling.

## Standard Tracking Columns
All tables include: `CreatedBy`, `CreatedDateTime`, `UpdatedBy`, `UpdatedDateTime`, `DeletedBy`, `DeletedDateTime`, `IsDeleted`.

## Core Engines
- **STOCK_LEDGER**: The single source of truth. Columns: `Trans_ID`, `Trans_Type`, `Ref_Number`, `Item_Code`, `Loc_Code`, `Batch_No`, `Lot_No`, `Container_No`, `Qty_In`, `Qty_Out`, `Running_Balance`.
- **INVENTORY**: Synchronized Materialized View. `Available_Stock = Physical_Stock - Reserved_Stock`.
- **AUDIT_LOGS**: Immutable trace of all system CRUD and Approval actions.

## Transaction Tables
- **PURCHASE_ORDERS / ITEMS**: Tracks supplier intake ownership.
- **SALES_ORDERS / ITEMS**: Tracks customer commitments. Drives reservation allocations.
- **DISPATCH / ITEMS**: Execution of Sales Orders. Deducts physical stock.
- **INTERNAL_TRANSFERS / ITEMS**: Intra-warehouse balancing. Generates paired IN/OUT ledger rows.
- **STOCK_ADJUSTMENTS / ITEMS**: For reconciliations (Shrinkage, scrap, excess found).

## Master Tables
- **USERS**: Defines RBAC.
- **ITEMS**: Dimensional configs (Batch, Lot, Container toggles).
- **PARTIES**: Suppliers & Customers.
- **LOCATIONS**: Warehouses, Supplier Yards, Transit.
