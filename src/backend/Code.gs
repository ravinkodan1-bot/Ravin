/**
 * ImportOps - Main Entry Point
 */

/**
 * Handles GET requests to the Web App.
 * Follows the SPA 4-file architecture.
 */
function doGet(e) {
  // We need to serve index.html
  // As this is a generic setup for GAS, we build the template.
  let template = HtmlService.createTemplateFromFile('Index');

  // Mobile meta tag must be explicitly added here
  return template.evaluate()
    .setTitle('ImportOps ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Helper to include other HTML files (CSS, JS, UI components) into the main Index.html
 * Can be called natively via scriptlets or asynchronously from the client.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Standard API Response Wrapper
 */
function apiResponse(success, data, errorMessage = "") {
  return {
    success: success,
    data: data,
    error: errorMessage
  };
}
