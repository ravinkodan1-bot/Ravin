const MASTER_SHEET_ID = "1oh5Nsb8wSjUtXov_8Hz_ifLOt1J1FYe-LN0ynjzIe3Q";

const SUBMISSION_SHEET_ID = "1n-7Lgd4_S4oUHWh_v4EV3OmHThB_mvR76qu28ToGD5k";



function doGet() {

  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle("Import Purchase App")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');

}



function getMasterData() {

  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);



  // PARTIES

  const partySheet = ss.getSheetByName("Parties");

  const partyData = partySheet
    .getRange(2,1,partySheet.getLastRow()-1,2)
    .getValues();

  let parties = [];

  partyData.forEach(r => {

    if(r[0] && r[1]){

      parties.push({

        code : r[0].toString(),
        name : r[1].toString()

      });

    }

  });




  // BRANDS

  const brandSheet = ss.getSheetByName("Brands");

  const brandData = brandSheet
    .getRange(2,1,brandSheet.getLastRow()-1,2)
    .getValues();

  let brands = [];

  brandData.forEach(r => {

    if(r[0] && r[1]){

      brands.push({

        code : r[0].toString(),
        name : r[1].toString()

      });

    }

  });




  return {

    parties : parties,
    brands : brands

  };

}




function saveData(obj){

  try{

    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);

    const sheet = ss.getSheetByName("Submissions");



    sheet.appendRow([

      new Date(),

      obj.fromParty,
      obj.fromPartyCode,

      obj.toParty,
      obj.toPartyCode,

      obj.qty,

      obj.brandName,
      obj.brandCode,

      obj.vehicleNo,

      obj.remarks

    ]);


    return "Success";

  }

  catch(err){

    return err.toString();

  }

}

function saveImportData(obj) {
  try {
    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
    let sheet = ss.getSheetByName("Imports");
    if (!sheet) {
      sheet = ss.insertSheet("Imports");
      sheet.appendRow([
        "Timestamp", "Date", "Job No", "Owner", "Importer", "Supplier/Manufacturer",
        "Item Description", "Invoice No", "Invoice Value", "Quantity", "Rate", "BL No.",
        "Shipping Line", "DO Validity", "BE No", "BE Date", "Origin", "POD", "ETA POD",
        "ETA CFS", "Payment Terms", "Payment Status", "Pending Amount", "Telex Received",
        "NN Documents", "IGM File", "Duty Payment", "Status Duty Pending", "OOC",
        "Shipping Line Payment", "Status Line Payment", "DO Released", "Remarks"
      ]);
    }

    sheet.appendRow([
      new Date(),
      obj.importDate,
      obj.jobNo,
      obj.owner,
      obj.importer,
      obj.supplier,
      obj.itemDesc,
      obj.invoiceNo,
      obj.invoiceValue,
      obj.importQty,
      obj.rate,
      obj.blNo,
      obj.shippingLine,
      obj.doValidity,
      obj.beNo,
      obj.beDate,
      obj.origin,
      obj.pod,
      obj.etaPod,
      obj.etaCfs,
      obj.paymentTerms,
      obj.paymentStatus,
      obj.pendingAmount,
      obj.telexReceived,
      obj.nnDocuments,
      obj.igmFile,
      obj.dutyPayment,
      obj.statusDutyPending,
      obj.ooc,
      obj.shippingLinePayment,
      obj.statusLinePayment,
      obj.doReleased,
      obj.importRemarks
    ]);

    return "Success";
  } catch(err) {
    return err.toString();
  }
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);
  const sheet = ss.getSheetByName("Imports");

  let result = {
    totalPendingAmount: 0,
    dutyPendingCount: 0,
    arrivingThisWeekCount: 0
  };

  if (!sheet) return result;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return result;

  const headers = data[0];
  const pendingAmountIdx = headers.indexOf("Pending Amount");
  const statusDutyPendingIdx = headers.indexOf("Status Duty Pending");
  const etaPodIdx = headers.indexOf("ETA POD");

  let now = new Date();
  let oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Total Pending Amount
    let pendingAmt = parseFloat(row[pendingAmountIdx]);
    if (!isNaN(pendingAmt)) {
      result.totalPendingAmount += pendingAmt;
    }

    // Shipments with Duty Pending
    if (row[statusDutyPendingIdx] === "Pending") {
      result.dutyPendingCount++;
    }

    // Shipments Arriving This Week
    let eta = new Date(row[etaPodIdx]);
    if (eta >= now && eta <= oneWeekFromNow) {
      result.arrivingThisWeekCount++;
    }
  }

  return result;
}

function sendDailyReminders() {
  const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);

  const importsSheet = ss.getSheetByName("Imports");
  if (!importsSheet) return;
  const importsData = importsSheet.getDataRange().getValues();
  if (importsData.length <= 1) return;

  const masterSs = SpreadsheetApp.openById(MASTER_SHEET_ID);
  const doerSheet = masterSs.getSheetByName("Doer");
  let doerEmails = {};

  if (doerSheet) {
    const doerData = doerSheet.getDataRange().getValues();
    for (let i = 1; i < doerData.length; i++) {
      let doerName = doerData[i][0];
      let doerEmail = doerData[i][1];
      if (doerName && doerEmail) {
        doerEmails[doerName.toString().trim().toLowerCase()] = doerEmail.toString().trim();
      }
    }
  }

  const headers = importsData[0];
  const ownerIdx = headers.indexOf("Owner");
  const jobNoIdx = headers.indexOf("Job No");
  const paymentStatusIdx = headers.indexOf("Payment Status");
  const etaPodIdx = headers.indexOf("ETA POD");
  const doValidityIdx = headers.indexOf("DO Validity");

  let now = new Date();
  now.setHours(0,0,0,0);

  let threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);

  for (let i = 1; i < importsData.length; i++) {
    const row = importsData[i];
    const owner = row[ownerIdx] ? row[ownerIdx].toString().trim() : "";
    const ownerKey = owner.toLowerCase();
    const email = doerEmails[ownerKey] || "mis@pvcresin.in";

    const jobNo = row[jobNoIdx];
    const paymentStatus = row[paymentStatusIdx];

    let etaPod = new Date(row[etaPodIdx]);
    etaPod.setHours(0,0,0,0);

    let doValidity = new Date(row[doValidityIdx]);
    doValidity.setHours(0,0,0,0);

    let reminders = [];

    if (paymentStatus === "Pending") {
      reminders.push("Payment Status is Pending.");
    }
    if (etaPod.getTime() === threeDaysFromNow.getTime()) {
      reminders.push(`ETA POD is approaching in 3 days (${etaPod.toDateString()}).`);
    }
    if (doValidity.getTime() === threeDaysFromNow.getTime()) {
      reminders.push(`DO Validity is approaching in 3 days (${doValidity.toDateString()}).`);
    }

    if (reminders.length > 0) {
      let subject = `Action Required: Import Purchase Reminder for Job No: ${jobNo}`;
      let body = `Hello ${owner},\n\nThis is an automated reminder for Job No: ${jobNo}.\n\n` +
                 `The following items need your attention:\n` +
                 reminders.map(r => "- " + r).join("\n") +
                 `\n\nPlease take the necessary actions.\n\nThank you.`;

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        name: "Import Purchase System"
      });
    }
  }
}

function createDailyTrigger() {
  ScriptApp.newTrigger('sendDailyReminders')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
}