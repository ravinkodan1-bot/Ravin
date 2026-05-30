function generateExecutiveSummaryPDF(jobNo) {
  const folderId = getFolderId();
  if (!folderId) throw new Error("Drive folder not configured for PDF export.");

  const dbId = getDbId();
  let shipmentData = {};
  let tasks = [];

  if (dbId) {
    const ss = SpreadsheetApp.openById(dbId);

    // Get shipment info
    const sData = ss.getSheetByName("SHIPMENTS").getDataRange().getValues();
    const h = sData[0];
    for(let i=1; i<sData.length; i++) {
       if (sData[i][h.indexOf("Job_No")] === jobNo) {
           shipmentData = {
               jobNo: sData[i][h.indexOf("Job_No")],
               importer: sData[i][h.indexOf("Importer")],
               stage: sData[i][h.indexOf("Stage")]
           };
           break;
       }
    }

    // tasks
    const tData = ss.getSheetByName("TASKS").getDataRange().getValues();
    const th = tData[0];
    for(let i=1; i<tData.length; i++) {
        if(tData[i][th.indexOf("Job_No")] === jobNo) {
            tasks.push(tData[i][th.indexOf("Stage")] + " - " + tData[i][th.indexOf("Status")]);
        }
    }
  }

  const doc = DocumentApp.create("Executive_Summary_" + jobNo);
  const body = doc.getBody();
  body.appendParagraph("EXECUTIVE SUMMARY: " + jobNo).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("Generated on: " + new Date().toLocaleString());
  body.appendParagraph("Importer: " + (shipmentData.importer || "N/A"));
  body.appendParagraph("Current Stage: " + (shipmentData.stage || "N/A"));

  body.appendParagraph("Pending Tasks:").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  tasks.forEach(t => body.appendListItem(t));

  doc.saveAndClose();

  const folder = DriveApp.getFolderById(folderId);
  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF);
  const pdfFile = folder.createFile(pdfBlob);

  // Clean up the temp doc
  docFile.setTrashed(true);

  return pdfFile.getUrl();
}

function addWhatsAppLog(data) {
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("FOLLOWUPS");
  sheet.appendRow([Utilities.getUuid(), data.cha, data.contact, data.whatsappDate, data.callDate, data.notes, data.nextFollowup, true]);
  return true;
}
