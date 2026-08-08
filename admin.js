 import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
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

let products = [];
let editing = null;

const $ = (selector) => document.querySelector(selector);

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (m) => ({
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
    (total, product) => total + Number(product.stock || 0),
    0
  );

  $("#low").textContent = products.filter(
    (product) => Number(product.stock || 0) < 5
  ).length;

  $("#rows").innerHTML = products
    .map(
      (product) => `
      <tr>
        <td>
          <span class="product-name">${esc(product.name)}</span>
          <br>
          <span class="muted">${esc(product.description || "")}</span>
        </td>

        <td>${esc(product.category)}</td>

        <td>
          ${Number(product.price || 0).toLocaleString()} L.E
        </td>

        <td>${product.stock || 0}</td>

        <td>
          <span class="pill ${
            Number(product.stock || 0) < 5 ? "low" : ""
          }">
            ${product.active ? "Active" : "Hidden"}
          </span>
        </td>

        <td class="actions">
          <button data-edit="${product.id}">Edit</button>
          <button data-delete="${product.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.onclick = () => {
      const product = products.find(
        (p) => p.id === button.dataset.edit
      );

      openModal(product);
    };
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.onclick = () => removeProduct(button.dataset.delete);
  });
}

function openModal(product = null) {
  editing = product?.id || null;

  $("#modalTitle").textContent = product
    ? "Edit product"
    : "Add product";

  $("#pid").value = product?.id || "";
  $("#pname").value = product?.name || "";
  $("#price").value = product?.price ?? "";
  $("#pstock").value = product?.stock ?? 0;
  $("#category").value = product?.category || "Men";
  $("#image").value = product?.image || "";
  $("#description").value = product?.description || "";
  $("#active").checked = product?.active ?? true;

  $("#modal").classList.remove("hidden");
}

async function removeProduct(id) {
  if (!confirm("Delete this product?")) return;

  await deleteDoc(doc(db, "products", id));
}

$("#addBtn").onclick = () => openModal();

$("#close").onclick = $("#cancel").onclick = () => {
  $("#modal").classList.add("hidden");
};

/*
  DEMO MODE
  Login is automatic using Firebase Anonymous Authentication.
*/

async function startDemoAdmin() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Firebase anonymous login error:", error);

    if ($("#loginError")) {
      $("#loginError").textContent =
        "Enable Anonymous sign-in in Firebase Authentication.";
    }
  }
}

/* Hide normal login form */
$("#login").classList.add("hidden");

/* Automatically login */
startDemoAdmin();

/* Logout */
$("#logout").onclick = () => signOut(auth);

/* Add / Edit product */
$("#productForm").onsubmit = async (event) => {
  event.preventDefault();

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
};

/* Firebase auth state */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    $("#app").classList.add("hidden");
    return;
  }

  $("#login").classList.add("hidden");
  $("#app").classList.remove("hidden");

  const productsQuery = query(
    collection(db, "products"),
    orderBy("updatedAt", "desc")
  );

  onSnapshot(
    productsQuery,
    (snapshot) => {
      products = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

      render();
    },
    (error) => {
      console.error("Firestore error:", error);
    }
  );
});