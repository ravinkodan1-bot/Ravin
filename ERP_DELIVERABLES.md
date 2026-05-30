# Import Operations ERP - Final Deliverables

## 1. Final Database Schema & Sheet Headers
The database utilizes Google Sheets. The `setupDatabase` script generates these tables and freezes the header row.
- **SHIPMENTS**: ID, Job_No, Date, Importer, Supplier, BL_No, Container_No, CHA_Name, Stage, ETA, IS_ACTIVE
- **TASKS**: Task_ID, Job_No, Stage, Priority, Status, Assigned_Role, Due_Date, Generated_Auto, IS_ACTIVE
- **TIMELINE**: Timeline_ID, Job_No, Stage, Date, Status, IS_ACTIVE
- **FOLLOWUPS**: Followup_ID, CHA_Name, Contact_Person, Whatsapp_Date, Call_Date, Notes, Next_Followup, IS_ACTIVE
- **COSTING**: Costing_ID, Job_No, Invoice_Value, Duty, Shipping, Transportation, CHA_Charges, Port, Others, Total_Landed, Per_Unit, IS_ACTIVE
- **DOCUMENTS**: Doc_ID, Job_No, Doc_Type, Drive_Folder_URL, File_URL, IS_ACTIVE
- **MASTERS** (IMPORTERS, SUPPLIERS, SHIPPING_LINES, PORTS, CHA_MASTER, GODOWNS, BRANDS, USERS): ID, Name, Code/Role, IS_ACTIVE
- **AUDIT_LOGS**: Timestamp, User, Module, Record_ID, Action, Old_Value, New_Value

## 2. Apps Script File Structure
- `ERP_Code.gs` : Entry point (`doGet`) and router.
- `ERP_Config.gs` : App configuration (Spreadsheet ID, Drive Folder ID via PropertiesService) and Audit DB triggers.
- `ERP_AuthService.gs` : RBAC backend validations.
- `ERP_MasterService.gs` : Fetches UI dropdowns and active records from Master Sheets.
- `ERP_AnalyticsService.gs` : Logic for Dashboard KPIs (Delayed, Duty Pending, DO Expiring, Money Blocked) and CHA performance rankings.
- `ERP_ShipmentService.gs`, `ERP_TaskService.gs`, etc : Domain-specific CRUD services.
- `ERP_Index.html` & Partials : SPA Frontend templates driven by `ERP_CSS_App.html` and component-level JS tags.

## 3. Trigger Matrix
| Trigger Type | Function | Execution | Purpose |
| :--- | :--- | :--- | :--- |
| Time-Driven | `runScheduledEmailAlerts()` | Daily (09:00, 14:00, 18:00) | Send overdue task reminders and daily alerts. |
| Event-Driven | `generateAutoTask()` | Upon `updateShipmentStage` | Dynamically generate next task upon shipment stage change. |

## 4. Auto Task Matrix
| When Stage Updates To... | Generated Task Title | Assigned Role |
| :--- | :--- | :--- |
| ETA Updated | Original Documents Follow-up | Import Team |
| Original Documents Received | IGM Filing | CHA Coordinator |
| IGM Filed | BOE Filing | CHA Coordinator |
| BOE Filed | Duty Planning | Accounts Team |
| Duty Planned | Duty Payment | Accounts Team |
| Duty Paid | OOC Follow-up | CHA Coordinator |
| OOC Received | Shipping Line Payment | Accounts Team |
| Shipping Line Paid | DO Collection | CHA Coordinator |
| DO Released | Dispatch Planning | Import Team |
| Dispatch Planned | Vehicle Arrangement | Import Team |
| Goods Dispatched | Delivery Confirmation | Import Team |

## 5. Role Permission Matrix
- **Admin**: Full access to all SPA modules, full write backend permissions.
- **Management**: View All (Dashboard, Reports).
- **Import Team**: Shipments, Tasks, Documents.
- **Accounts Team**: Costing, Duty, Payments.
- **CHA Coordinator**: Follow-Ups, Timeline, CHA Tracking.
- **Read Only**: View Dashboard only.

## 6. Deployment Steps & Admin Setup Guide
1. Create a new Google Apps Script project.
2. Push this repository code to the Apps Script project (via clasp or manually).
3. Run `setupDatabase()` from the Apps Script editor manually to generate the Google Sheet database.
4. Open Project Settings -> Script Properties and ensure `ERP_DB_ID` and `ERP_FOLDER_ID` (for Google Drive doc exports) are set.
5. Deploy as Web App -> Execute as "User accessing the web app" (so audit logs reflect the correct Google user).
