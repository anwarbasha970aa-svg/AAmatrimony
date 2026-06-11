
const API = "http://localhost:5000";

/* =========================
   TOKEN HELPERS
========================= */

// Save token
function setToken(token) {
  localStorage.setItem("token", token);
}

// Get token
function getToken() {
  return localStorage.getItem("token");
}

// Remove token (logout)
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

/* =========================
   JWT DECODE (SAFE VERSION)
========================= */

function getUserId() {
  try {
    const token = getToken();

    if (!token) return null;

    const base64 = token.split(".")[1];
    const payload = JSON.parse(atob(base64));

    return payload.id;

  } catch (error) {
    console.log("Invalid token");
    return null;
  }
}

/* =========================
   LOGIN API
========================= */

async function loginUser(email, password) {
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    return await res.json();

  } catch (error) {
    console.log(error);
    return { message: "Server Error" };
  }
}

/* =========================
   GET PROFILE API
========================= */

async function getProfile() {
  try {
    const res = await fetch(`${API}/profile`, {
      headers: {
        Authorization: getToken()
      }
    });

    return await res.json();

  } catch (error) {
    console.log(error);
    return null;
  }
}

/* =========================
   CHECK LOGIN STATUS
========================= */

function isLoggedIn() {
  return getUserId() !== null;
}