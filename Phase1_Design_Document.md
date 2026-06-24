# Inventory Management System - Phase 1 Design Document

## 1. Database Architecture & Sheet Structure
The system uses Google Sheets as a relational database surrogate with a Header + Line Item architecture. All sheets feature an `IsDeleted` (Soft Delete) column and `Status` controls.

### Master Sheets
*   **USERS**: User_ID, Name, Email, Role, Status, IsDeleted
*   **ITEMS**: Item_Code, Name, Category, UOM, HSN_Code, Status, IsDeleted
*   **PARTIES**: Party_Code, Name, Type (Supplier/Customer/Both), Status, IsDeleted
*   **LOCATIONS**: Loc_Code, Name, Type (Supplier Yard/Warehouse/Transit/Customer), Status, IsDeleted

### Transaction Headers & Lines (With Multi-Level Approval)
*   **PURCHASE_ORDERS**: PO_Number, Date, Supplier_Code, Status, CreatedBy, CreatedAt, L1_ApprovedBy, L1_ApprovedAt, L2_ApprovedBy, L2_ApprovedAt, Final_ApprovedBy, Final_ApprovedAt, IsDeleted
*   **PURCHASE_ORDER_ITEMS**: Line_ID, PO_Number, Item_Code, Qty, Rate, Amount, Loc_Code, Batch_No, Lot_No, Container_No, Serial_No, IsDeleted
*   **SALES_ORDERS**: SO_Number, Date, Customer_Code, Status, CreatedBy, CreatedAt, L1_ApprovedBy, L1_ApprovedAt, L2_ApprovedBy, L2_ApprovedAt, Final_ApprovedBy, Final_ApprovedAt, IsDeleted
*   **SALES_ORDER_ITEMS**: Line_ID, SO_Number, Item_Code, Qty, Dispatched_Qty, Rate, Amount, Batch_No, Lot_No, Container_No, Serial_No, IsDeleted
*   **DISPATCH**: Dispatch_Number, Date, SO_Number, Customer_Code, Vehicle_No, LR_No, Remarks, Status, CreatedBy, CreatedAt, IsDeleted
*   **DISPATCH_ITEMS**: Line_ID, Dispatch_Number, Item_Code, Dispatch_Qty, Batch_No, Lot_No, Container_No, Serial_No, IsDeleted
*   **INTERNAL_TRANSFERS**: Transfer_Number, Date, From_Loc, To_Loc, Status, CreatedBy, CreatedAt, IsDeleted
*   **INTERNAL_TRANSFER_ITEMS**: Line_ID, Transfer_Number, Item_Code, Qty, Batch_No, Lot_No, Container_No, Serial_No, IsDeleted
*   **STOCK_ADJUSTMENTS**: Adj_Number, Date, Loc_Code, Reason (Excess Found/Shortage/Damage/Scrap/Opening Balance), Status, CreatedBy, CreatedAt, IsDeleted
*   **STOCK_ADJUSTMENT_ITEMS**: Line_ID, Adj_Number, Item_Code, Qty_Diff, Batch_No, Lot_No, Container_No, Serial_No, IsDeleted

### Core Engines & Inventory Dimensions
Inventory supports future-ready optional dimensions: Batch No, Lot No, Container No, and Serial No.
*   **STOCK_LEDGER**: Trans_ID, Trans_Type, DateTime, Ref_Number, Item_Code, Loc_Code, Batch_No, Lot_No, Container_No, Qty_In, Qty_Out, Running_Balance, User, Remarks
*   **INVENTORY**: Item_Code, Loc_Code, Batch_No, Lot_No, Container_No, Physical_Stock, Reserved_Stock, Available_Stock (Materialized View where Available = Physical - Reserved)
*   **DAILY_STOCK_HISTORY**: Snapshot_Date, Item_Code, Loc_Code, Batch_No, Lot_No, Container_No, Physical_Stock, Reserved_Stock, Available_Stock (Appended via Nightly Trigger)

### System Logs & Configs
*   **AUDIT_LOGS**: Log_ID, DateTime, User_Email, Module, Action, Old_Value, New_Value
*   **SETTINGS**: Key, Value (e.g., Company Name, Financial Year, FY Start Date, Email Notifications)
*   **SEQUENCES**: Entity (e.g., PO, SO), Prefix, Current_Value, Financial_Year

---

## 2. Security Architecture, Authentication & Performance
1.  **Authentication**: Uses Google Account natively. Apps Script runs as the end user (`Session.getActiveUser().getEmail()`).
2.  **Authorization (RBAC)**: Upon loading the app, backend queries the `USERS` sheet against the active email.
3.  **Data Isolation**: Configured `MASTER_SPREADSHEET_ID` is stored securely in Apps Script `PropertiesService`.
4.  **Transaction Locking**: `LockService.getScriptLock()` is **mandatory** for all inventory-impacting operations (PO/SO Approval, Dispatch, Transfer, Adjustments) to prevent race conditions and ensure data integrity under high concurrency.
5.  **Performance Target**: Designed for 100,000+ ledger records and 10,000+ documents using cached materialized views (`INVENTORY`) and batch I/O.

---

## 3. Core Engine Mechanics

### Inventory Reservation & Multi-Location Stock Visibility
*   **Reservation Engine**: `Reserved_Stock` is never physically deducted. `Available_Stock` is always derived (`Physical - Reserved`).
*   **Multi-Location Visibility**: Dashboards and reports will aggregate stock dynamically (Consolidated total across all locations, specific Warehouse views, and Party Location tracking) using the multi-dimensional `INVENTORY` table.

### Reversal Framework
*   **No Direct Edits**: Existing ledger entries are permanently immutable.
*   **Reversal Transactions**: Cancelling a document (e.g., Dispatch Cancel, Transfer Cancel) creates an exact opposite Reversal Ledger Entry to reconcile the inventory while preserving the audit trail.

### Financial Year Engine
*   Sequences are generated dynamically based on the configurable Financial Year in `SETTINGS` (e.g., `01-Apr to 31-Mar`).
*   Format example: `PO-26-27-00001`. Sequence count automatically resets at FY rollover.

### Initialization & Setup
*   `initializeDatabase()` is a one-click setup script that will:
    1. Create all sheets, headers, and frozen rows.
    2. Populate default `SETTINGS` and `SEQUENCES`.
    3. Create the first Admin user.
    4. Programmatically set up the Apps Script Triggers (e.g., Nightly `DAILY_STOCK_HISTORY` snapshot).

---

## 4. Folder Structure (Strict 4-File SPA Architecture)
*   `Code.gs`: Backend API, Routing, Auth, Ledger Engine, LockService Wrappers, CRUD logic.
*   `Index.html`: Frontend UI shell, Bootstrap Grid, Menus, Modals.
*   `CSS.html`: Styles, DataTables tweaks, Responsive helpers.
*   `JS.html`: Client-side logic, routing, Chart.js integrations, `google.script.run` async calls.