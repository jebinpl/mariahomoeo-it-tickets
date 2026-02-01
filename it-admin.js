/* ===============================
   IT ADMIN MODULE
================================ */

let adminEditId = null;
let adminTickets = [];

/* ELEMENTS */
const adminForm = document.getElementById("adminForm");
const adminDivision = document.getElementById("adminDivision");
const adminDepartment = document.getElementById("adminDepartment");
const adminDescription = document.getElementById("adminDescription");
const adminStatus = document.getElementById("adminStatus");
const adminTable = document.getElementById("adminTable");
const adminOpenCount = document.getElementById("adminOpenCount");

/* ===============================
   REAL-TIME LISTENER
================================ */
db.collection("it_admin")
  .orderBy("createdAt", "desc")
  .onSnapshot(snapshot => {
    adminTickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderAdminTickets();
  });

/* ===============================
   CREATE / EDIT TICKET
================================ */
if (adminForm) {
  adminForm.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      division: adminDivision.value.trim(),
      department: adminDepartment.value.trim(),
      description: adminDescription.value.trim(),
      status: adminStatus.value || "",
      action: adminEditId
        ? adminTickets.find(t => t.id === adminEditId).action
        : "Open"
    };

    /* ✏️ EDIT */
    if (adminEditId) {
      db.collection("it_admin")
        .doc(adminEditId)
        .update(data)
        .then(closeAdminForm)
        .catch(err => console.error("Update failed:", err));
      return;
    }

    /* ➕ CREATE ITA-0001 */
    db.collection("it_admin")
      .orderBy("ticketNo", "desc")
      .limit(1)
      .get()
      .then(snapshot => {
        let next = 1;

        if (!snapshot.empty) {
          const last = snapshot.docs[0].data().ticketNo;
          if (last && last.startsWith("ITA-")) {
            next = parseInt(last.split("-")[1]) + 1;
          }
        }

        const ticketNo = `ITA-${String(next).padStart(4, "0")}`;

        return db.collection("it_admin").add({
          ...data,
          ticketNo,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(closeAdminForm)
      .catch(err => {
        console.error(err);
        alert("❌ Failed to create ticket");
      });
  });
}

/* ===============================
   OPEN / CLOSE FORM
================================ */
function openAdminForm() {
  adminForm.classList.remove("hidden");
  adminStatus.disabled =
  (window.ROLE || localStorage.getItem("ROLE")) !== "admin";
}

function closeAdminForm() {
  adminForm.classList.add("hidden");
  adminForm.reset();
  adminEditId = null;
}

/* ===============================
   EDIT TICKET
================================ */
function editAdminTicket(t) {
  adminEditId = t.id;
  adminDivision.value = t.division;
  adminDepartment.value = t.department;
  adminDescription.value = t.description;
  adminStatus.value = t.status || "";
  openAdminForm();
}

/* ===============================
   UPDATE ACTION
================================ */
function updateAdminAction(id, value) {
  db.collection("it_admin").doc(id).update({ action: value });
}

/* ===============================
   DELETE TICKET
================================ */
function deleteAdminTicket(id, action) {
  if (action !== "Closed") {
    alert("❌ Close ticket before deleting");
    return;
  }

  if (!confirm("⚠️ Delete this ticket?")) return;

  db.collection("it_admin").doc(id).delete();
}

/* ===============================
   RENDER TABLE
================================ */
function renderAdminTickets() {
  const currentRole = localStorage.getItem("ROLE"); // 🔥 FINAL SOURCE

  adminTable.innerHTML = "";

  const open = adminTickets.filter(t => t.action === "Open").length;
  if (adminOpenCount) adminOpenCount.textContent = open;

  adminTickets.forEach(t => {
    adminTable.innerHTML += `
      <tr>
        <td>${t.ticketNo || "-"}</td>
        <td>${t.division || "-"}</td>
        <td>${t.department || "-"}</td>
        <td>${t.description || "-"}</td>
        <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${t.status || "-"}</td>
        <td>
          ${
            currentRole === "admin"
              ? `
              <div style="display:flex;gap:5px;justify-content:center;">
                <select onchange="updateAdminAction('${t.id}',this.value)">
                  <option ${t.action==="Open"?"selected":""}>Open</option>
                  <option ${t.action==="Pending"?"selected":""}>Pending</option>
                  <option ${t.action==="Work In Progress"?"selected":""}>Work In Progress</option>
                  <option ${t.action==="Resolved"?"selected":""}>Resolved</option>
                  <option ${t.action==="Closed"?"selected":""}>Closed</option>
                </select>
                <button onclick='editAdminTicket(${JSON.stringify(t)})'>✏️</button>
                <button onclick="deleteAdminTicket('${t.id}','${t.action}')">🗑️</button>
              </div>`
              : t.action
          }
        </td>
      </tr>
    `;
  });
}

/* ===============================
   EXPORT EXCEL
================================ */
function exportAdminExcel() {
  if (adminTickets.length === 0) {
    alert("No IT-Admin tickets to export");
    return;
  }

  let rows = [
    ["Ticket ID", "Division", "Department", "Description", "Date", "Status", "Action"]
  ];

  adminTickets.forEach(t => {
    rows.push([
      t.ticketNo || "-",
      t.division || "-",
      t.department || "-",
      t.description || "-",
      t.createdAt ? t.createdAt.toDate().toLocaleString() : "-",
      t.status || "-",
      t.action || "-"
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "IT Admin Tickets");
  XLSX.writeFile(wb, "IT_Admin_Report.xlsx");
}

window.renderAdmins = renderAdminTickets;
function forceAdminRender() {
  if (typeof renderAdminTickets === "function") {
    renderAdminTickets();
  }
}







