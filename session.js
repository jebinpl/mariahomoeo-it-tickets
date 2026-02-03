// ===== Session Timeout =====
let idleTimer;
function getIdleLimit() {
  const role = localStorage.getItem("ROLE");

  if (role === "admin") {
    return 30 * 60 * 1000; // 30 minutes
  }

  return 5 * 60 * 1000; // 5 minutes (default = user)
}

function resetIdleTimer() {
  if (localStorage.getItem("loggedIn") !== "true") return;

  clearTimeout(idleTimer);

  const IDLE_LIMIT = getIdleLimit(); // 🔥 role-based timeout
  idleTimer = setTimeout(logoutUser, IDLE_LIMIT);
}

function logoutUser() {
  if (localStorage.getItem("loggedIn") !== "true") return;

  alert("⚠️ Session expired due to inactivity. Please login again.");

  localStorage.clear();
  clearTimeout(idleTimer);
  location.reload();
}

// Track activity
["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
  window.addEventListener(evt, resetIdleTimer);
});

// Resume timer on refresh
if (localStorage.getItem("loggedIn") === "true") {
  resetIdleTimer();
}



