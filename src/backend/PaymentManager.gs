/**
 * Payment Module
 * Lifecycle: Requested -> Submitted -> Processing -> Paid -> Debit Advice Received -> SWIFT Received -> Verified
 */

const PAYMENT_STATUS = {
  REQUESTED: "Requested",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  PAID: "Paid",
  SWIFT_RECEIVED: "SWIFT Received",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled"
};

/**
 * Creates a new Payment Request for a Job.
 */
function requestPayment(jobId, paymentData) {
  try {
    const user = requireRole(["Admin", "Management", "Import", "Accounts"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);

    // In a real flow, validate job exists here.

    const newId = generateUUID();
    const paymentRecord = {
      Payment_ID: newId,
      Job_ID: jobId,
      Payment_Type: paymentData.Payment_Type, // Advance, Balance, Custom Duty, Shipping Line
      Requested_Amount: paymentData.Requested_Amount,
      Status: PAYMENT_STATUS.REQUESTED,
      Paid_Date: "",
      SWIFT_Link: "",
      CreatedBy: user.Email,
      CreatedDateTime: new Date(),
      IsDeleted: "FALSE"
    };

    appendRecord(dbId, "PAYMENTS", paymentRecord);
    appendAudit("PaymentManager", "PAYMENTS", newId, "Request", { newVal: paymentRecord });

    return apiResponse(true, { Payment_ID: newId }, "Payment Requested successfully.");
  } catch (err) {
    logSystemError("requestPayment", err);
    return apiResponse(false, null, err.message);
  }
}

/**
 * Updates a Payment's lifecycle status.
 * Must be executed by Accounts or Admin.
 */
function updatePaymentStatus(paymentId, newStatus, additionalData = {}) {
  try {
    const user = requireRole(["Admin", "Accounts"]);
    const fy = getCurrentFY();
    const dbId = getDatabaseByFY(fy);
    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName("PAYMENTS");

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === paymentId && String(data[i][headers.indexOf("IsDeleted")]).toUpperCase() !== "TRUE") {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return apiResponse(false, null, "Payment not found.");

    const statusCol = headers.indexOf("Status") + 1;
    const oldStatus = sheet.getRange(rowIndex, statusCol).getValue();

    // Status validation logic could go here (e.g. can't go from Requested directly to Verified)

    sheet.getRange(rowIndex, statusCol).setValue(newStatus);

    // Apply conditional updates based on status
    if (newStatus === PAYMENT_STATUS.PAID && additionalData.Paid_Date) {
       const pdCol = headers.indexOf("Paid_Date") + 1;
       sheet.getRange(rowIndex, pdCol).setValue(additionalData.Paid_Date);
    }

    if (newStatus === PAYMENT_STATUS.SWIFT_RECEIVED && additionalData.SWIFT_Link) {
       const sCol = headers.indexOf("SWIFT_Link") + 1;
       sheet.getRange(rowIndex, sCol).setValue(additionalData.SWIFT_Link);
    }

    // Set updated tracker
    sheet.getRange(rowIndex, headers.indexOf("UpdatedBy") + 1).setValue(user.Email);
    sheet.getRange(rowIndex, headers.indexOf("UpdatedDateTime") + 1).setValue(new Date());

    appendAudit("PaymentManager", "PAYMENTS", paymentId, "UpdateStatus", { oldVal: oldStatus, newVal: newStatus });

    // NOTE: In Phase 5 we mentioned Payments do not automatically complete Workflow Tasks.
    // The relevant user must still go to the Task Center and mark "Advance Payment" as "COMPLETED"
    // after the payment reaches 'VERIFIED' status.

    return apiResponse(true, { Payment_ID: paymentId, Status: newStatus }, "Payment status updated.");
  } catch (err) {
    logSystemError("updatePaymentStatus", err);
    return apiResponse(false, null, err.message);
  }
}
