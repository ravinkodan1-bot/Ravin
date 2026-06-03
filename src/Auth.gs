// Auth.gs
// Authentication, Session Management, and Role-Based Access Control

/**
 * Hash a password using SHA-256
 */
function hashPassword(password) {
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hash = '';
  for (let i = 0; i < signature.length; i++) {
    let byte = signature[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length == 1) byteStr = '0' + byteStr;
    hash += byteStr;
  }
  return hash;
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return Utilities.getUuid();
}

/**
 * Authenticate user and return session token
 */
function loginUser(username, password) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const userIdx = headers.indexOf("Username");
    const passIdx = headers.indexOf("PasswordHash");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");
    const roleIdx = headers.indexOf("Role");
    const tokenIdx = headers.indexOf("SessionToken");
    const lastLoginIdx = headers.indexOf("LastLogin");
    const idIdx = headers.indexOf("UserID");
    const nameIdx = headers.indexOf("Name");

    // Hash provided password to compare (unless it's the initial 'admin123' seed, which we need to handle)
    const providedHash = hashPassword(password);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE" || row[statusIdx] !== "Active") continue;

      if (row[userIdx] === username) {
        // Check password. Also allow plain text 'admin123' for the first time setup.
        if (row[passIdx] === providedHash || (username === 'admin' && password === 'admin123' && row[passIdx] === 'admin123')) {

          // Force password change on first login if it was the default plain text
          if (row[passIdx] === 'admin123') {
            return { success: true, requirePasswordChange: true, userId: row[idIdx], username: username };
          }

          const sessionToken = generateSessionToken();

          // Update SessionToken and LastLogin in DB
          usersSheet.getRange(i + 1, tokenIdx + 1).setValue(sessionToken);
          usersSheet.getRange(i + 1, lastLoginIdx + 1).setValue(new Date().toISOString());

          logSystemError("INFO", `User ${username} logged in successfully`, "Auth");

          return {
            success: true,
            token: sessionToken,
            user: {
              userId: row[idIdx],
              name: row[nameIdx],
              role: row[roleIdx],
              username: row[userIdx]
            }
          };
        }
      }
    }

    return { success: false, message: "Invalid username or password" };
  } catch (error) {
    logSystemError("ERROR", "Login failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred during login." };
  }
}

/**
 * Validate session token
 */
function validateSession(token) {
  if (!token) return false;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const headers = data[0];

    const tokenIdx = headers.indexOf("SessionToken");
    const statusIdx = headers.indexOf("Status");
    const isDeletedIdx = headers.indexOf("IsDeleted");
    const idIdx = headers.indexOf("UserID");
    const roleIdx = headers.indexOf("Role");

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[isDeletedIdx] === "TRUE" || row[statusIdx] !== "Active") continue;

      if (row[tokenIdx] === token) {
        return {
          isValid: true,
          userId: row[idIdx],
          role: row[roleIdx]
        };
      }
    }
    return { isValid: false };
  } catch (error) {
    logSystemError("ERROR", "Session validation failed: " + error.toString(), "Auth");
    return { isValid: false };
  }
}

/**
 * Logout user by clearing session token
 */
function logoutUser(token) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();
    const tokenIdx = data[0].indexOf("SessionToken");

    for (let i = 1; i < data.length; i++) {
      if (data[i][tokenIdx] === token) {
        usersSheet.getRange(i + 1, tokenIdx + 1).setValue("");
        return { success: true };
      }
    }
    return { success: false, message: "Invalid session token" };
  } catch (error) {
    logSystemError("ERROR", "Logout failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred during logout." };
  }
}

/**
 * Update password (used for initial force change or normal change)
 */
function updatePassword(userId, newPassword) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName("USERS");
    const data = usersSheet.getDataRange().getValues();

    const idIdx = data[0].indexOf("UserID");
    const passIdx = data[0].indexOf("PasswordHash");

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === userId) {
        const newHash = hashPassword(newPassword);
        usersSheet.getRange(i + 1, passIdx + 1).setValue(newHash);
        return { success: true, message: "Password updated successfully" };
      }
    }
    return { success: false, message: "User not found" };
  } catch (error) {
    logSystemError("ERROR", "Password update failed: " + error.toString(), "Auth");
    return { success: false, message: "An error occurred updating password." };
  }
}
