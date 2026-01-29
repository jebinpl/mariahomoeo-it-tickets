let editId = null;
let tickets = [];
const form = document.getElementById("ticketForm");

db.collection("tickets").orderBy("createdAt","desc")
.onSnapshot(snapshot=>{
  tickets = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  render();
});

form.addEventListener("submit", e=>{
  e.preventDefault();

const data = {
  division: division.value,
  department: department.value,
  description: description.value,
  status: status.value, // use current status from the input/select
  action: t ? t.action || "Open" : "Open" // keep previous action if editing
};

  if(editId){
    // UPDATE existing ticket
    db.collection("tickets").doc(editId).update(data);
  } else {
    // CREATE new ticket
    db.collection("tickets").add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  closeForm();
});



function openForm() {
  form.classList.remove("hidden");
  const status = document.getElementById("status"); // get the element first
  if (ROLE !== "admin") {
    status.disabled = true; // user cannot edit
  } else {
    status.disabled = false; // admin can edit
  }
}

function closeForm() {
  form.classList.add("hidden");
  form.reset();
  editId = null;
}

function editTicket(t){
  editId = t.id;

  division.value = t.division;
  department.value = t.department;
  description.value = t.description;
  status.value = t.status || "";

  openForm();
}

function updateAction(id,val){
  db.collection("tickets").doc(id).update({action:val});
}

function deleteTicket(id,action){
  if(action!=="Closed"){ alert("❌ Close ticket before deleting"); return; }
  db.collection("tickets").doc(id).delete();
}

function render(){
  ticketTable.innerHTML = "";

  tickets.forEach(t=>{
    ticketTable.innerHTML += `
    <tr>
      <td>${t.id}</td>
      <td>${t.division}</td>
      <td>${t.department}</td>
      <td>${t.description}</td>
      <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : ""}</td>
      <td>${t.status || ""}</td>

      <!-- ACTION COLUMN -->
<td>
  ${
    ROLE === "admin"
    ? `
      <div style="display:flex; gap:5px; align-items:center; justify-content:center;">
        <select onchange="updateAction('${t.id}', this.value)">
          <option ${t.action==="Open"?"selected":""}>Open</option>
          <option ${t.action==="Pending"?"selected":""}>Pending</option>
          <option ${t.action==="Work In Progress"?"selected":""}>Work In Progress</option>
          <option ${t.action==="Resolved"?"selected":""}>Resolved</option>
          <option ${t.action==="Closed"?"selected":""}>Closed</option>
        </select>
        <button onclick='editTicket(${JSON.stringify(t)})'>✏️</button>
        <button onclick="deleteTicket('${t.id}','${t.action}')">🗑️</button>
      </div>
    `
    : t.action
  }
</td>
    </tr>`;
  });
}

function exportExcel(){
  let rows=[["Ticket ID","Division","Department","Description","Date","Status","Action"]];
  tickets.forEach(t=>rows.push([
    t.id,t.division,t.department,t.description,
    t.createdAt?t.createdAt.toDate().toLocaleString():"",
    t.status||"",t.action
  ]));
  let wb=XLSX.utils.book_new();
  let ws=XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb,ws,"IT Issues");
  XLSX.writeFile(wb,"IT_Issue_Report.xlsx");
}






