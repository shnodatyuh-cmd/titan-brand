 import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// حساب صاحب المتجر فقط
const OWNER_EMAIL = "samehshno4@gmail.com";

const $ = s => document.querySelector(s);

let products = [];
let editing = null;

function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}

function render() {
  $("#count").textContent = products.length;

  $("#stock").textContent = products.reduce(
    (a, p) => a + Number(p.stock || 0),
    0
  );

  $("#low").textContent = products.filter(
    p => Number(p.stock || 0) < 5
  ).length;

  $("#rows").innerHTML = products.map(p => `
    <tr>
      <td>
        <span class="product-name">${esc(p.name)}</span><br>
        <span class="muted">${esc(p.description || "")}</span>
      </td>

      <td>${esc(p.category)}</td>

      <td>
        ${Number(p.price || 0).toLocaleString()} L.E
      </td>

      <td>${p.stock || 0}</td>

      <td>
        <span class="pill ${Number(p.stock || 0) < 5 ? "low" : ""}">
          ${p.active ? "Active" : "Hidden"}
        </span>
      </td>

      <td class="actions">
        <button data-edit="${p.id}">Edit</button>
        <button data-delete="${p.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-edit]").forEach(b => {
    b.onclick = () => {
      const product = products.find(
        p => p.id === b.dataset.edit
      );

      openModal(product);
    };
  });

  document.querySelectorAll("[data-delete]").forEach(b => {
    b.onclick = () => removeProduct(b.dataset.delete);
  });
}

function openModal(p = null) {
  editing = p?.id || null;

  $("#modalTitle").textContent =
    p ? "Edit product" : "Add product";

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

async function removeProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await deleteDoc(doc(db, "products", id));
  } catch (err) {
    console.error(err);
    alert("Could not delete product.");
  }
}

$("#addBtn").onclick = () => openModal();

$("#close").onclick =
$("#cancel").onclick = () => {
  $("#modal").classList.add("hidden");
};


// ===============================
// FIREBASE LOGIN
// ===============================

$("#loginForm").onsubmit = async e => {
  e.preventDefault();

  $("#loginError").textContent = "";

  const email = $("#email").value.trim().toLowerCase();
  const password = $("#password").value;

  // السماح لصاحب المتجر فقط
  if (email !== OWNER_EMAIL.toLowerCase()) {
    $("#loginError").textContent =
      "This account is not the store owner.";

    return;
  }

  if (!password) {
    $("#loginError").textContent =
      "Enter your password.";

    return;
  }

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // حماية إضافية
    if (
      result.user.email?.toLowerCase() !==
      OWNER_EMAIL.toLowerCase()
    ) {
      await signOut(auth);

      $("#loginError").textContent =
        "Access denied.";
    }

  } catch (err) {
    console.error("Firebase login error:", err);

    if (
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/user-not-found"
    ) {
      $("#loginError").textContent =
        "Wrong email or password.";

    } else if (err.code === "auth/too-many-requests") {

      $("#loginError").textContent =
        "Too many attempts. Try again later.";

    } else {

      $("#loginError").textContent =
        "Firebase login error: " +
        (err.code || "unknown error");
    }
  }
};


// ===============================
// LOGOUT
// ===============================

$("#logout").onclick = () => signOut(auth);


// ===============================
// PRODUCTS
// ===============================

$("#productForm").onsubmit = async e => {
  e.preventDefault();

  const data = {
    name: $("#pname").value.trim(),

    price: Number($("#price").value),

    stock: Number($("#pstock").value),

    category: $("#category").value,

    image: $("#image").value.trim(),

    description: $("#description").value.trim(),

    active: $("#active").checked,

    updatedAt: serverTimestamp()
  };

  try {

    if (editing) {

      await updateDoc(
        doc(db, "products", editing),
        data
      );

    } else {

      await addDoc(
        collection(db, "products"),
        data
      );
    }

    $("#modal").classList.add("hidden");

  } catch (err) {

    console.error(err);

    alert(
      "Could not save product: " +
      (err.message || "Unknown error")
    );
  }
};


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, user => {

  // لو مفيش مستخدم أو المستخدم مش صاحب المتجر
  if (
    !user ||
    user.email?.toLowerCase() !==
    OWNER_EMAIL.toLowerCase()
  ) {

    if (user) {
      signOut(auth);
    }

    $("#login").classList.remove("hidden");
    $("#app").classList.add("hidden");

    return;
  }

  // صاحب المتجر دخل بنجاح
  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");


  // ===============================
  // REAL-TIME PRODUCTS
  // ===============================

  const q = query(
    collection(db, "products"),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(
    q,
    snap => {

      products = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      render();
    },

    err => {
      console.error(
        "Firestore error:",
        err
      );
    }
  );
});