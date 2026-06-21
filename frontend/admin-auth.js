/* =========================
   ADMIN AUTH
========================= */

// Get Admin Token
function getAdminToken() {
  return localStorage.getItem("adminToken");
}

// Check Admin Login
function isAdminLoggedIn() {
  return getAdminToken() !== null;
}

// Redirect if not logged in
if (!isAdminLoggedIn()) {
  window.location.href = "admin-login.html";
}

// Admin Logout
function adminLogout() {
  localStorage.removeItem("adminToken");
  window.location.href = "admin-login.html";
}