const state = {
  token: localStorage.getItem("ss_token") || "",
  user: JSON.parse(localStorage.getItem("ss_user") || "null"),
  cart: JSON.parse(localStorage.getItem("ss_cart") || "[]"),
  pendingQuery: "",
};

const els = {
  authArea: document.getElementById("auth-area"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  maxPrice: document.getElementById("filter-max-price"),
  inStock: document.getElementById("filter-in-stock"),
  filterReset: document.getElementById("filter-reset"),
  grid: document.getElementById("results-grid"),
  emptyState: document.getElementById("empty-state"),
  resultsTitle: document.getElementById("results-title"),
  resultsCount: document.getElementById("results-count"),
  cartCount: document.getElementById("cart-count"),
  navCart: document.getElementById("nav-cart"),
  navOrders: document.getElementById("nav-orders"),
  overlay: document.getElementById("modal-overlay"),
  modalBody: document.getElementById("modal-body"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawer-title"),
  drawerBody: document.getElementById("drawer-body"),
  toastZone: document.getElementById("toast-zone"),
};

function authHeaders(extra = {}) {
  return state.token ? { ...extra, Authorization: `Bearer ${state.token}` } : extra;
}

async function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}), ...authHeaders() },
  });
}

function toast(message, kind = "info") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  els.toastZone.appendChild(node);
  setTimeout(() => node.classList.add("show"), 10);
  setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 300);
  }, 3200);
}

function euros(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function requireLogin(message) {
  toast(message || "Connecte-toi pour continuer", "warn");
  openLoginModal();
}

function renderAuth() {
  if (state.user) {
    els.authArea.innerHTML = `
      <span class="user-chip">${state.user.username}</span>
      <button class="nav-btn" type="button" id="btn-logout">Déconnexion</button>`;
    document.getElementById("btn-logout").addEventListener("click", logout);
  } else {
    els.authArea.innerHTML = `<button class="btn primary small" type="button" id="btn-login">Connexion</button>`;
    document.getElementById("btn-login").addEventListener("click", () => openLoginModal());
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("ss_token", token);
  localStorage.setItem("ss_user", JSON.stringify(user));
  renderAuth();
}

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("ss_token");
  localStorage.removeItem("ss_user");
  renderAuth();
  toast("Déconnecté", "info");
}

function openLoginModal() {
  openOverlay(`
    <h3>Connexion</h3>
    <p class="muted">Comptes de démo : <strong>admin / admin1234</strong> (équipe) ou <strong>demo / demo1234</strong> (client)</p>
    <form id="login-form" class="login-form">
      <input id="login-username" type="text" placeholder="Identifiant" required>
      <input id="login-password" type="password" placeholder="Mot de passe" required>
      <button class="btn primary" type="submit">Se connecter</button>
    </form>`);
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const response = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast(data.detail || "Connexion impossible", "error");
      return;
    }
    saveSession(data.token, { username: data.username, role: data.role });
    closeOverlay();
    toast(`Bienvenue ${data.username} !`, "success");
    if (state.pendingQuery) {
      const query = state.pendingQuery;
      state.pendingQuery = "";
      els.searchInput.value = query;
      runSearch();
    }
  });
}

function productCard(product, score = null) {
  const inStock = product.stock > 0;
  const scoreBadge = score !== null ? `<span class="score">pertinence ${Math.round(score * 100)}%</span>` : "";
  return `
    <article class="card">
      <div class="card-head">
        <span class="chip">${product.category || "Divers"}</span>
        ${scoreBadge}
      </div>
      <h3 class="card-title">${product.title}</h3>
      <p class="card-desc">${product.description || ""}</p>
      <div class="card-foot">
        <span class="price">${euros(product.price)}</span>
        <span class="stock ${inStock ? "ok" : "out"}">${inStock ? `En stock (${product.stock})` : "Rupture"}</span>
      </div>
      <div class="card-actions">
        <button class="btn primary small" data-add="${product.id}" ${inStock ? "" : "disabled"}>Ajouter au panier</button>
        <button class="btn ghost small" data-similar="${product.id}">Similaires</button>
      </div>
    </article>`;
}

