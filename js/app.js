'use strict';

const BUILTIN_ICONS = ['🌭','🥨','🍰','🧁','🍪','🥧','🧇','🍩','🍿','🍟','🍕','🥪','🥙','🍔','🥗','🍎','🍌','🍓','🍉','🍇','🥤','🧃','💧','☕','🍵','🧋','🍬','🍫','🍭','🍦','🍨','🥜','🧀','🥖','🍞','🥐','🧈','🍯','🎟️','🎈','🎉','🎯','🏆','⚽','🏀','🎲','🧸','📚','✏️','🎨','🎵','🎤','🎁','💐'];
const DEFAULT_PRODUCTS = [
  { id: crypto.randomUUID(), name: 'Rote Wurst', price: 3.50, icon: '🌭', sort_order: 1 },
  { id: crypto.randomUUID(), name: 'Brezel', price: 1.50, icon: '🥨', sort_order: 2 },
  { id: crypto.randomUUID(), name: 'Kuchen', price: 2.00, icon: '🍰', sort_order: 3 },
  { id: crypto.randomUUID(), name: 'Waffel', price: 2.50, icon: '🧇', sort_order: 4 },
  { id: crypto.randomUUID(), name: 'Getränk', price: 2.00, icon: '🥤', sort_order: 5 }
];
const STORAGE_PRODUCTS = 'rsn_hocketse_v2_products';
const STORAGE_CUSTOM_ICONS = 'rsn_hocketse_v2_custom_icons';

