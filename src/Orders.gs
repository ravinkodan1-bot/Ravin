// Orders.gs
// Order Core Engine: CRUD, Enums, Stages, Timeline, and Audit Logs

const ORDER_STAGES = {
  ORDER_RECEIVED: "ORDER_RECEIVED",
  SO_CREATED: "SO_CREATED",
  STOCK_CONFIRMED: "STOCK_CONFIRMED",
  TRANSPORT_ASSIGNED: "TRANSPORT_ASSIGNED",
  BILL_GENERATED: "BILL_GENERATED",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  FEEDBACK_COLLECTED: "FEEDBACK_COLLECTED",
  CLOSED: "CLOSED"
};

const ORDER_STATUSES = {
  DRAFT: "Draft",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DELAYED: "Delayed",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  CANCELLED: "Cancelled"
};

/**
 * Generates the next Order Number based on the SEQUENCES sheet
 */
function generateOrderNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const seqSheet = ss.getSheetByName("SEQUENCES");
  const data = seqSheet.getDataRange().getValues();
  const headers = data[0];

  const nameIdx = headers.indexOf("SequenceName");
  const valIdx = headers.indexOf("CurrentValue");
  const yearIdx = headers.indexOf("Year");

  const currentYear = new Date().getFullYear();

  for (let i = 1; i < data.length; i++) {
    if (data[i][nameIdx] === "SO_SEQUENCE") {
      let seqYear = data[i][yearIdx];
      let currentVal = data[i][valIdx];

      // Reset if year changed
      if (seqYear !== currentYear) {
        seqYear = currentYear;
        currentVal = 0;
      }

      const nextVal = currentVal + 1;

      // Update sheet
      seqSheet.getRange(i + 1, valIdx + 1).setValue(nextVal);
      seqSheet.getRange(i + 1, yearIdx + 1).setValue(seqYear);

      // Format: SO-YYYY-00001
      return `SO-${seqYear}-${nextVal.toString().padStart(5, '0')}`;
    }
  }

  // Fallback if not found (shouldn't happen if initialized)
  return `SO-${currentYear}-00001`;
}

/**
 * Create a new Order
 */
function createOrder(orderData, userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];

    const newOrderId = generateOrderNumber();
    const timestamp = new Date().toISOString();

    // Construct new row based on headers to ensure correct column mapping
    const newRow = new Array(headers.length).fill("");

    const mapField = (field, value) => {
      const idx = headers.indexOf(field);
      if (idx !== -1) newRow[idx] = value;
    };

    mapField("OrderID", newOrderId);
    mapField("OrderDate", orderData.orderDate || timestamp);
    mapField("Company", orderData.company);
    mapField("PartyCode", orderData.partyCode);
    mapField("PartyName", orderData.partyName);
    mapField("Quantity", orderData.quantity);
    mapField("BrandCode", orderData.brandCode);
    mapField("BrandName", orderData.brandName);
    mapField("Rate", orderData.rate);
    mapField("OrderValue", orderData.orderValue);
    mapField("DeliveryTerm", orderData.deliveryTerm);
    mapField("PaymentTerm", orderData.paymentTerm);
    mapField("SaleFrom", orderData.saleFrom);
    mapField("SaleTo", orderData.saleTo);
    mapField("WarehouseID", orderData.warehouseId);
    mapField("SalesPerson", orderData.salesPerson);
    mapField("Priority", orderData.priority || "Normal");
    mapField("OrderSource", orderData.orderSource);
    mapField("CustomerPO", orderData.customerPO);
    mapField("CustomerPODate", orderData.customerPODate);
    mapField("RequiredDeliveryDate", orderData.requiredDeliveryDate);
    mapField("Remarks", orderData.remarks);
    mapField("CurrentStage", ORDER_STAGES.ORDER_RECEIVED);
    mapField("CurrentOwner", userId); // Initially owned by creator
    mapField("OverallStatus", ORDER_STATUSES.OPEN);
    mapField("CreatedAt", timestamp);
    mapField("UpdatedAt", timestamp);
    mapField("IsDeleted", "FALSE");

    ordersSheet.appendRow(newRow);

    // Log Audit and Timeline
    logAudit("ORDERS", newOrderId, "Created", "", "New Order", userId);
    logTimeline(newOrderId, ORDER_STAGES.ORDER_RECEIVED, "Order Created", userId, orderData.remarks);

    // Trigger task generation (Will be handled in Tasks.gs)
    if (typeof generateTasksForStage === 'function') {
      generateTasksForStage(newOrderId, ORDER_STAGES.ORDER_RECEIVED, userId);
    }

    return { success: true, orderId: newOrderId };

  } catch (error) {
    logSystemError("ERROR", "Order creation failed: " + error.toString(), "Orders");
    return { success: false, message: error.toString() };
  }
}

/**
 * Update an existing order stage
 */
function updateOrderStage(orderId, newStage, userId, remarks) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("ORDERS");
    const data = ordersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("OrderID");
    const stageIdx = headers.indexOf("CurrentStage");
    const statusIdx = headers.indexOf("OverallStatus");
    const ownerIdx = headers.indexOf("CurrentOwner");
    const updatedIdx = headers.indexOf("UpdatedAt");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === orderId) {
        const oldStage = data[i][stageIdx];

        ordersSheet.getRange(i + 1, stageIdx + 1).setValue(newStage);
        ordersSheet.getRange(i + 1, updatedIdx + 1).setValue(new Date().toISOString());

        // Determine overall status based on stage
        let newStatus = ORDER_STATUSES.IN_PROGRESS;
        if (newStage === ORDER_STAGES.DISPATCHED) newStatus = ORDER_STATUSES.DISPATCHED;
        if (newStage === ORDER_STAGES.DELIVERED) newStatus = ORDER_STATUSES.DELIVERED;
        if (newStage === ORDER_STAGES.CLOSED) newStatus = ORDER_STATUSES.CLOSED;

        ordersSheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);

        logAudit("ORDERS", orderId, "CurrentStage", oldStage, newStage, userId);
        logTimeline(orderId, newStage, `Stage updated to ${newStage}`, userId, remarks);

        // Auto-generate next task
        if (typeof generateTasksForStage === 'function') {
          generateTasksForStage(orderId, newStage, userId);
        }

        return { success: true };
      }
    }
    return { success: false, message: "Order not found" };
  } catch (error) {
    logSystemError("ERROR", "Stage update failed: " + error.toString(), "Orders");
    return { success: false, message: error.toString() };
  }
}

/**
 * Log Timeline Event
 */
function logTimeline(orderId, stage, action, user, remarks) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("TIMELINE");
  sheet.appendRow([
    generateId("TL"), orderId, stage, action, user, new Date().toISOString(), remarks || "", "FALSE"
  ]);
}

/**
 * Log Audit Event
 */
function logAudit(module, recordId, field, oldValue, newValue, user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AUDIT_LOGS");
  sheet.appendRow([
    generateId("AUD"), module, recordId, field, oldValue, newValue, user, new Date().toISOString(), "FALSE"
  ]);
}

/**
 * Get all active orders (with basic caching/indexing logic if needed later)
 */
function getOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ORDERS");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf("IsDeleted")] === "TRUE") continue;

    let order = {};
    headers.forEach((h, idx) => {
      order[h] = data[i][idx];
    });
    orders.push(order);
  }
  return orders;
}

/**
 * Get order by ID
 */
function getOrderById(orderId) {
  const orders = getOrders();
  return orders.find(o => o.OrderID === orderId) || null;
}
