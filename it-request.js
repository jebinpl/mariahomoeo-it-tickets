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
form.addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    division: division.value,
    department: department.value,
    description: description.value,
    status: status.value || "",
    action: editId
      ? tickets.find(t => t.id === editId)?.action
      : "Open"
  };

  /* ✏️ EDIT */
  if (editId) {
    db.collection("it_requests").doc(editId).update(data)
      .then(closeForm)
      .catch(err => console.error("Update failed:", err));
    return;
  }

  /* ➕ CREATE ITR-0001 */
  db.collection("it_requests")
    .orderBy("ticketNo", "desc")
    .limit(1)
    .get()
    .then(snapshot => {
      let nextNumber = 1;

      if (!snapshot.empty) {
        const lastTicket = snapshot.docs[0].data().ticketNo;
        if (lastTicket?.startsWith("ITR-")) {
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
      alert("❌ Failed to create request");
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

/* ✏️ EDIT */
function editTicket(t) {
  editId = t.id;
  division.value = t.division;
  department.value = t.department;
  description.value = t.description;
  status.value = t.status || "";
  openRequestForm();
}

/* 🔁 ACTION */
function updateAction(id, val) {
  db.collection("it_requests").doc(id).update({ action: val });
}

/* 🗑️ DELETE */
function deleteTicket(id, action) {
  if (action !== "Closed") {
    alert("❌ Close request before deleting");
    return;
  }
  if (!confirm("Delete this request?")) return;
  db.collection("it_requests").doc(id).delete();
}

/* 📋 RENDER */
function render() {
  ticketTable.innerHTML = "";

  const openTickets = tickets.filter(t => t.action === "Open").length;
  openCountEl.textContent = openTickets;

  tickets.forEach(t => {
    ticketTable.innerHTML += `
      <tr>
        <td>${t.ticketNo || "-"}</td>
        <td>${t.division}</td>
        <td>${t.department}</td>
        <td>${t.description}</td>
        <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${t.status || "-"}</td>
        <td>
          ${
            ROLE === "admin"
              ? `<select onchange="updateAction('${t.id}', this.value)">
                   <option ${t.action==="Open"?"selected":""}>Open</option>
                   <option ${t.action==="Pending"?"selected":""}>Pending</option>
                   <option ${t.action==="Closed"?"selected":""}>Closed</option>
                 </select>`
              : t.action
          }
        </td>
      </tr>`;
  });
}