let products = [];
let customIcons = [];
let cart = new Map();
let db = null;
let selectedIconTarget = null;
let selectedNewIcon = '🍰';
let lastSignature = '';
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const parseMoney = (v) => Number(String(v || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
const isDataIcon = (icon) => typeof icon === 'string' && icon.startsWith('data:image/');
const iconMarkup = (icon) => isDataIcon(icon) ? `<img src="${icon}" alt="Eigenes Icon">` : String(icon || '🧾');
const total = () => [...cart.values()].reduce((s, i) => s + i.price * i.qty, 0);
const normalize = (p, i = 0) => ({
  id: p.id || crypto.randomUUID(),
  name: String(p.name || '').trim() || 'Produkt',
  price: Number(p.price || 0),
  icon: p.icon || '🧾',
  sort_order: Number(p.sort_order ?? i + 1),
  updated_at: p.updated_at || null
});
const signature = (rows) => JSON.stringify(rows.map(p => [p.id, p.name, Number(p.price), p.icon, Number(p.sort_order)]));

function showToast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
function setSync(text, kind = '') {
  const el = $('sync-state');
  el.textContent = text;
  el.className = `sync-badge ${kind}`.trim();
}
function setupLogo() {
  if (!APP_CONFIG.logoUrl) return;
  const img = $('school-logo');
  const fallback = $('logo-fallback');
  img.onload = () => { img.hidden = false; fallback.hidden = true; };
  img.onerror = () => { img.hidden = true; fallback.hidden = false; };
  img.src = APP_CONFIG.logoUrl;
}
function localLoad() {
  const raw = localStorage.getItem(STORAGE_PRODUCTS);
  products = (raw ? JSON.parse(raw) : DEFAULT_PRODUCTS).map(normalize).sort((a,b) => a.sort_order - b.sort_order);
  customIcons = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_ICONS) || '[]');
}
function localSave() {
  localStorage.setItem(STORAGE_PRODUCTS, JSON.stringify(products));
  localStorage.setItem(STORAGE_CUSTOM_ICONS, JSON.stringify(customIcons));
}
function ensureDb() {
  if (!SUPABASE_CONFIG.enabled) return false;
  if (!window.supabase) return false;
  if (!db) db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
  return true;
}
async function loadCloud() {
  if (!ensureDb()) return null;
  const { data, error } = await db
    .from(SUPABASE_CONFIG.table)
    .select('id,name,price,icon,sort_order,updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalize);
}
async function saveCloud() {
  if (!ensureDb()) return;
  const rows = products.map((p, idx) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price || 0),
    icon: p.icon || '🧾',
    sort_order: idx + 1,
    updated_at: new Date().toISOString()
  }));

  const { data: remote, error: readError } = await db.from(SUPABASE_CONFIG.table).select('id');
  if (readError) throw readError;
  const localIds = rows.map(r => r.id);
  const deleteIds = (remote || []).map(r => r.id).filter(id => !localIds.includes(id));
  if (deleteIds.length) {
    const { error: deleteError } = await db.from(SUPABASE_CONFIG.table).delete().in('id', deleteIds);
    if (deleteError) throw deleteError;
  }
  if (rows.length) {
    const { error: upsertError } = await db.from(SUPABASE_CONFIG.table).upsert(rows, { onConflict: 'id' });
    if (upsertError) throw upsertError;
  }
  lastSignature = signature(rows.map(normalize));
}
async function persistProducts(message = 'Gespeichert') {
  products = products.map((p, idx) => ({ ...normalize(p, idx), sort_order: idx + 1 }));
  localSave();
  renderAll();
  if (!SUPABASE_CONFIG.enabled) { setSync('Lokal', 'warn'); return; }
  try {
    setSync('Speichere…', 'warn');
    await saveCloud();
    setSync('Synchronisiert', 'ok');
    showToast(message);
  } catch (err) {
    console.error(err);
    setSync('Supabase-Fehler', 'warn');
    showToast('Speichern lokal erfolgt, Cloudfehler');
  }
}
async function initialLoad() {
  localLoad();
  renderAll();
  if (!SUPABASE_CONFIG.enabled) { setSync('Lokal', 'warn'); return; }
  try {
    setSync('Lade Supabase…', 'warn');
    const cloud = await loadCloud();
    if (cloud && cloud.length) {
      products = cloud;
      lastSignature = signature(cloud);
      localSave();
      setSync('Synchronisiert', 'ok');
      renderAll();
    } else {
      setSync('Keine Cloud-Daten', 'warn');
    }
  } catch (err) {
    console.error(err);
    setSync('Offline / lokal', 'warn');
  }
}
async function pollCloud() {
  if ($('admin-overlay').hidden === false) return;
  try {
    const cloud = await loadCloud();
    if (!cloud) return;
    const sig = signature(cloud);
    if (sig !== lastSignature) {
      products = cloud;
      lastSignature = sig;
      localSave();
      reconcileCart();
      renderAll();
    }
    setSync('Synchronisiert', 'ok');
  } catch (err) {
    console.warn(err);
    setSync('Offline / lokal', 'warn');
  }
}
function reconcileCart() {
  for (const [id, item] of cart) {
    const p = products.find(x => x.id === id);
    if (!p) cart.delete(id);
    else cart.set(id, { ...item, name: p.name, price: p.price, icon: p.icon });
  }
}
function renderAll() {
  renderProducts();
  renderCart();
  renderAdminProducts();
}
function renderProducts() {
  const grid = $('product-grid');
  grid.innerHTML = '';
  $('product-count').textContent = `${products.length} Artikel`;
  products.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-card';
    btn.innerHTML = `
      <span class="product-icon">${iconMarkup(p.icon)}</span>
      <span class="product-name"></span>
      <span class="product-price">${money(p.price)}</span>`;
    btn.querySelector('.product-name').textContent = p.name;
    btn.addEventListener('click', () => addToCart(p.id));
    grid.appendChild(btn);
  });
}
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const item = cart.get(id) || { ...p, qty: 0 };
  item.qty += 1;
  item.name = p.name;
  item.price = p.price;
  item.icon = p.icon;
  cart.set(id, item);
  renderCart();
}
function changeQty(id, diff) {
  const item = cart.get(id);
  if (!item) return;
  item.qty += diff;
  if (item.qty <= 0) cart.delete(id);
  else cart.set(id, item);
  renderCart();
}
function renderCart() {
  const list = $('cart-list');
  list.innerHTML = '';
  if (cart.size === 0) {
    list.className = 'cart-list empty';
    list.textContent = 'Noch keine Artikel ausgewählt.';
  } else {
    list.className = 'cart-list';
    [...cart.values()].forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div>
          <div class="cart-title"></div>
          <div class="cart-sub">${money(item.price)} × ${item.qty} = ${money(item.price * item.qty)}</div>
        </div>
        <div class="qty">
          <button type="button" aria-label="Menge reduzieren">−</button>
          <strong>${item.qty}</strong>
          <button type="button" aria-label="Menge erhöhen">+</button>
        </div>`;
      row.querySelector('.cart-title').textContent = item.name;
      const buttons = row.querySelectorAll('button');
      buttons[0].addEventListener('click', () => changeQty(item.id, -1));
      buttons[1].addEventListener('click', () => changeQty(item.id, 1));
      list.appendChild(row);
    });
  }
  const t = total();
  $('total-top').textContent = money(t);
  $('total-pay').textContent = money(t);
  renderQuickPay(t);
  renderChange();
}
function renderQuickPay(t) {
  const box = $('quick-buttons');
  box.innerHTML = '';
  if (t <= 0) return;
  const values = Array.from(new Set([Math.ceil(t), Math.ceil(t / 5) * 5, Math.ceil(t / 10) * 10, Math.ceil(t / 20) * 20])).filter(v => v >= t);
  values.slice(0, 4).forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = money(v);
    b.addEventListener('click', () => { $('given-input').value = v.toFixed(2).replace('.', ','); renderChange(); });
    box.appendChild(b);
  });
}
function renderChange() {
  const diff = parseMoney($('given-input').value) - total();
  const el = $('change-output');
  if (total() <= 0) {
    el.textContent = 'Rückgeld: 0,00 €';
    el.className = 'change neutral';
  } else if (diff >= 0) {
    el.textContent = `Rückgeld: ${money(diff)}`;
    el.className = 'change ok';
  } else {
    el.textContent = `Zu wenig: ${money(Math.abs(diff))}`;
    el.className = 'change bad';
  }
}
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function loginAdmin() {
  const hash = await sha256($('admin-password').value);
  if (hash === APP_CONFIG.adminPasswordHash) {
    $('login-box').hidden = true;
    $('admin-content').hidden = false;
    $('login-error').textContent = '';
    renderAdminProducts();
  } else {
    $('login-error').textContent = 'Passwort ist nicht korrekt.';
  }
}
function openAdmin() {
  $('admin-overlay').hidden = false;
  $('admin-password').focus();
}
function closeAdmin() {
  $('admin-overlay').hidden = true;
  $('admin-password').value = '';
}
function renderAdminProducts() {
  const wrap = $('admin-products');
  if (!wrap) return;
  wrap.innerHTML = '';
  products.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.innerHTML = `
      <button class="admin-icon" type="button">${iconMarkup(p.icon)}</button>
      <input class="adm-name" type="text" aria-label="Produktname">
      <input class="adm-price" type="text" inputmode="decimal" aria-label="Preis">
      <button class="small-btn admin-move up" type="button">▲</button>
      <button class="small-btn admin-move down" type="button">▼</button>
      <button class="danger-btn delete-product" type="button">Löschen</button>`;
    row.querySelector('.adm-name').value = p.name;
    row.querySelector('.adm-price').value = String(p.price.toFixed(2)).replace('.', ',');
    row.querySelector('.admin-icon').addEventListener('click', () => openIconPicker({ type: 'product', id: p.id }));
    row.querySelector('.adm-name').addEventListener('change', async e => { p.name = e.target.value.trim() || p.name; await persistProducts('Produkt geändert'); });
    row.querySelector('.adm-price').addEventListener('change', async e => { p.price = parseMoney(e.target.value); await persistProducts('Preis geändert'); });
    row.querySelector('.up').disabled = idx === 0;
    row.querySelector('.down').disabled = idx === products.length - 1;
    row.querySelector('.up').addEventListener('click', async () => { [products[idx - 1], products[idx]] = [products[idx], products[idx - 1]]; await persistProducts('Sortierung geändert'); });
    row.querySelector('.down').addEventListener('click', async () => { [products[idx + 1], products[idx]] = [products[idx], products[idx + 1]]; await persistProducts('Sortierung geändert'); });
    row.querySelector('.delete-product').addEventListener('click', async () => { products = products.filter(x => x.id !== p.id); cart.delete(p.id); await persistProducts('Produkt gelöscht'); });
    wrap.appendChild(row);
  });
}
function sortProducts(mode) {
  if (mode === 'name') products.sort((a,b) => a.name.localeCompare(b.name, 'de'));
  if (mode === 'price-up') products.sort((a,b) => a.price - b.price);
  if (mode === 'price-down') products.sort((a,b) => b.price - a.price);
  persistProducts('Sortierung geändert');
}
function openIconPicker(target) {
  selectedIconTarget = target;
  renderIconPicker();
  $('icon-overlay').hidden = false;
}
function closeIconPicker() { $('icon-overlay').hidden = true; }
function allCustomIcons() {
  return Array.from(new Set([...customIcons, ...products.map(p => p.icon).filter(isDataIcon)]));
}
function renderIconPicker() {
  const g = $('icon-grid');
  g.innerHTML = '';
  BUILTIN_ICONS.forEach(icon => g.appendChild(iconButton(icon)));
  const cg = $('custom-icon-grid');
  cg.innerHTML = '';
  const custom = allCustomIcons();
  if (!custom.length) cg.textContent = 'Noch keine eigenen Icons vorhanden.';
  custom.forEach(icon => cg.appendChild(iconButton(icon)));
}
function iconButton(icon) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-option';
  b.innerHTML = iconMarkup(icon);
  b.addEventListener('click', () => chooseIcon(icon));
  return b;
}
async function chooseIcon(icon) {
  if (!selectedIconTarget) return;
  if (selectedIconTarget.type === 'new') {
    selectedNewIcon = icon;
    $('new-icon').innerHTML = iconMarkup(icon);
  } else {
    const p = products.find(x => x.id === selectedIconTarget.id);
    if (p) {
      p.icon = icon;
      await persistProducts('Icon geändert');
    }
  }
  closeIconPicker();
}
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, 128, 128);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function wireEvents() {
  $('sync-now').addEventListener('click', async () => { await pollCloud(); showToast('Aktualisiert'); });
  $('given-input').addEventListener('input', renderChange);
  $('cart-clear').addEventListener('click', () => { cart.clear(); $('given-input').value = ''; renderCart(); });
  $('admin-open').addEventListener('click', openAdmin);
  $('admin-close').addEventListener('click', closeAdmin);
  $('admin-login').addEventListener('click', loginAdmin);
  $('admin-password').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loginAdmin(); } });
  $('sort-name').addEventListener('click', () => sortProducts('name'));
  $('sort-price-up').addEventListener('click', () => sortProducts('price-up'));
  $('sort-price-down').addEventListener('click', () => sortProducts('price-down'));
  $('reload-admin').addEventListener('click', async () => { await pollCloud(); renderAdminProducts(); });
  $('new-icon').addEventListener('click', () => openIconPicker({ type: 'new' }));
  $('add-product').addEventListener('click', async () => {
    const name = $('new-name').value.trim();
    const price = parseMoney($('new-price').value);
    if (!name || price <= 0) { showToast('Bitte Name und Preis eingeben'); return; }
    products.push({ id: crypto.randomUUID(), name, price, icon: selectedNewIcon, sort_order: products.length + 1 });
    $('new-name').value = '';
    $('new-price').value = '';
    selectedNewIcon = '🍰';
    $('new-icon').textContent = '🍰';
    await persistProducts('Produkt hinzugefügt');
  });
  $('icon-close').addEventListener('click', closeIconPicker);
  $('icon-upload').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      customIcons.push(dataUrl);
      localSave();
      renderIconPicker();
      showToast('Icon gespeichert');
    } catch (err) {
      console.error(err);
      showToast('Bild konnte nicht verarbeitet werden');
    }
    e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('icon-overlay').hidden) closeIconPicker();
      else if (!$('admin-overlay').hidden) closeAdmin();
    }
  });
}
async function boot() {
  setupLogo();
  wireEvents();
  await initialLoad();
  setInterval(pollCloud, Math.max(5, SUPABASE_CONFIG.pollIntervalSeconds || 15) * 1000);
}

document.addEventListener('DOMContentLoaded', boot);
