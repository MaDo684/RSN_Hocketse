/* ==========================================================
   Realschule Neuffen — Schulfest Kasse
   ========================================================== */

// ---------- ADMIN-PASSWORT (nur als SHA-256 Hash hinterlegt) ----------
// Das Klartext-Passwort wird nirgends im Code gespeichert.
const ADMIN_PASSWORD_HASH = "2217ab5ce2d6f562246d7b1e951783c651682f25878e177ff0280f6f7c788bad";

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------- ICON-REPOSITORY für neue Produkte ----------
const ICON_REPOSITORY = [
  "🌭","🍔","🥤","☕","🍰","🍩","🧃","🍦","🍿","🥨",
  "🍕","🌮","🥙","🍟","🍗","🧁","🍪","🍫","🍬","🍭",
  "🥧","🍎","🍊","🍇","🍉","🍓","🍒","🥝","🍋","🧊",
  "🍷","🍺","🥛","🍵","🎂","🍨","🍧","🍯","🥞","🧇",
  "🎟️","🎈","🎨","🧸","🎲","🎯","🍀","⭐","🎁","🏆"
];

// ---------- STANDARD-PRODUKTE ----------
const DEFAULT_PRODUCTS = [
  { id:1, emoji:"🌭", name:"Bratwurst", price:2.50 },
  { id:2, emoji:"🍔", name:"Burger", price:3.00 },
  { id:3, emoji:"🥤", name:"Cola / Limo", price:1.50 },
  { id:4, emoji:"☕", name:"Kaffee", price:1.00 },
  { id:5, emoji:"🍰", name:"Kuchen (Stück)", price:1.50 },
  { id:6, emoji:"🍩", name:"Donut", price:1.00 },
  { id:7, emoji:"🧃", name:"Saft / Wasser", price:1.00 },
  { id:8, emoji:"🍦", name:"Eis", price:1.50 },
  { id:9, emoji:"🍿", name:"Popcorn", price:1.00 },
  { id:10, emoji:"🥨", name:"Brezel", price:0.80 },
];

const STORAGE_KEY = "rsn_schulfest_products_v1";

// ---------- STATE ----------
let products = loadProducts();
let cart = {};
let selectedIcon = ICON_REPOSITORY[0];

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function fmt(val) {
  return val.toFixed(2).replace('.', ',') + ' €';
}

// ============================================================
// KASSEN-ANSICHT
// ============================================================
function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  products.forEach(p => {
    const qty = cart[p.id] || 0;
    const btn = document.createElement('button');
    btn.className = 'product-btn' + (qty > 0 ? ' in-cart' : '');
    btn.innerHTML = `
      <span class="emoji">${p.emoji}</span>
      <span class="name">${p.name}</span>
      <span class="price">${fmt(p.price)}</span>
      <span class="badge">${qty}</span>
    `;
    btn.onclick = () => addToCart(p.id);
    grid.appendChild(btn);
  });
}

function renderCart() {
  const list = document.getElementById('cart-list');
  list.innerHTML = '';
  const entries = Object.entries(cart).filter(([,q]) => q > 0);

  if (entries.length === 0) {
    list.innerHTML = '<div id="cart-empty">🛒 Noch nichts im Warenkorb</div>';
    return;
  }

  entries.forEach(([id, qty]) => {
    const p = products.find(x => x.id == id);
    if (!p) return;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <span class="ci-emoji">${p.emoji}</span>
      <span class="ci-name">${p.name}</span>
      <div class="ci-controls">
        <button class="qty-btn qty-minus" data-id="${p.id}">−</button>
        <span class="qty-num">${qty}</span>
        <button class="qty-btn" data-id="${p.id}" data-add="1">+</button>
      </div>
      <span class="ci-subtotal">${fmt(p.price * qty)}</span>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.qty-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.add) addToCart(id); else removeFromCart(id);
    };
  });
}

function getTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id == id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}
function getItemCount() {
  return Object.values(cart).reduce((a,b)=>a+b,0);
}

function updateTotals() {
  const total = getTotal();
  document.getElementById('total-display').textContent = fmt(total);
  const count = getItemCount();
  document.getElementById('items-count').textContent = count === 0 ? '0 Artikel' : count + ' Artikel';
  updateRueckgeld();
  updateQuickAmounts(total);
}

function updateRueckgeld() {
  const total = getTotal();
  const given = parseFloat(document.getElementById('gegeben-input').value) || 0;
  const box = document.getElementById('rueckgeld-box');
  const disp = document.getElementById('rueckgeld-display');
  const label = box.querySelector('.rg-label');
  if (given === 0) { disp.textContent = '– €'; label.textContent = 'Rückgeld'; box.style.background = ''; return; }
  const change = given - total;
  disp.textContent = fmt(Math.abs(change));
  if (change < 0) {
    box.style.background = 'linear-gradient(135deg, #b3392c, #7c2419)';
    label.textContent = 'Zu wenig ⚠️';
  } else {
    box.style.background = 'linear-gradient(135deg, #2e8b57, #1f6b40)';
    label.textContent = 'Rückgeld';
  }
}

function updateQuickAmounts(total) {
  const container = document.getElementById('quick-amounts');
  container.innerHTML = '';
  if (total <= 0) return;
  const amounts = [5, 10, 20, 50].filter(a => a >= total - 0.01);
  const rounded = Math.ceil(total * 2) / 2;
  const suggestions = [...new Set([rounded, ...amounts])].sort((a,b)=>a-b).slice(0,5);
  suggestions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = fmt(a);
    btn.onclick = () => { document.getElementById('gegeben-input').value = a.toFixed(2); updateRueckgeld(); };
    container.appendChild(btn);
  });
}

