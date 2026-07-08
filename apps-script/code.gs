const SHEET_ID = "1RX0yzu4cbs4mzzKAqgu5NxRdSpvrxTpwx2ptqBRGYu4";
const SHEET_NAME = "Leads";
const LOG_SHEET_NAME = "SystemLogs";
const SCRIPT_API_KEY = "skynovara_secure_api_key_2024";

function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (!ss.getSheetByName(SHEET_NAME)) {
    const sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "ID", "Timestamp", "Full Name", "Company Name", "Mobile Number",
      "WhatsApp Number", "Email", "Industry", "Company Size", "City",
      "Current Software", "Automation Requirement", "Budget",
      "Preferred Contact Method", "Message", "Source", "Status", "Notes", "AssignedTo"
    ]);
  }

  if (!ss.getSheetByName(LOG_SHEET_NAME)) {
    const logSheet = ss.insertSheet(LOG_SHEET_NAME);
    logSheet.appendRow(["Timestamp", "Type", "Message", "Data"]);
  }
}

function logError(message, data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (sheet) {
      sheet.appendRow([new Date(), "ERROR", message, JSON.stringify(data)]);
    }
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

function doPost(e) {
  try {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (!e || !e.postData || !e.postData.contents) {
       return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'No data received'
       })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        setup();
        sheet = ss.getSheetByName(SHEET_NAME);
    }

    const id = Utilities.getUuid();
    const timestamp = new Date();

    sheet.appendRow([
      id,
      timestamp,
      data.fullName || "",
      data.companyName || "",
      data.mobileNumber || "",
      data.whatsappNumber || "",
      data.email || "",
      data.industry || "",
      data.companySize || "",
      data.city || "",
      data.currentSoftware || "",
      data.automationRequirement || "",
      data.budget || "",
      data.preferredContactMethod || "",
      data.message || "",
      data.source || "Website",
      "New", // Default status
      "", // Notes
      "" // AssignedTo
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Lead submitted successfully',
      id: id
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logError(error.toString(), e ? e.postData : null);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
     const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // SECURITY FIX: Require API Key for read operations
    if (!e || !e.parameter || e.parameter.api_key !== SCRIPT_API_KEY) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Unauthorized access'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
       return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const headersList = values[0];
    const rows = values.slice(1);

    const leads = rows.map(row => {
      let lead = {};
      headersList.forEach((header, index) => {
        lead[header] = row[index];
      });
      return lead;
    });

    // Optionally handle filtering by ID or status if params are passed
    if (e && e.parameter) {
       // Example: ?id=123&api_key=...
       if (e.parameter.id) {
           const filtered = leads.filter(l => l.ID === e.parameter.id);
           return ContentService.createTextOutput(JSON.stringify({
              status: 'success',
              data: filtered
           })).setMimeType(ContentService.MimeType.JSON);
       }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: leads
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
     logError(error.toString(), null);
     return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
