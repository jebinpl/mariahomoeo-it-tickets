/* ===============================
   IT REQUEST MODULE
================================ */

let requestEditId = null;
let requests = [];

/* ELEMENTS */
const requestForm = document.getElementById("requestForm");
const requestDivision = document.getElementById("requestDivision");
const requestDepartment = document.getElementById("requestDepartment");
const requestDescription = document.getElementById("requestDescription");
const requestStatus = document.getElementById("requestStatus");
const requestTable = document.getElementById("requestTable");
const requestOpenCount = document.getElementById("requestOpenCount");

/* ===============================
   REAL-TIME LISTENER
================================ */
db.collection("it_requests")
  .orderBy("createdAt", "desc")
  .onSnapshot(snapshot => {
    requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderRequests();
  });

/* ===============================
   CREATE / EDIT REQUEST
================================ */
if (requestForm) {
  requestForm.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      division: requestDivision.value.trim(),
      department: requestDepartment.value.trim(),
      description: requestDescription.value.trim(),
      status: requestStatus.value || "",
      action: requestEditId
        ? requests.find(r => r.id === requestEditId).action
        : "Open"
    };

    /* ✏️ EDIT */
    if (requestEditId) {
      db.collection("it_requests")
        .doc(requestEditId)
        .update(data)
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
        let next = 1;

        if (!snapshot.empty) {
          const last = snapshot.docs[0].data().ticketNo;
          if (last && last.startsWith("ITR-")) {
            next = parseInt(last.split("-")[1]) + 1;
          }
        }

        const ticketNo = `ITR-${String(next).padStart(4, "0")}`;

        return db.collection("it_requests").add({
          ...data,
          ticketNo,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(closeForm)
      .catch(err => {
        console.error(err);
        alert("❌ Failed to create request");
      });
  });
}

/* ===============================
   OPEN / CLOSE FORM
================================ */
function openRequestForm() {
  requestForm.classList.remove("hidden");
  requestStatus.disabled = ROLE !== "admin";
}

function closeForm() {
  requestForm.classList.add("hidden");
  requestForm.reset();
  requestEditId = null;
}

/* ===============================
   EDIT REQUEST
================================ */
function editRequest(r) {
  requestEditId = r.id;
  requestDivision.value = r.division;
  requestDepartment.value = r.department;
  requestDescription.value = r.description;
  requestStatus.value = r.status || "";
  openRequestForm();
}

/* ===============================
   UPDATE ACTION
================================ */
function updateRequestAction(id, value) {
  db.collection("it_requests").doc(id).update({ action: value });
}

/* ===============================
   DELETE REQUEST
================================ */
function deleteRequest(id, action) {
  if (action !== "Closed") {
    alert("❌ Close request before deleting");
    return;
  }

  if (!confirm("⚠️ Delete this request?")) return;

  db.collection("it_requests").doc(id).delete();
}

/* ===============================
   RENDER TABLE
================================ */
function renderRequests() {
  requestTable.innerHTML = "";

  /* 🔴 OPEN COUNT */
  const open = requests.filter(r => r.action === "Open").length;
  if (requestOpenCount) requestOpenCount.textContent = open;

  requests.forEach(r => {
    requestTable.innerHTML += `
      <tr>
        <td>${r.ticketNo || "-"}</td>
        <td>${r.division || "-"}</td>
        <td>${r.department || "-"}</td>
        <td>${r.description || "-"}</td>
        <td>${r.createdAt ? r.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${r.status || "-"}</td>
        <td>
          ${
            ROLE === "admin"
              ? `
              <div style="display:flex;gap:5px;justify-content:center;">
                <select onchange="updateRequestAction('${r.id}',this.value)">
                  <option ${r.action==="Open"?"selected":""}>Open</option>
                  <option ${r.action==="Pending"?"selected":""}>Pending</option>
                  <option ${r.action==="Work In Progress"?"selected":""}>Work In Progress</option>
                  <option ${r.action==="Resolved"?"selected":""}>Resolved</option>
                  <option ${r.action==="Closed"?"selected":""}>Closed</option>
                </select>
                <button onclick='editRequest(${JSON.stringify(r)})'>✏️</button>
                <button onclick="deleteRequest('${r.id}','${r.action}')">🗑️</button>
              </div>`
              : r.action
          }
        </td>
      </tr>
    `;
  });
}

/* ===============================
   EXPORT EXCEL (SAME AS ISSUE)
================================ */
function exportRequestExcel() {
  if (requests.length === 0) {
    alert("No IT-Requests to export");
    return;
  }

  let rows = [
    ["Request ID", "Division", "Department", "Description", "Date", "Status", "Action"]
  ];

  requests.forEach(r => {
    rows.push([
      r.ticketNo || "-",
      r.division || "-",
      r.department || "-",
      r.description || "-",
      r.createdAt ? r.createdAt.toDate().toLocaleString() : "-",
      r.status || "-",
      r.action || "-"
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "IT Requests");
  XLSX.writeFile(wb, "IT_Request_Report.xlsx");
}
