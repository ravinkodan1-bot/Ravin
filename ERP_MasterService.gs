function getMasterDataList(sheetName) {
  const dbId = getDbId();
  if (!dbId) return [];
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = [];
    const isActiveIndex = headers.indexOf("IS_ACTIVE");
    for (let i = 1; i < data.length; i++) {
      if (isActiveIndex !== -1) { const val = data[i][isActiveIndex]; if (val !== true && String(val).trim().toUpperCase() !== "TRUE" && String(val).trim().toUpperCase() !== "YES") continue; }
      let rowObj = {};
      for (let j = 0; j < headers.length; j++) rowObj[headers[j]] = data[i][j];
      results.push(rowObj);
    }
    return results;
  } catch(e) { return []; }
}

function getEntities() {
    return getMasterDataList("ENTITIES");
}

function getAllEntities() {
    const dbId = getDbId();
    if (!dbId) return [];
    try {
        const ss = SpreadsheetApp.openById(dbId);
        const sheet = ss.getSheetByName("ENTITIES");
        if (!sheet) return [];
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const results = [];
        for (let i = 1; i < data.length; i++) {
            let rowObj = {};
            for (let j = 0; j < headers.length; j++) rowObj[headers[j]] = data[i][j];
            results.push(rowObj);
        }
        return results;
    } catch(e) { return []; }
}

function saveNewEntity(data) {
    validatePermission(['Admin', 'Management']);
    const dbId = getDbId();
    if (!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("ENTITIES");
    const id = Utilities.getUuid();
    sheet.appendRow([id, data.type, data.name, data.email, data.contact, true]);
}

function updateEntityStatus(id, isActive) {
    validatePermission(['Admin', 'Management']);
    const dbId = getDbId();
    if (!dbId) return;
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("ENTITIES");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf("ID");
    const activeIdx = data[0].indexOf("IS_ACTIVE");
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === id) {
            sheet.getRange(i + 1, activeIdx + 1).setValue(isActive);
            break;
        }
    }
}
