# Changelog

## [1.0.0] - Production Release Candidate
### Added
- Phase 1: Core Framework, RBAC, Database Initialization, and SPA structure.
- Phase 2: Materialized Inventory View architecture, Admin Utilities, Generic CRUD services.
- Phase 3: Transaction Routing (PO, SO, Dispatch, Transfers) with full Ledger logic.
- Phase 3: Immutable Reversal Architecture (`reverseTransaction`).
- Phase 3: Reservation Engine ensuring SO Approvals reserve stock and do not physically deduct.
- Phase 4: Dynamic Reporting Engine supporting server-side Array filtering.
- Phase 4: Executive Dashboard with KPI lookups and Chart.js integration.
- Phase 5: DriveApp-based Nightly Database Backups.
- Phase 5: Excel/CSV/Copy Export modules integrated into the Reporting Datatables.

### Security & Compliance
- LockService concurrency protection enforced on all inventory-impacting endpoints.
- Apps Script PropertiesService implemented to secure `MASTER_SPREADSHEET_ID`.
- Comprehensive `AUDIT_LOGS` capture enforced globally.
