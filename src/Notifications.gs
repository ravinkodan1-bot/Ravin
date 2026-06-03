// Notifications.gs
// Handles generating and fetching notifications for users and roles.

/**
 * Creates a notification for a specific user.
 *
 * @param {string} userId - The target user ID
 * @param {string} title - Short title of the notification
 * @param {string} message - Full message body
 * @param {string} type - 'Task', 'Alert', 'Info', etc.
 * @param {string} relatedModule - 'ORDERS', 'TASKS', etc. (for deep linking)
 * @param {string} relatedRecordId - The ID of the related record
 */
function createNotification(userId, title, message, type, relatedModule, relatedRecordId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");

    // Schema: NotificationID, UserID, Title, Message, Type, ReadStatus, RelatedModule, RelatedRecordID, CreatedAt, IsDeleted
    sheet.appendRow([
      generateId("NOT"), userId, title, message, type, "Unread", relatedModule, relatedRecordId,
      new Date().toISOString(), "FALSE"
    ]);
  } catch (error) {
    logSystemError("ERROR", "createNotification failed: " + error.toString(), "Notifications");
  }
}

/**
 * Creates a notification for all active users holding a specific role.
 */
function createNotificationForRole(role, title, message, type, relatedModule, relatedRecordId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx = headers.indexOf("UserID");
    const roleIdx = headers.indexOf("Role");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");

    // Collect all user IDs matching the role
    const userIds = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][isDeletedIdx] === "TRUE" || data[i][statusIdx] !== "Active") continue;

      if (data[i][roleIdx] === role) {
        userIds.push(data[i][idIdx]);
      }
    }

    // Create notification for each user
    userIds.forEach(uid => {
      createNotification(uid, title, message, type, relatedModule, relatedRecordId);
    });

  } catch (error) {
    logSystemError("ERROR", "createNotificationForRole failed: " + error.toString(), "Notifications");
  }
}

/**
 * Fetches notifications for a specific user.
 */
function getUserNotifications(userId, unreadOnly = false) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const notifications = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf("IsDeleted")] === "TRUE") continue;

      if (data[i][headers.indexOf("UserID")] === userId) {
        if (unreadOnly && data[i][headers.indexOf("ReadStatus")] !== "Unread") continue;

        let notif = {};
        headers.forEach((h, idx) => {
          notif[h] = data[i][idx];
        });
        notifications.push(notif);
      }
    }

    // Sort descending by CreatedAt
    return notifications.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  } catch (error) {
    logSystemError("ERROR", "getUserNotifications failed: " + error.toString(), "Notifications");
    return [];
  }
}

/**
 * Marks a notification as read.
 */
function markNotificationAsRead(notificationId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();
    const idIdx = data[0].indexOf("NotificationID");
    const readIdx = data[0].indexOf("ReadStatus");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === notificationId) {
        sheet.getRange(i + 1, readIdx + 1).setValue("Read");
        return { success: true };
      }
    }
    return { success: false, message: "Notification not found" };
  } catch (error) {
    logSystemError("ERROR", "markNotificationAsRead failed: " + error.toString(), "Notifications");
    return { success: false, message: error.toString() };
  }
}

/**
 * Marks all notifications as read for a given user.
 */
function markAllNotificationsAsRead(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("NOTIFICATIONS");
    const data = sheet.getDataRange().getValues();

    const idIdx = data[0].indexOf("UserID");
    const readIdx = data[0].indexOf("ReadStatus");
    const isDeletedIdx = data[0].indexOf("IsDeleted");

    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][isDeletedIdx] === "TRUE") continue;

      if (data[i][idIdx] === userId && data[i][readIdx] === "Unread") {
        sheet.getRange(i + 1, readIdx + 1).setValue("Read");
        updated = true;
      }
    }
    return { success: true, updated: updated };
  } catch (error) {
    logSystemError("ERROR", "markAllNotificationsAsRead failed: " + error.toString(), "Notifications");
    return { success: false, message: error.toString() };
  }
}
