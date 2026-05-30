function getCurrentUser() {
  const email = Session.getActiveUser().getEmail() || "anonymous@unknown.com";
  const dbId = getDbId();
  if (!dbId) return { email: email, role: "Unknown", name: "Guest" };
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const data = ss.getSheetByName("USERS").getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email && data[i][4] === true) return { id: data[i][0], email: data[i][1], role: data[i][2], name: data[i][3] };
    }
  } catch(e) {}
  return { email: email, role: "Read Only", name: email.split('@')[0] };
}

/**
 * Validates backend permissions.
 */
function validatePermission(requiredRoles) {
  const user = getCurrentUser();
  if (user.role === 'Admin') return true;
  if (requiredRoles.includes(user.role)) return true;
  throw new Error("Unauthorized Access");
}
