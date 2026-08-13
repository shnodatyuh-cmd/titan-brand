import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { getCart, getCartTotal, clearCart, updateCartBadge } from "./cart.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (sel) => document.querySelector(sel);

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function renderSummary() {
  const cart = getCart();

  if (!cart.length) {
    // Nothing to check out — send them back to the cart.
    window.location.href = "cart.html";
    return;
  }

  $("#summary-rows").innerHTML = cart.map(item => `
    <div class="os-row">
      <span>${esc(item.name)} × ${item.qty}</span>
      <span>${(item.price * item.qty).toLocaleString()} L.E</span>
    </div>
  `).join("");

  $("#summary-total").textContent = `${getCartTotal().toLocaleString()} L.E`;
}

renderSummary();
updateCartBadge();

$("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const cart = getCart();
  if (!cart.length) {
    window.location.href = "cart.html";
    return;
  }

  const name = $("#c-name").value.trim();
  const phone = $("#c-phone").value.trim();
  const address = $("#c-address").value.trim();
  const notes = $("#c-notes").value.trim();
  const errorEl = $("#checkoutError");
  const btn = $("#placeOrderBtn");

  if (!name || !phone || !address) {
    errorEl.textContent = "Please fill in your name, phone, and address.";
    return;
  }

  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "PLACING ORDER…";

  try {
    await addDoc(collection(db, "orders"), {
      customer: { name, phone, address, notes },
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      })),
      total: getCartTotal(),
      payment: "cod",
      status: "pending",
      createdAt: serverTimestamp()
    });

    clearCart();
    $("#checkout-view").classList.add("hidden");
    $("#confirm-view").classList.remove("hidden");
  } catch (error) {
    console.error("Order save error:", error);
    errorEl.textContent = "Something went wrong saving your order. Please try again.";
    btn.disabled = false;
    btn.textContent = "PLACE ORDER — CASH ON DELIVERY";
  }
});
