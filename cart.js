const CART_KEY = "titan_cart_v1";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  document.dispatchEvent(new CustomEvent("cart:change", { detail: { cart } }));
}

export function getCart() {
  return readCart();
}

export function addToCart(product, qty = 1) {
  const cart = readCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image || "",
      qty
    });
  }

  writeCart(cart);
}

export function removeFromCart(id) {
  writeCart(readCart().filter((item) => item.id !== id));
}

export function setQty(id, qty) {
  const cart = readCart();
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  item.qty = Math.max(1, Math.floor(Number(qty)) || 1);
  writeCart(cart);
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + item.qty, 0);
}

export function getCartTotal() {
  return readCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function updateCartBadge() {
  const badge = document.querySelector("#cart-count");
  if (badge) badge.textContent = getCartCount();
}

// Keep the badge correct if the cart is changed from another tab
window.addEventListener("storage", (event) => {
  if (event.key === CART_KEY) updateCartBadge();
});
