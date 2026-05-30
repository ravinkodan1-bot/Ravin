function getActiveShipments() { return getMasterDataList("SHIPMENTS"); }

function saveNewShipment(data) {
  validatePermission(['Admin', 'Import Team', 'Management']);
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("SHIPMENTS");
  const id = Utilities.getUuid();
  sheet.appendRow([id, data.jobNo, new Date(), data.importer, data.supplier, data.blNo, data.containerNo, data.chaName, data.stage, data.eta, true]);
  logAudit("SHIPMENTS", data.jobNo, "CREATE", null, data);
  return true;
}

function updateShipmentStage(jobNo, newStage) {
  validatePermission(['Admin', 'Import Team']);
  const dbId = getDbId();
  if (!dbId) return false;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("SHIPMENTS");
  const data = sheet.getDataRange().getValues();
  let updated = false;
  let oldStage = "";
  const jobNoIdx = data[0].indexOf("Job_No");
  const stageIdx = data[0].indexOf("Stage");
  for (let i = 1; i < data.length; i++) {
    const isActiveVal = data[i][data[0].indexOf("IS_ACTIVE")]; if (data[i][jobNoIdx] === jobNo && (isActiveVal === true || String(isActiveVal).trim().toUpperCase() === "TRUE" || String(isActiveVal).trim().toUpperCase() === "YES")) {
      oldStage = data[i][stageIdx];
      sheet.getRange(i + 1, stageIdx + 1).setValue(newStage);
      updated = true; break;
    }
  }
  if (updated && oldStage !== newStage) {
    addTimelineEntry(jobNo, newStage, "Completed");
    generateAutoTask(jobNo, newStage);
    logAudit("SHIPMENTS", jobNo, "UPDATE_STAGE", oldStage, newStage);
    clearCacheKeys();
  }
  return updated;
}

/**
 * Adds an entry to the shipment timeline.
 */
function addTimelineEntry(jobNo, stage, status) {
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("TIMELINE");
  const timelineId = Utilities.getUuid();

  sheet.appendRow([
    timelineId,
    jobNo,
    stage,
    new Date(),
    status,
    true
  ]);
}

function getCosting(jobNo) {
  const dbId = getDbId();
  if (!dbId) return null;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("COSTING");
  if(!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][1] === jobNo) {
        return {
            invoice: data[i][2],
            duty: data[i][3],
            shipping: data[i][4],
            transport: data[i][5],
            cha: data[i][6],
            port: data[i][7],
            other: data[i][8],
            qty: data[i][9]
        };
    }
  }
  return null;
}

function saveCosting(data) {
  validatePermission(['Admin', 'Import Team', 'Management', 'Accounts Team']);
  const dbId = getDbId();
  if (!dbId) return;
  const ss = SpreadsheetApp.openById(dbId);
  const sheet = ss.getSheetByName("COSTING");
  const rowData = sheet.getDataRange().getValues();

  let rowToUpdate = -1;
  for(let i=1; i<rowData.length; i++) {
      if(rowData[i][1] === data.jobNo) {
          rowToUpdate = i + 1;
          break;
      }
  }

  if(rowToUpdate !== -1) {
      sheet.getRange(rowToUpdate, 3, 1, 8).setValues([[data.invoice, data.duty, data.shipping, data.transport, data.cha, data.port, data.other, data.qty]]);
  } else {
      const id = Utilities.getUuid();
      sheet.appendRow([id, data.jobNo, data.invoice, data.duty, data.shipping, data.transport, data.cha, data.port, data.other, data.qty]);
  }
}

function getShipmentTimeline(jobNo) {
    const dbId = getDbId();
    if(!dbId) return [];
    try {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("TIMELINE");
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const results = [];
        for(let i=1; i<data.length; i++) {
            if(data[i][1] === jobNo) {
                let rowObj = {};
                for(let j=0; j<headers.length; j++) rowObj[headers[j]] = data[i][j];
                results.push(rowObj);
            }
        }
        return results.sort((a,b) => new Date(a.Date) - new Date(b.Date));
    } catch(e) { return []; }
}

function getShipmentDocs(jobNo) {
  const dbId = getDbId();
  if (!dbId) return [];
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("DOCUMENTS");
    if(!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = [];
    for(let i=1; i<data.length; i++) {
      if(data[i][1] === jobNo) {
        results.push({
            DocType: data[i][2],
            URL: data[i][3],
            Date: data[i][4]
        });
      }
    }
    return results;
  } catch(e) { return []; }
}

function uploadDocumentToDrive(jobNo, docType, fileName, mimeType, base64Data) {
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    const folderName = "ERP_Shipment_Docs_" + jobNo;

    // Find or create folder
    let folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if(folders.hasNext()) {
        folder = folders.next();
    } else {
        folder = DriveApp.createFolder(folderName);
    }

    const file = folder.createFile(blob);
    const url = file.getUrl();

    // Save to sheet
    const dbId = getDbId();
    if(dbId) {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("DOCUMENTS");
        if(sheet) {
            sheet.appendRow([Utilities.getUuid(), jobNo, docType, url, new Date()]);
        }
    }
    return url;
}
