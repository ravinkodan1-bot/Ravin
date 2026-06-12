// Google Sheet ID and Tab Name based on requirements
const SPREADSHEET_ID = '185kq8p4fDor_wdRkR8STJN5M3TUWSwHJSUGuD4oxxwU';
const SHEET_NAME = 'SALE2.0';

/**
 * Serves the HTML application.
 * Follows the 4-file SPA architecture requirement.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Premium Management Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Includes HTML files (like CSS.html and JS.html) into Index.html
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Fetches dashboard data, filters it if parameters are provided,
 * and calculates KPIs and Chart aggregations dynamically.
 */
function getDashboardData(filters = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("Sheet '" + SHEET_NAME + "' not found.");
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: 'error', message: 'No data available in the sheet.' };
    }

    const headers = data[0].map(h => String(h).trim().toUpperCase());
    const rows = data.slice(1);

    // Identify crucial column indexes
    const dateIdx = headers.indexOf('DATE');
    const brandIdx = headers.indexOf('BRAND');
    const invoiceIdx = headers.indexOf('INVOICE');
    const totalPairsIdx = headers.indexOf('TOTAL PAIRS');
    const totalAmountIdx = headers.indexOf('TOTAL AMOUNT');

    // SKU columns are assumed to be all headers that are numeric (e.g., '6007', '6057')
    const skuColumns = [];
    headers.forEach((header, index) => {
      if (!isNaN(parseInt(header, 10)) && header.length === 4) {
        skuColumns.push({ header: header, index: index });
      }
    });

    // Parse filters (using strings for robust YYYY-MM-DD comparison)
    const startDateStr = filters.startDate ? filters.startDate : null;
    const endDateStr = filters.endDate ? filters.endDate : null;
    const filterBrand = filters.brand ? String(filters.brand).trim().toUpperCase() : null;
    const scriptTimeZone = Session.getScriptTimeZone();

    // Initialization for aggregations
    let totalPairs = 0;
    let totalAmount = 0;
    let totalInvoices = new Set();

    const brandAgg = {};
    const skuAgg = {};
    const dailyAgg = {};
    const uniqueBrands = new Set();

    rows.forEach(row => {
      // Basic extraction
      const rawDate = row[dateIdx];
      const brand = String(row[brandIdx] || "").trim();
      const invoice = String(row[invoiceIdx] || "").trim();

      const pairs = parseFloat(row[totalPairsIdx]) || 0;
      const amount = parseFloat(row[totalAmountIdx]) || 0;

      // Handle Date Parsing
      let rowDate = new Date(rawDate);
      if (isNaN(rowDate.getTime())) {
        // If date is invalid, we might skip or put in a default bucket, but for filtering we must skip
        return;
      }

      const dateString = Utilities.formatDate(rowDate, scriptTimeZone, "yyyy-MM-dd");

      // Collect unique brands for the dropdown filter (unfiltered)
      if (brand) uniqueBrands.add(brand);

      // Apply Filters
      if (startDateStr && dateString < startDateStr) return;
      if (endDateStr && dateString > endDateStr) return;
      if (filterBrand && brand.toUpperCase() !== filterBrand) return;

      // Calculate KPIs
      totalPairs += pairs;
      totalAmount += amount;
      if (invoice) totalInvoices.add(invoice);

      // Aggregate by Brand (for Doughnut Chart)
      if (brand) {
        brandAgg[brand] = (brandAgg[brand] || 0) + amount;
      }

      // Aggregate by Daily Trends (for Line Chart)
      if (!dailyAgg[dateString]) {
        dailyAgg[dateString] = { pairs: 0, amount: 0 };
      }
      dailyAgg[dateString].pairs += pairs;
      dailyAgg[dateString].amount += amount;

      // Aggregate by SKU (for Bar Chart)
      skuColumns.forEach(skuCol => {
        const skuQty = parseFloat(row[skuCol.index]) || 0;
        if (skuQty > 0) {
          skuAgg[skuCol.header] = (skuAgg[skuCol.header] || 0) + skuQty;
        }
      });
    });

    // Formatting outputs

    // Sort and format Daily Trend data
    const sortedDates = Object.keys(dailyAgg).sort();
    const trendData = {
      labels: sortedDates,
      amounts: sortedDates.map(d => Number(dailyAgg[d].amount.toFixed(2))),
      pairs: sortedDates.map(d => Number(dailyAgg[d].pairs.toFixed(2)))
    };

    // Sort and format Brand data
    const brandLabels = Object.keys(brandAgg);
    const brandAmounts = brandLabels.map(b => Number(brandAgg[b].toFixed(2)));

    // Sort and format SKU data (Top 10 SKUs)
    const sortedSKUs = Object.keys(skuAgg).sort((a, b) => skuAgg[b] - skuAgg[a]).slice(0, 10);
    const skuData = {
      labels: sortedSKUs,
      quantities: sortedSKUs.map(sku => Number(skuAgg[sku].toFixed(2)))
    };

    const invoiceCount = totalInvoices.size;
    const avgPerInvoice = invoiceCount > 0 ? (totalAmount / invoiceCount) : 0;

    return {
      status: 'success',
      kpis: {
        totalPairs: Number(totalPairs.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        totalInvoices: invoiceCount,
        avgAmountPerInvoice: Number(avgPerInvoice.toFixed(2))
      },
      charts: {
        trend: trendData,
        brand: {
          labels: brandLabels,
          amounts: brandAmounts
        },
        sku: skuData
      },
      filtersData: {
        brands: Array.from(uniqueBrands).sort()
      }
    };

  } catch (err) {
    // Basic error handling log
    console.error("Error in getDashboardData: " + err.toString());
    return { status: 'error', message: err.toString() };
  }
}
