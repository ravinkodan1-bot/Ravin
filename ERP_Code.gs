function doGet(e) {
  const template = HtmlService.createTemplateFromFile('ERP_Index');
  return template.evaluate().setTitle(CONFIG.APP_NAME).addMetaTag('viewport', 'width=device-width, initial-scale=1.0').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
