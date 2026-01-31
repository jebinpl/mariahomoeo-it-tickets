let editId = null;
let tickets = [];

const openCountEl = document.getElementById("requestOpenCount");
const form = document.getElementById("requestForm");
const division = document.getElementById("requestDivision");
const department = document.getElementById("requestDepartment");
const description = document.getElementById("requestDescription");
const status = document.getElementById("requestStatus");
const ticketTable = document.getElementById("requestTable");

/* 🔥 REAL-TIME LISTENER */
db.collection("it_requests").orderBy("createdAt", "desc")
.onSnapshot(snapshot => {
  tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

/* 📝 CREATE / EDIT REQUEST */
if (form) {
form.addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    division: division.value,
    department: department.value,
    description: description.value,
    status: status.value || "",
    action: editId ? tickets.find(t => t.id === editId).action : "Open"
  });
}
  /* ✏️ EDIT */
  if (editId) {
    db.collection("it_requests").doc(editId).update(data)
      .then(closeForm)
      .catch(err => console.error("Update failed:", err));
    return;
  }

  /* ➕ CREATE ITR-0001… */
  db.collection("it_requests")
    .orderBy("ticketNo", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      let nextNumber = 1;

      if (!snapshot.empty) {
        const lastTicket = snapshot.docs[0].data().ticketNo;
        if (lastTicket && lastTicket.startsWith("ITR-")) {
          nextNumber = parseInt(lastTicket.split("-")[1]) + 1;
        }
      }

      const ticketNo = `ITR-${String(nextNumber).padStart(4, "0")}`;

      return db.collection("it_requests").add({
        ...data,
        ticketNo,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(closeForm)
    .catch(err => {
      console.error("Request creation failed:", err);
      alert("❌ Failed to create request. Check console.");
    });
});

/* 🔓 OPEN / CLOSE FORM */
function openRequestForm() {
  form.classList.remove("hidden");
  status.disabled = ROLE !== "admin";
}

function closeForm() {
  form.classList.add("hidden");
  form.reset();
  editId = null;
}

/* ✏️ EDIT REQUEST */
function editTicket(t) {
  editId = t.id;
  division.value = t.division;
  department.value = t.department;
  description.value = t.description;
  status.value = t.status || "";
  openRequestForm();
}

/* 🔁 UPDATE ACTION */
function updateAction(id, val) {
  db.collection("it_requests").doc(id).update({ action: val });
}

/* 🗑️ DELETE REQUEST */
function deleteTicket(id, action){
  if (action !== "Closed") {
    alert("❌ Close request before deleting");
    return;
  }

  if (!confirm("⚠️ Are you sure you want to delete this request?")) return;

  db.collection("it_requests").doc(id).delete();
}

/* 📋 RENDER TABLE */
function render() {
  ticketTable.innerHTML = "";

const openTickets = tickets.filter(t => t.action === "Open").length;
if (openCountEl) openCountEl.textContent = openTickets;

  tickets.forEach(t => {
    ticketTable.innerHTML += `
      <tr>
        <td>${t.ticketNo || "-"}</td>
        <td>${t.division || "-"}</td>
        <td>${t.department || "-"}</td>
        <td>${t.description || "-"}</td>
        <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${t.status || "-"}</td>
        <td>
          ${
            ROLE === "admin"
              ? `<div style="display:flex; gap:5px; align-items:center; justify-content:center;">
                  <select onchange="updateAction('${t.id}', this.value)">
                    <option ${t.action==="Open"?"selected":""}>Open</option>
                    <option ${t.action==="Pending"?"selected":""}>Pending</option>
                    <option ${t.action==="Work In Progress"?"selected":""}>Work In Progress</option>
                    <option ${t.action==="Resolved"?"selected":""}>Resolved</option>
                    <option ${t.action==="Closed"?"selected":""}>Closed</option>
                  </select>
                  <button onclick='editTicket(${JSON.stringify(t)})'>✏️</button>
                  <button onclick="deleteTicket('${t.id}','${t.action}')">🗑️</button>
                </div>`
              : t.action
          }
        </td>
      </tr>
    `;
  });
}

/* 📊 EXPORT EXCEL */
function exportExcel() {
  let rows = [["Request ID", "Division", "Department", "Description", "Date", "Status", "Action"]];

  tickets.forEach(t => {
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

  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "IT Requests");
  XLSX.writeFile(wb, "IT_Request_Report.xlsx");
}



