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
    if (data[i][jobNoIdx] === jobNo && data[i][data[0].indexOf("IS_ACTIVE")] === true) {
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
