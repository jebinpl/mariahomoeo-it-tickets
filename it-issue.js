let tickets = [];
const form = document.getElementById("ticketForm");

db.collection("tickets").orderBy("createdAt","desc")
.onSnapshot(snapshot=>{
  tickets = snapshot.docs.map(d=>({id:d.id,...d.data()}));
  render();
});

form.addEventListener("submit", e=>{
  e.preventDefault();
  db.collection("tickets").add({
    division: division.value,
    department: department.value,
    description: description.value,
    status: "",
    action: "Open",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  closeForm();
});

function openForm(){ form.classList.remove("hidden"); }
function closeForm(){ form.classList.add("hidden"); form.reset(); }

function updateAction(id,val){
  db.collection("tickets").doc(id).update({action:val});
}

function deleteTicket(id,action){
  if(action!=="Closed"){ alert("❌ Close ticket before deleting"); return; }
  db.collection("tickets").doc(id).delete();
}

function render(){
  ticketTable.innerHTML="";
  tickets.forEach(t=>{
    ticketTable.innerHTML+=`
    <tr>
      <td>${t.id}</td>
      <td>${t.division}</td>
      <td>${t.department}</td>
      <td>${t.description}</td>
      <td>${t.createdAt ? t.createdAt.toDate().toLocaleString() : ""}</td>
      <td>${t.status||""}</td>
      <td>${t.action}</td>
      <td>
        ${ROLE==="admin" ? `
        <select onchange="updateAction('${t.id}',this.value)">
          <option>Open</option>
          <option>Pending</option>
          <option>Work In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <button onclick="deleteTicket('${t.id}','${t.action}')">🗑️</button>` : ""}
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
