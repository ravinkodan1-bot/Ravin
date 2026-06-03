# Operations Control Center - Deployment Guide

This document outlines the steps to deploy the Operations Control Center as a production-ready Web App using Google Apps Script.

## Prerequisites

1.  A Google Workspace account (or personal Google account).
2.  A new Google Spreadsheet to act as the database.
3.  A Google Drive folder to store document uploads.

## Deployment Steps

### 1. Initialize the Google Sheet

1.  Create a new Google Sheet.
2.  Open the script editor by clicking **Extensions > Apps Script**.
3.  Name the project "Operations Control Center".

### 2. Copy Code to Apps Script

1.  Create all required `.gs` and `.html` files in the Apps Script editor to match the provided file structure.
    *   **GS Files:** `Code.gs`, `Auth.gs`, `Orders.gs`, `Tasks.gs`, `SLA.gs`, `Notifications.gs`, `Dashboard.gs`, `Reports.gs`, `Utils.gs`.
    *   **HTML Files:** `Index.html`, `CSS.html`, `JS.html`, `Components.html`, `Dashboard.html`, `Orders.html`, `Tasks.html`, `Reports.html`, `Settings_Users.html`.
2.  Copy the content from the provided source files into the corresponding files in the Apps Script editor.

### 3. Initialize the Database

1.  In the Apps Script editor, open `Utils.gs`.
2.  Select the function `initializeSystem` from the dropdown menu at the top.
3.  Click the **Run** button.
4.  You will be prompted to grant permissions. Follow the prompts to allow the script to access your spreadsheet.
5.  Return to your Google Sheet to verify that all 18 tables (USERS, ORDERS, CONFIG, etc.) and their headers have been created successfully.

### 4. Install the SLA Trigger

1.  In the Apps Script editor, open `SLA.gs`.
2.  Select the function `installSLATrigger` from the dropdown menu.
3.  Click the **Run** button.
4.  This configures the background engine to scan tasks and process SLAs every 15 minutes.

### 5. Deploy as a Web App

1.  In the top right corner of the Apps Script editor, click **Deploy > New deployment**.
2.  Click the gear icon next to "Select type" and choose **Web app**.
3.  **Description:** "Production v1.0"
4.  **Execute as:** "Me" (This ensures the script has access to your Sheets and Drive).
5.  **Who has access:** "Anyone" (Security is handled by our internal `Auth.gs` login screen).
6.  Click **Deploy**.
7.  Copy the generated **Web app URL**. This is the link users will use to access the system.

### 6. Post-Deployment Configuration

1.  Open the **Web app URL** in a browser.
2.  Log in using the default credentials:
    *   **Username:** `admin`
    *   **Password:** `admin123`
3.  You will be forced to change the password upon first login.
4.  Once logged in, navigate to **Settings**.
5.  Update the `DRIVE_FOLDER_ID` with the ID of your Google Drive folder where uploaded documents should be saved.
6.  Navigate to **Users** and start provisioning accounts for your Sales, Dispatch, Billing, and CRM teams.

## Maintenance

*   **Database Scaling:** Google Sheets supports up to 10 million cells. Once you approach this limit, historical data from `AUDIT_LOGS`, `TIMELINE`, and `ORDERS` can be archived into a secondary sheet.
*   **Re-deploying Updates:** If you modify the codebase in the future, you MUST click **Deploy > Manage deployments > Edit > New version** to ensure users see the updated code.
