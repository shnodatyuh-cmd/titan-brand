import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const productsQuery = query(
  collection(db, "products"),
  where("active", "==", true),
  orderBy("updatedAt", "desc")
);

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function productCard(p) {
  const image = p.image || "";
  const price = Number(p.price || 0).toLocaleString();
  return `
    <article class="card" data-product-id="${esc(p.id)}">
      <img src="${esc(image)}" alt="${esc(p.name)}">
      <h3>${esc(p.name)}</h3>
      <p>${price} L.E</p>
      <button data-cart="${esc(p.id)}">Add to cart</button>
    </article>`;
}

function renderProducts(products) {
  // If the page has a live product grid, render from Firestore.
  // Existing pages without #live-products keep their original visual layout.
  const grid = document.querySelector("#live-products");
  if (grid) {
    grid.innerHTML = products.map(productCard).join("");
    grid.querySelectorAll("[data-cart]").forEach(btn => {
      btn.addEventListener("click", () => showToast("✓ Added to cart"));
    });
    grid.querySelectorAll(".card").forEach(addReveal);
  } else {
    // Update existing static cards by matching product names.
    document.querySelectorAll(".card").forEach(card => {
      const title = card.querySelector("h3");
      if (!title) return;
      const p = products.find(x => x.name?.toLowerCase() === title.textContent.trim().toLowerCase());
      if (!p) return;
      const price = card.querySelector("p");
      if (price) price.textContent = `${Number(p.price || 0).toLocaleString()} L.E`;
      const img = card.querySelector("img");
      if (img && p.image) img.src = p.image;
      card.dataset.stock = p.stock ?? 0;
    });
  }
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function addReveal(el) {
  el.classList.add("reveal");
  requestAnimationFrame(() => el.classList.add("show"));
}

const revealItems = document.querySelectorAll(".card, .cat-card, footer, .products");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealItems.forEach(el => {
  el.classList.add("reveal");
  observer.observe(el);
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

onSnapshot(productsQuery, snap => {
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts(products);
}, err => {
  console.error("Firestore realtime listener:", err);
});
