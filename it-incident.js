/* ===============================
   IT INCIDENT MODULE
================================ */

let incidentEditId = null;
let incidents = [];

/* ELEMENTS */
const incidentForm = document.getElementById("incidentForm");
const incidentDivision = document.getElementById("incidentDivision");
const incidentDepartment = document.getElementById("incidentDepartment");
const incidentDescription = document.getElementById("incidentDescription");
const incidentStatus = document.getElementById("incidentStatus");
const incidentTable = document.getElementById("incidentTable");
const incidentOpenCount = document.getElementById("incidentOpenCount");

/* ===============================
   REAL-TIME LISTENER
================================ */
db.collection("it_incidents")
  .orderBy("createdAt", "desc")
  .onSnapshot(snapshot => {
    incidents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderIncidents();
  });

/* ===============================
   CREATE / EDIT INCIDENT
================================ */
if (incidentForm) {
  incidentForm.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      division: incidentDivision.value.trim(),
      department: incidentDepartment.value.trim(),
      description: incidentDescription.value.trim(),
      status: incidentStatus.value || "",
      action: incidentEditId
        ? incidents.find(i => i.id === incidentEditId).action
        : "Open"
    };

    /* ✏️ EDIT */
    if (incidentEditId) {
      db.collection("it_incidents")
        .doc(incidentEditId)
        .update(data)
        .then(closeIncidentForm)
        .catch(err => console.error("Update failed:", err));
      return;
    }

    /* ➕ CREATE ITN-0001 */
    db.collection("it_incidents")
      .orderBy("ticketNo", "desc")
      .limit(1)
      .get()
      .then(snapshot => {
        let next = 1;
        if (!snapshot.empty) {
          const last = snapshot.docs[0].data().ticketNo;
          if (last && last.startsWith("ITN-")) {
            next = parseInt(last.split("-")[1]) + 1;
          }
        }

        const ticketNo = `ITN-${String(next).padStart(4, "0")}`;

        return db.collection("it_incidents").add({
          ...data,
          ticketNo,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(closeIncidentForm)
      .catch(err => {
        console.error(err);
        alert("❌ Failed to create incident");
      });
  });
}

/* ===============================
   OPEN / CLOSE FORM
================================ */
function openIncidentForm() {
  incidentForm.classList.remove("hidden");
  incidentStatus.disabled = (ROLE || localStorage.getItem("ROLE")) !== "admin";
}

function closeIncidentForm() {
  incidentForm.classList.add("hidden");
  incidentForm.reset();
  incidentEditId = null;
}

/* ===============================
   EDIT INCIDENT
================================ */
function editIncident(i) {
  incidentEditId = i.id;
  incidentDivision.value = i.division;
  incidentDepartment.value = i.department;
  incidentDescription.value = i.description;
  incidentStatus.value = i.status || "";
  openIncidentForm();
}

/* ===============================
   UPDATE ACTION
================================ */
function updateIncidentAction(id, value) {
  db.collection("it_incidents").doc(id).update({ action: value });
}

/* ===============================
   DELETE INCIDENT
================================ */
function deleteIncident(id, action) {
  if (action !== "Closed") {
    alert("❌ Close incident before deleting");
    return;
  }

  if (!confirm("⚠️ Delete this incident?")) return;
  db.collection("it_incidents").doc(id).delete();
}

/* ===============================
   RENDER TABLE
================================ */
function renderIncidents() {
  const currentRole = ROLE || localStorage.getItem("ROLE");
  incidentTable.innerHTML = "";

  const open = incidents.filter(i => i.action === "Open").length;
  if (incidentOpenCount) incidentOpenCount.textContent = open;

  incidents.forEach(i => {
    incidentTable.innerHTML += `
      <tr>
        <td>${i.ticketNo || "-"}</td>
        <td>${i.division || "-"}</td>
        <td>${i.department || "-"}</td>
        <td>${i.description || "-"}</td>
        <td>${i.createdAt ? i.createdAt.toDate().toLocaleString() : "-"}</td>
        <td>${i.status || "-"}</td>
        <td>
          ${
            currentRole === "admin"
              ? `
              <div style="display:flex;gap:5px;justify-content:center;">
                <select onchange="updateIncidentAction('${i.id}',this.value)">
                  <option ${i.action==="Open"?"selected":""}>Open</option>
                  <option ${i.action==="Pending"?"selected":""}>Pending</option>
                  <option ${i.action==="Work In Progress"?"selected":""}>Work In Progress</option>
                  <option ${i.action==="Resolved"?"selected":""}>Resolved</option>
                  <option ${i.action==="Closed"?"selected":""}>Closed</option>
                </select>
                <button onclick='editIncident(${JSON.stringify(i)})'>✏️</button>
                <button onclick="deleteIncident('${i.id}','${i.action}')">🗑️</button>
              </div>`
              : i.action
          }
        </td>
      </tr>
    `;
  });
}

/* ===============================
   EXPORT EXCEL
================================ */
function exportIncidentExcel() {
  if (incidents.length === 0) {
    alert("No IT-Incidents to export");
    return;
  }

  let rows = [
    ["Incident ID", "Division", "Department", "Description", "Date", "Status", "Action"]
  ];

  incidents.forEach(i => {
    rows.push([
      i.ticketNo || "-",
      i.division || "-",
      i.department || "-",
      i.description || "-",
      i.createdAt ? i.createdAt.toDate().toLocaleString() : "-",
      i.status || "-",
      i.action || "-"
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "IT Incidents");
  XLSX.writeFile(wb, "IT_Incident_Report.xlsx");
}

window.renderIncidents = renderIncidents;
