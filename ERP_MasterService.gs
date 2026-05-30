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
      if (isActiveIndex !== -1 && data[i][isActiveIndex] !== true) continue;
      let rowObj = {};
      for (let j = 0; j < headers.length; j++) rowObj[headers[j]] = data[i][j];
      results.push(rowObj);
    }
    return results;
  } catch(e) { return []; }
}
