function getCurrentUser() {
  const email = Session.getActiveUser().getEmail() || "anonymous@unknown.com";
  const dbId = getDbId();
  if (!dbId) return { email: email, role: "Unknown", name: "Guest" };
  try {
    const ss = SpreadsheetApp.openById(dbId);
    const data = ss.getSheetByName("USERS").getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const isActive = data[i][4];
      const emailMatches = (data[i][1] || "").toString().trim().toLowerCase() === email.trim().toLowerCase();
      const isActiveMatches = isActive === true || (typeof isActive === 'string' && (isActive.trim().toUpperCase() === 'TRUE' || isActive.trim().toUpperCase() === 'YES'));

      if (emailMatches && isActiveMatches) {
          return { id: data[i][0], email: data[i][1], role: data[i][2], name: data[i][3] };
      }
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
