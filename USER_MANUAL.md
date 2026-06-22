# IMS Enterprise v1.0 - User Manual

## System Overview
The IMS Enterprise is a Ledger-First ERP. This means that you **cannot** manually type in stock numbers. Every single change to stock happens via Approved Documents.

## Accessing the System
- Navigate to the Web App URL. The system will automatically log you in using your active Google Account.
- Your permissions (Admin, Manager, User) determine what screens you see. If you receive "Access Denied", contact your Admin to add you to the `USERS` master.

## Transaction Workflows
1. **Purchase Orders**: Generates anticipated inventory tracking.
2. **Sales Orders**: **Approving an SO reserves stock.** It does not physically deduct it. `Available Stock` goes down, `Physical Stock` remains the same.
3. **Dispatch**: Dispatches must be tied to an approved Sales Order. Once dispatched, the previously reserved stock is released and physically deducted from the warehouse.
4. **Internal Transfers**: Moves stock from Warehouse A to Warehouse B. It does not create or destroy stock.

## Dashboards & Reports
- **Dashboard**: Real-time KPI summary showing Available vs Reserved vs Physical stock, plus pending workflow metrics.
- **Reports**: Found under the Reports menu. You can filter by Date Range, Item Code, or Status, and instantly export results to Excel or CSV using the buttons at the top of the grid.