function addToCart(id) { cart[id] = (cart[id] || 0) + 1; refresh(); }
function removeFromCart(id) { if (!cart[id]) return; cart[id]--; if (cart[id] === 0) delete cart[id]; refresh(); }
function clearCart() { cart = {}; document.getElementById('gegeben-input').value = ''; refresh(); }

function refresh() { renderProducts(); renderCart(); updateTotals(); }

document.getElementById('btn-pay').onclick = () => {
  const total = getTotal();
  if (total === 0) return;
  const given = parseFloat(document.getElementById('gegeben-input').value) || 0;
  const change = given - total;
  document.getElementById('overlay-rueckgeld').textContent = given > 0 ? fmt(Math.max(0, change)) + ' Rückgeld' : '';
  document.getElementById('overlay-details').textContent = given > 0
    ? `Betrag: ${fmt(total)} · Gegeben: ${fmt(given)}`
    : `Betrag: ${fmt(total)}`;
  document.getElementById('success-overlay').classList.add('show');
};
document.getElementById('btn-next').onclick = () => {
  document.getElementById('success-overlay').classList.remove('show');
  clearCart();
};
document.getElementById('btn-clear').onclick = clearCart;
document.getElementById('gegeben-input').addEventListener('input', updateRueckgeld);

// ============================================================
// ADMIN: LOGIN
// ============================================================
const ADMIN_SESSION_KEY = "rsn_admin_unlocked";

document.getElementById('btn-admin-open').onclick = () => {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') {
    openAdmin();
  } else {
    document.getElementById('admin-login-overlay').classList.add('show');
    document.getElementById('admin-password-input').value = '';
    document.getElementById('admin-login-error').textContent = '';
    document.getElementById('admin-password-input').focus();
  }
};

document.getElementById('btn-admin-cancel').onclick = () => {
  document.getElementById('admin-login-overlay').classList.remove('show');
};

document.getElementById('btn-admin-login').onclick = tryAdminLogin;
document.getElementById('admin-password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryAdminLogin();
});

async function tryAdminLogin() {
  const input = document.getElementById('admin-password-input').value;
  const hash = await sha256(input);
  if (hash === ADMIN_PASSWORD_HASH) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    document.getElementById('admin-login-overlay').classList.remove('show');
    openAdmin();
  } else {
    document.getElementById('admin-login-error').textContent = 'Falsches Passwort';
  }
}

function openAdmin() {
  document.getElementById('pos-view').classList.add('hidden');
  document.getElementById('admin-view').classList.add('show');
  renderAdminProducts();
  renderIconRepository();
}
document.getElementById('btn-admin-close').onclick = () => {
  document.getElementById('admin-view').classList.remove('show');
  document.getElementById('pos-view').classList.remove('hidden');
  refresh();
};

// ============================================================
// ADMIN: PRODUKTE BEARBEITEN / LÖSCHEN
// ============================================================
function renderAdminProducts() {
  const container = document.getElementById('admin-product-list');
  container.innerHTML = '';
  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'admin-product-row';
    row.innerHTML = `
      <span class="ap-emoji">${p.emoji}</span>
      <input type="text" data-id="${p.id}" data-field="name" value="${p.name}">
      <input type="number" data-id="${p.id}" data-field="price" value="${p.price.toFixed(2)}" step="0.10" min="0">
      <button class="btn-delete-product" data-id="${p.id}">🗑</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', () => {
      const id = parseInt(input.dataset.id);
      const p = products.find(x => x.id === id);
      if (!p) return;
      if (input.dataset.field === 'name') p.name = input.value.trim() || p.name;
      if (input.dataset.field === 'price') p.price = parseFloat(input.value) || 0;
      saveProducts();
    });
  });

  container.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      if (!confirm('Dieses Produkt wirklich löschen?')) return;
      products = products.filter(x => x.id !== id);
      delete cart[id];
      saveProducts();
      renderAdminProducts();
    };
  });
}

// ============================================================
// ADMIN: NEUES PRODUKT / ICON-REPOSITORY
// ============================================================
function renderIconRepository() {
  const container = document.getElementById('icon-repository');
  container.innerHTML = '';
  ICON_REPOSITORY.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-choice' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.onclick = () => {
      selectedIcon = icon;
      document.getElementById('selected-icon-display').textContent = icon;
      container.querySelectorAll('.icon-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    container.appendChild(btn);
  });
  document.getElementById('selected-icon-display').textContent = selectedIcon;
}

document.getElementById('btn-add-product').onclick = () => {
  const nameInput = document.getElementById('new-product-name');
  const priceInput = document.getElementById('new-product-price');
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);

  if (!name) { alert('Bitte einen Namen eingeben.'); return; }
  if (isNaN(price) || price < 0) { alert('Bitte einen gültigen Preis eingeben.'); return; }

  const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  products.push({ id: newId, emoji: selectedIcon, name, price });
  saveProducts();

  nameInput.value = '';
  priceInput.value = '';
  renderAdminProducts();
};

// ============================================================
// ADMIN: DATENVERWALTUNG (Export / Reset)
// ============================================================
document.getElementById('btn-export').onclick = () => {
  const dataStr = JSON.stringify(products, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'produkte-export.json';
  a.click();
  URL.revokeObjectURL(url);
};

document.getElementById('btn-reset').onclick = () => {
  if (!confirm('Alle Produkte auf die Standardwerte zurücksetzen?')) return;
  products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  saveProducts();
  renderAdminProducts();
};

// ============================================================
// INIT
// ============================================================
refresh();
