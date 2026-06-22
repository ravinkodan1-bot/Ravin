# IMS Enterprise v1.0 - Admin Guide

## Core Responsibilities
Admins hold sweeping capabilities to rebuild the system engines and bypass hard restrictions for recovery.

## Long-Term Data Integrity Rules (FROZEN)
1. `STOCK_LEDGER` is immutable. Never delete rows.
2. `AUDIT_LOGS` are immutable.
3. Inventory is a materialized view only.
4. Reversals create opposite ledger entries.
5. Dispatch always occurs against an approved Sales Order.
6. Reservations affect Reserved Stock only.
7. Physical stock changes only through approved inventory movements.
8. No hard delete for transactional records (Soft deletes only).

## Admin Utilities & Recovery Tools
Found under the **Admin** navigation tab on the frontend:
- **Rebuild Inventory View**: Wipes the `INVENTORY` cache and recalculates it entirely from the immutable `STOCK_LEDGER`. Run this if you suspect a sync issue.
- **Recalculate Running Balance**: Recalculates the chronologically ordered sum of Qty_In/Out for audit tracing in the Ledger.
- **Daily Snapshot Rebuild**: Automatic via trigger, but can be forced if historical trending gets interrupted.

## Backup System
A nightly trigger executes `dailyDatabaseBackup()`, which physically duplicates the Google Sheet into Drive named `IMS_Enterprise_Backup_YYYYMMDD_HHmmss`. Ensure Drive storage quotas are monitored over the years.