function renderResults(products, { title = "Résultats", count = null, withScores = false } = {}) {
  els.resultsTitle.textContent = title;
  els.resultsCount.textContent = count === null ? "" : `${count} produit(s)`;
  els.grid.innerHTML = products
    .map((product) => productCard(product, withScores ? product.score : null))
    .join("");
  els.emptyState.classList.toggle("hidden", products.length > 0);
  els.grid.querySelectorAll("[data-add]").forEach((button) =>
    button.addEventListener("click", () => {
      const product = products.find((p) => p.id === Number(button.dataset.add));
      addToCart(product);
    })
  );
  els.grid.querySelectorAll("[data-similar]").forEach((button) =>
    button.addEventListener("click", () => openRecommendations(Number(button.dataset.similar)))
  );
}

async function loadCatalog() {
  const response = await api("/api/products?page=1");
  if (!response.ok) {
    toast("Catalogue indisponible", "error");
    return;
  }
  const data = await response.json();
  renderResults(data.results, { title: "Nouveautés du catalogue", count: data.count });
}

async function runSearch() {
  const query = els.searchInput.value.trim();
  if (!query) {
    toast("Décris le produit recherché", "warn");
    return;
  }
  if (!state.token) {
    state.pendingQuery = query;
    requireLogin("Connecte-toi pour lancer une recherche sémantique");
    return;
  }
  els.resultsTitle.textContent = "Recherche en cours…";
  const params = new URLSearchParams({ q: query, limit: "24" });
  if (els.maxPrice.value) params.set("max_price", els.maxPrice.value);
  if (els.inStock.checked) params.set("in_stock", "true");
  const response = await api(`/semantic/search/semantic?${params.toString()}`);
  if (response.status === 401) {
    state.pendingQuery = query;
    requireLogin("Session expirée, reconnecte-toi");
    return;
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    toast(data.detail || "Recherche impossible", "error");
    els.resultsTitle.textContent = "Résultats";
    return;
  }
  const data = await response.json();
  renderResults(data.results, { title: `Résultats pour « ${data.query} »`, count: data.count, withScores: true });
}

async function openRecommendations(productId) {
  if (!state.token) {
    requireLogin("Connecte-toi pour voir les recommandations");
    return;
  }
  openOverlay('<p class="muted">Chargement des recommandations…</p>');
  const response = await api(`/semantic/recommendations/${productId}?limit=6`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    els.modalBody.innerHTML = `<p class="muted">${data.detail || "Recommandations indisponibles"}</p>`;
    return;
  }
  const data = await response.json();
  if (!data.results.length) {
    els.modalBody.innerHTML = "<p class='muted'>Aucun produit similaire trouvé.</p>";
    return;
  }
  els.modalBody.innerHTML = `
    <h3>Produits similaires</h3>
    <div class="reco-list">
      ${data.results
        .map(
          (product) => `
        <div class="reco-item">
          <div>
            <strong>${product.title}</strong>
            <div class="muted">${product.category || ""} · pertinence ${Math.round(product.score * 100)}%</div>
          </div>
          <div class="reco-actions">
            <span class="price">${euros(product.price)}</span>
            <button class="btn primary small" data-reco-add="${product.id}" ${product.stock > 0 ? "" : "disabled"}>+</button>
          </div>
        </div>`
        )
        .join("")}
    </div>`;
  els.modalBody.querySelectorAll("[data-reco-add]").forEach((button) =>
    button.addEventListener("click", () => {
      const product = data.results.find((p) => p.id === Number(button.dataset.recoAdd));
      addToCart(product);
    })
  );
}

function persistCart() {
  localStorage.setItem("ss_cart", JSON.stringify(state.cart));
  renderCartCount();
}

function renderCartCount() {
  const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  els.cartCount.textContent = total;
}

function addToCart(product) {
  if (!product) return;
  const existing = state.cart.find((item) => item.product_id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ product_id: product.id, title: product.title, price: product.price, quantity: 1 });
  }
  persistCart();
  toast(`« ${product.title} » ajouté au panier`, "success");
}

