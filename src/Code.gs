// Code.gs
// Entry point for the Operations Management System

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  // Pass in any required initial server variables here if needed
  return template.evaluate()
      .setTitle('Operations Control Center')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
