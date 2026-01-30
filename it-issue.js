let editId = null;
let tickets = [];
const form = document.getElementById("ticketForm");
const division = document.getElementById("division");
const department = document.getElementById("department");
const description = document.getElementById("description");
const status = document.getElementById("status");
const ticketTable = document.getElementById("ticketTable");

// Listen to Firestore changes in real-time
db.collection("tickets").orderBy("createdAt", "desc")
.onSnapshot(snapshot => {
  tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

// Form submit: create or edit ticket
form.addEventListener("submit", e => {
  e.preventDefault();

  // Prepare ticket data
  const data = {
    division: division.value,
    department: department.value,
    description: description.value,
    status: status.value || "",       // <-- empty by default
    action: editId ? tickets.find(t => t.id === editId).action : "Open"
  };

  // EDIT EXISTING TICKET
  if (editId) {
    db.collection("tickets").doc(editId).update(data)
      .then(() => closeForm())
      .catch(err => console.error("Update failed:", err));
    return;
  }

  // CREATE NEW TICKET ITI-0001...
  db.collection("tickets")
    .orderBy("ticketNo", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      let nextNumber = 1;
      if (!snapshot.empty) {
        const lastTicket = snapshot.docs[0].data().ticketNo;
        if (lastTicket && lastTicket.startsWith("ITI-")) {
          nextNumber = parseInt(lastTicket.split("-")[1]) + 1;
        }
      }
      const ticketNo = `ITI-${String(nextNumber).padStart(4, "0")}`;

      return db.collection("tickets").add({
        ...data,
        ticketNo,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => closeForm())
    .catch(err => {
      console.error("Ticket creation failed:", err);
      alert("❌ Failed to create ticket. Check console.");
    });
});

// OPEN / CLOSE FORM
function openForm() {
  form.classList.remove("hidden");
  status.disabled = ROLE !== "admin"; // user cannot edit
}

function closeForm() {
  form.classList.add("hidden");
  form.reset();
  editId = null;
}

// EDIT TICKET
function editTicket(t) {
  editId = t.id;
  division.value = t.division;
  department.value = t.department;
  description.value = t.description;
  status.value = t.status || "";  // <-- empty if new ticket
  openForm();
}

// UPDATE ACTION (dropdown)
function updateAction(id, val) {
  db.collection("tickets").doc(id).update({ action: val });
}

// DELETE TICKET
function deleteTicket(id, action){
  if (action !== "Closed") {
    alert("❌ Close ticket before deleting");
    return;
  }

  const confirmDelete = confirm("⚠️ Are you sure you want to delete this ticket?");
  if (!confirmDelete) return;

  db.collection("tickets").doc(id).delete();
}

// RENDER TABLE
function render() {
  ticketTable.innerHTML = "";

  tickets.forEach(t => {
    ticketTable.innerHTML += `
      <tr>
        <td>${t.ticketNo || "-"}</td>
        <td>${t.division || "-"}</td>
        <td>${t.department || "-"}</td>
        <td>${t.description || "-"}</td>
        <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${t.status !== undefined && t.status !== "" ? t.status : "-"}</td>
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

// EXPORT EXCEL
function exportExcel() {
  let rows = [["Ticket ID", "Division", "Department", "Description", "Date", "Status", "Action"]];

  tickets.forEach(t => {
    rows.push([
      t.ticketNo || "-",
      t.division || "-",
      t.department || "-",
      t.description || "-",
      t.createdAt ? t.createdAt.toDate().toLocaleString() : "-",
      (t.status !== undefined && t.status !== "" ? t.status : "-"),
      t.action || "-"
    ]);
  });

  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "IT Issues");
  XLSX.writeFile(wb, "IT_Issue_Report.xlsx");
}