function renderCart() {
  if (!state.cart.length) {
    els.drawerBody.innerHTML = '<p class="muted">Ton panier est vide.</p>';
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  els.drawerBody.innerHTML = `
    <div class="cart-list">
      ${state.cart
        .map(
          (item) => `
        <div class="cart-item">
          <div>
            <strong>${item.title}</strong>
            <div class="muted">${euros(item.price)} × ${item.quantity}</div>
          </div>
          <div class="cart-actions">
            <button class="qty" data-dec="${item.product_id}">−</button>
            <button class="qty" data-inc="${item.product_id}">+</button>
            <button class="qty remove" data-del="${item.product_id}">✕</button>
          </div>
        </div>`
        )
        .join("")}
    </div>
    <div class="cart-total">
      <span>Total estimé</span>
      <strong>${euros(total)}</strong>
    </div>
    <button class="btn primary wide" id="checkout-btn">Commander</button>`;
  els.drawerBody.querySelectorAll("[data-inc]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = state.cart.find((i) => i.product_id === Number(button.dataset.inc));
      item.quantity += 1;
      persistCart();
      renderCart();
    })
  );
  els.drawerBody.querySelectorAll("[data-dec]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = state.cart.find((i) => i.product_id === Number(button.dataset.dec));
      item.quantity -= 1;
      if (item.quantity <= 0) state.cart = state.cart.filter((i) => i.product_id !== item.product_id);
      persistCart();
      renderCart();
    })
  );
  els.drawerBody.querySelectorAll("[data-del]").forEach((button) =>
    button.addEventListener("click", () => {
      state.cart = state.cart.filter((i) => i.product_id !== Number(button.dataset.del));
      persistCart();
      renderCart();
    })
  );
  document.getElementById("checkout-btn").addEventListener("click", checkout);
}

async function checkout() {
  if (!state.token) {
    requireLogin("Connecte-toi pour commander");
    return;
  }
  const response = await api("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: state.cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    requireLogin("Session expirée, reconnecte-toi");
    return;
  }
  if (!response.ok) {
    toast(data.detail || "Commande refusée", "error");
    return;
  }
  state.cart = [];
  persistCart();
  openOrdersDrawer();
  toast(`Commande #${data.id} confirmée — ${euros(data.total)}`, "success");
}

async function openOrdersDrawer() {
  if (!state.token) {
    requireLogin("Connecte-toi pour voir tes commandes");
    return;
  }
  openDrawer("Mes commandes", '<p class="muted">Chargement…</p>');
  const response = await api("/api/orders");
  if (!response.ok) {
    els.drawerBody.innerHTML = '<p class="muted">Impossible de charger les commandes.</p>';
    return;
  }
  const data = await response.json();
  if (!data.results.length) {
    els.drawerBody.innerHTML = '<p class="muted">Aucune commande pour le moment.</p>';
    return;
  }
  els.drawerBody.innerHTML = data.results
    .map(
      (order) => `
      <div class="order-card">
        <div class="order-head">
          <strong>Commande #${order.id}</strong>
          <span class="order-status">${order.status}</span>
        </div>
        <div class="muted">${new Date(order.created_at).toLocaleString("fr-FR")}</div>
        <ul>
          ${order.items.map((item) => `<li>${item.quantity} × ${item.title} — ${euros(item.unit_price)}</li>`).join("")}
        </ul>
        <div class="cart-total"><span>Total</span><strong>${euros(order.total)}</strong></div>
      </div>`
    )
    .join("");
}

function openOverlay(html) {
  els.modalBody.innerHTML = html;
  els.overlay.classList.remove("hidden");
}

function closeOverlay() {
  els.overlay.classList.add("hidden");
}

function openDrawer(title, html = "") {
  els.drawerTitle.textContent = title;
  els.drawerBody.innerHTML = html;
  els.drawer.classList.remove("hidden");
}

function closeDrawer() {
  els.drawer.classList.add("hidden");
}

function resetFilters() {
  els.maxPrice.value = "";
  els.inStock.checked = false;
}

els.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
els.filterReset.addEventListener("click", resetFilters);
els.navCart.addEventListener("click", () => {
  openDrawer("Panier");
  renderCart();
});
els.navOrders.addEventListener("click", openOrdersDrawer);
els.overlay.addEventListener("click", (event) => {
  if (event.target === els.overlay || event.target.hasAttribute("data-close")) closeOverlay();
});
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-drawer]")) closeDrawer();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOverlay();
    closeDrawer();
  }
});

renderAuth();
renderCartCount();
loadCatalog();
