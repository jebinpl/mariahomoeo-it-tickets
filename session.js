// ===== Session Timeout =====
let idleTimer;
const IDLE_LIMIT = 10 * 60 * 1000; // 10 minutes

function resetIdleTimer() {
  if (localStorage.getItem("loggedIn") !== "true") return;

  clearTimeout(idleTimer);
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
