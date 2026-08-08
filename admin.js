import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = s => document.querySelector(s);
let products = [];
let editing = null;

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function render(){
  $("#count").textContent = products.length;
  $("#stock").textContent = products.reduce((a,p)=>a+Number(p.stock||0),0);
  $("#low").textContent = products.filter(p=>Number(p.stock||0)<5).length;
  $("#rows").innerHTML = products.map(p=>`
    <tr>
      <td><span class="product-name">${esc(p.name)}</span><br><span class="muted">${esc(p.description||"")}</span></td>
      <td>${esc(p.category)}</td><td>${Number(p.price||0).toLocaleString()} L.E</td>
      <td>${p.stock||0}</td>
      <td><span class="pill ${Number(p.stock||0)<5?"low":""}">${p.active?"Active":"Hidden"}</span></td>
      <td class="actions"><button data-edit="${p.id}">Edit</button><button data-delete="${p.id}">Delete</button></td>
    </tr>`).join("");

  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openModal(products.find(p=>p.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeProduct(b.dataset.delete));
}

function openModal(p=null){
  editing = p?.id || null;
  $("#modalTitle").textContent = p ? "Edit product" : "Add product";
  $("#pid").value = p?.id || "";
  $("#pname").value = p?.name || "";
  $("#price").value = p?.price ?? "";
  $("#pstock").value = p?.stock ?? 0;
  $("#category").value = p?.category || "Men";
  $("#image").value = p?.image || "";
  $("#description").value = p?.description || "";
  $("#active").checked = p?.active ?? true;
  $("#modal").classList.remove("hidden");
}

async function removeProduct(id){
  if(!confirm("Delete this product?")) return;
  await deleteDoc(doc(db,"products",id));
}

$("#addBtn").onclick=()=>openModal();
$("#close").onclick=$("#cancel").onclick=()=>$("#modal").classList.add("hidden");

$("#loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("#loginError").textContent="";
  try{
    await signInWithEmailAndPassword(auth,$("#email").value,$("#password").value);
  }catch(err){
    $("#loginError").textContent = "Invalid owner credentials.";
  }
};

$("#logout").onclick=()=>signOut(auth);

$("#productForm").onsubmit=async e=>{
  e.preventDefault();
  const data={
    name:$("#pname").value.trim(),
    price:Number($("#price").value),
    stock:Number($("#pstock").value),
    category:$("#category").value,
    image:$("#image").value.trim(),
    description:$("#description").value.trim(),
    active:$("#active").checked,
    updatedAt:serverTimestamp()
  };
  if(editing) await updateDoc(doc(db,"products",editing),data);
  else await addDoc(collection(db,"products"),data);
  $("#modal").classList.add("hidden");
};

onAuthStateChanged(auth,user=>{
  if(!user){
    $("#login").classList.remove("hidden");
    $("#app").classList.add("hidden");
    return;
  }
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");

  const q=query(collection(db,"products"),orderBy("updatedAt","desc"));
  onSnapshot(q,snap=>{
    products=snap.docs.map(d=>({id:d.id,...d.data()}));
    render();
  },err=>console.error(err));
});
