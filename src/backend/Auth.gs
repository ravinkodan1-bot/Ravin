/**
 * Authentication and Session Management
 */

/**
 * Initializes the frontend session by verifying the user and returning app context.
 * Called when the SPA first loads.
 */
function initSession() {
  try {
    const email = getCurrentUserEmail();
    const users = getUsers();

    // Case-insensitive match for the email
    const user = users.find(u => String(u.Email).toLowerCase() === email.toLowerCase());

    if (!user) {
      // Return a structured error response for unauthorized users
      return apiResponse(false, null, `User ${email} is not authorized to access ImportOps.`);
    }

    // Return essential context to build the UI
    const context = {
      user: {
        id: user.User_ID,
        email: user.Email,
        name: user.Name || user.Email.split('@')[0],
        role: user.Role,
        department: user.Department
      },
      currentFY: getCurrentFY()
    };

    return apiResponse(true, context, "");

  } catch (err) {
    logSystemError("initSession", err);
    return apiResponse(false, null, "Failed to initialize session: " + err.message);
  }
}
