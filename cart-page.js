import { getCart, removeFromCart, setQty, getCartTotal, updateCartBadge } from "./cart.js";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function render() {
  const cart = getCart();
  const list = document.querySelector("#cart-list");
  const empty = document.querySelector("#cart-empty");
  const summary = document.querySelector("#cart-summary");

  if (!cart.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    summary.classList.add("hidden");
    updateCartBadge();
    return;
  }

  empty.classList.add("hidden");
  summary.classList.remove("hidden");

  list.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${esc(item.id)}">
      <img src="${esc(item.image)}" alt="${esc(item.name)}" onerror="this.style.opacity=0">
      <div class="ci-name-wrap">
        <div class="ci-name">${esc(item.name)}</div>
        <div class="ci-price">${Number(item.price).toLocaleString()} L.E</div>
      </div>
      <div class="ci-qty">
        <button data-dec>−</button>
        <input type="number" min="1" value="${item.qty}" data-qty>
        <button data-inc>+</button>
      </div>
      <button class="ci-remove" data-remove>Remove</button>
    </div>
  `).join("");

  document.querySelector("#cart-total").textContent =
    `${getCartTotal().toLocaleString()} L.E`;

  list.querySelectorAll(".cart-item").forEach(row => {
    const id = row.dataset.id;
    const qtyInput = row.querySelector("[data-qty]");

    row.querySelector("[data-inc]").onclick = () => {
      setQty(id, Number(qtyInput.value) + 1);
      render();
    };
    row.querySelector("[data-dec]").onclick = () => {
      setQty(id, Math.max(1, Number(qtyInput.value) - 1));
      render();
    };
    qtyInput.onchange = () => {
      setQty(id, qtyInput.value);
      render();
    };
    row.querySelector("[data-remove]").onclick = () => {
      removeFromCart(id);
      render();
    };
  });

  updateCartBadge();
}

render();
