# IMS Enterprise v1.0 - Deployment Guide

## Prerequisites
- A Google Workspace or Gmail Account.
- Access to Google Drive to host the Database Spreadsheet and Apps Script.

## Go-Live Checklist
1. **Create Database Backup Folder**: Ensure your Drive has a dedicated folder for backups if needed.
2. **Setup Script Properties**:
   - Open Apps Script Editor.
   - Go to **Project Settings** (gear icon) -> **Script Properties**.
   - Add property: `MASTER_SPREADSHEET_ID` with the ID of your target Google Sheet.
3. **Execute Initialization**:
   - Run the `initializeDatabase()` function manually once from the Apps Script Editor.
   - *This will auto-generate all 18+ sheets, assign the active user as Admin, populate default SETTINGS (including APP_VERSION 1.0.0), and install the automated Nightly Triggers.*
4. **Initial Verification**:
   - Verify `SEQUENCES` and `SETTINGS` sheets populated.
   - Run `triggerInventoryRebuild()` once from the backend or Admin panel to ensure the engine is aligned.
5. **Publish as Web App**:
   - Click **Deploy** -> **New Deployment**.
   - Select **Web app**.
   - Execute as: *User accessing the web app* (Ensures RBAC auth works).
   - Who has access: *Anyone with Google Account* (or Domain-restricted).
   - Deploy and distribute the URL.

## Recommended Metadata Check
Ensure `SETTINGS` sheet has:
- `APP_VERSION` = 1.0.0
- `DB_VERSION` = 1.0.0
- `RELEASE_DATE` = [Current Date]
