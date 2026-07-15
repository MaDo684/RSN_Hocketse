'use strict';

const BUILTIN_ICONS = ['\uD83C\uDF2D','\uD83E\uDD68','\uD83C\uDF70','\uD83E\uDDC1','\uD83C\uDF6A','\uD83E\uDD50','\uD83E\uDDC7','\uD83C\uDF69','\uD83C\uDF7F','\uD83C\uDF5F','\uD83C\uDF55','\uD83E\uDD6A','\uD83E\uDDC6','\uD83C\uDF54','\uD83E\uDD57','\uD83C\uDF4E','\uD83C\uDF4C','\uD83C\uDF53','\uD83C\uDF49','\uD83C\uDF47','\uD83E\uDD64','\uD83E\uDDC3','\uD83D\uDCA7','\u2615','\uD83C\uDF75','\uD83E\uDDCB','\uD83C\uDF6C','\uD83C\uDF6D','\uD83C\uDF6B','\uD83C\uDF66','\uD83C\uDF68','\uD83E\uDD5B','\uD83E\uDDC0','\uD83E\uDD56','\uD83C\uDF5E','\uD83E\uDD53','\uD83E\uDDC8','\uD83C\uDF6F','\uD83C\uDF9F','\uD83C\uDF88','\uD83C\uDF89','\uD83C\uDFAF','\uD83C\uDFC6','\u26BD','\uD83C\uDFC0','\uD83C\uDFB2','\uD83E\uDDF8','\uD83D\uDCDA','\u270F','\uD83C\uDFA8','\uD83C\uDFB5','\uD83C\uDFA4','\uD83C\uDF81','\uD83D\uDC90'];

const DEFAULT_PRODUCTS = [
  { id: crypto.randomUUID(), name: 'Rote Wurst', price: 3.50, icon: '\uD83C\uDF2D', sort_order: 1 },
  { id: crypto.randomUUID(), name: 'Brezel', price: 1.50, icon: '\uD83E\uDD68', sort_order: 2 },
  { id: crypto.randomUUID(), name: 'Kuchen', price: 2.00, icon: '\uD83C\uDF70', sort_order: 3 },
  { id: crypto.randomUUID(), name: 'Waffel', price: 2.50, icon: '\uD83E\uDDC7', sort_order: 4 },
  { id: crypto.randomUUID(), name: 'Getr\u00e4nk', price: 2.00, icon: '\uD83E\uDD64', sort_order: 5 }
];

const STORAGE_PRODUCTS = 'rsn_hocketse_v21_products';
const STORAGE_CUSTOM_ICONS = 'rsn_hocketse_v21_custom_icons';

let products = [];
let customIcons = [];
let cart = new Map();
let db = null;
let selectedIconTarget = null;
let selectedNewIcon = '\uD83C\uDF70';
let lastSignature = '';
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));
const parseMoney = (v) => Number(String(v || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
const isDataIcon = (icon) => typeof icon === 'string' && icon.startsWith('data:image/');
const iconMarkup = (icon) => isDataIcon(icon) ? ('<img src="' + icon + '" alt="">') : String(icon || '\uD83E\uDDFE');
const total = () => [...cart.values()].reduce((s, i) => s + i.price * i.qty, 0);
const normalize = (p, i) => ({
  id: p.id || crypto.randomUUID(),
  name: String(p.name || '').trim() || 'Produkt',
  price: Number(p.price || 0),
  icon: p.icon || '\uD83E\uDDFE',
  sort_order: Number(p.sort_order != null ? p.sort_order : (i || 0) + 1),
  updated_at: p.updated_at || null
});
const signature = (rows) => JSON.stringify(rows.map(p => [p.id, p.name, Number(p.price), p.icon, Number(p.sort_order)]));

function showToast(text) {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
function setSync(text, kind) {
  const el = $('sync-state');
  if (!el) return;
  el.textContent = text;
  el.className = 'sync-badge' + (kind ? ' ' + kind : '');
}
function setupLogo() {
  if (!APP_CONFIG.logoUrl) return;
  const img = $('school-logo');
  const fb = $('logo-fallback');
  if (!img || !fb) return;
  img.onload = () => { img.hidden = false; fb.hidden = true; };
  img.onerror = () => { img.hidden = true; fb.hidden = false; };
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
    icon: p.icon || '\uD83E\uDDFE',
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
async function persistProducts(message) {
  products = products.map((p, idx) => Object.assign(normalize(p, idx), { sort_order: idx + 1 }));
  localSave();
  renderAll();
  if (!SUPABASE_CONFIG.enabled) { setSync('Lokal', 'warn'); return; }
  try {
    setSync('Speichere...', 'warn');
    await saveCloud();
    setSync('Synchronisiert', 'ok');
    if (message) showToast(message);
  } catch (err) {
    console.error(err);
    setSync('Supabase-Fehler', 'warn');
    showToast('Lokal gespeichert, Cloud-Fehler');
  }
}
async function initialLoad() {
  localLoad();
  renderAll();
  if (!SUPABASE_CONFIG.enabled) { setSync('Lokal', 'warn'); return; }
  try {
    setSync('Lade Supabase...', 'warn');
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
  const adminEl = $('admin-overlay');
  if (adminEl && adminEl.hidden === false) return;
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
    else cart.set(id, Object.assign({}, item, { name: p.name, price: p.price, icon: p.icon }));
  }
}
function renderAll() {
  renderProducts();
  renderCart();
  const adminContent = $('admin-content');
  if (adminContent && !adminContent.hidden) renderAdminProducts();
}
function renderProducts() {
  const grid = $('product-grid');
  if (!grid) return;
  grid.innerHTML = '';
  $('product-count').textContent = products.length + ' Artikel';
  products.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-card';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'product-icon';
    iconSpan.innerHTML = iconMarkup(p.icon);
    const nameSpan = document.createElement('span');
    nameSpan.className = 'product-name';
    nameSpan.textContent = p.name;
    const priceSpan = document.createElement('span');
    priceSpan.className = 'product-price';
    priceSpan.textContent = money(p.price);
    btn.appendChild(iconSpan);
    btn.appendChild(nameSpan);
    btn.appendChild(priceSpan);
    btn.addEventListener('click', () => addToCart(p.id));
    grid.appendChild(btn);
  });
}
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const item = cart.get(id) || Object.assign({}, p, { qty: 0 });
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
  if (!list) return;
  list.innerHTML = '';
  if (cart.size === 0) {
    list.className = 'cart-list empty';
    list.textContent = 'Noch keine Artikel ausgew\u00e4hlt.';
  } else {
    list.className = 'cart-list';
    [...cart.values()].forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'cart-title';
      title.textContent = item.name;
      const sub = document.createElement('div');
      sub.className = 'cart-sub';
      sub.textContent = money(item.price) + ' \u00d7 ' + item.qty + ' = ' + money(item.price * item.qty);
      info.appendChild(title);
      info.appendChild(sub);
      const qty = document.createElement('div');
      qty.className = 'qty';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '\u2212';
      minus.addEventListener('click', () => changeQty(item.id, -1));
      const num = document.createElement('strong');
      num.textContent = item.qty;
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.addEventListener('click', () => changeQty(item.id, 1));
      qty.appendChild(minus);
      qty.appendChild(num);
      qty.appendChild(plus);
      row.appendChild(info);
      row.appendChild(qty);
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
  if (!box) return;
  box.innerHTML = '';
  if (t <= 0) return;
  const values = Array.from(new Set([Math.ceil(t), Math.ceil(t/5)*5, Math.ceil(t/10)*10, Math.ceil(t/20)*20])).filter(v => v >= t);
  values.slice(0, 4).forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = money(v);
    b.addEventListener('click', () => { $('given-input').value = v.toFixed(2).replace('.', ','); renderChange(); });
    box.appendChild(b);
  });
}
function renderChange() {
  const el = $('change-output');
  if (!el) return;
  const diff = parseMoney($('given-input').value) - total();
  if (total() <= 0) {
    el.textContent = 'R\u00fcckgeld: 0,00 \u20ac';
    el.className = 'change neutral';
  } else if (diff >= 0) {
    el.textContent = 'R\u00fcckgeld: ' + money(diff);
    el.className = 'change ok';
  } else {
    el.textContent = 'Zu wenig: ' + money(Math.abs(diff));
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
  const el = $('admin-overlay');
  el.hidden = false;
  el.style.display = 'grid';
  const pw = $('admin-password');
  if (pw) setTimeout(() => pw.focus(), 50);
}
function closeAdmin() {
  const el = $('admin-overlay');
  el.hidden = true;
  el.style.display = 'none';
  const pw = $('admin-password');
  if (pw) pw.value = '';
}
function openIconPicker(target) {
  selectedIconTarget = target;
  renderIconPicker();
  const el = $('icon-overlay');
  el.hidden = false;
  el.style.display = 'grid';
}
function closeIconPicker() {
  const el = $('icon-overlay');
  el.hidden = true;
  el.style.display = 'none';
}

function renderAdminProducts() {
  const wrap = $('admin-products');
  if (!wrap) return;
  wrap.innerHTML = '';
  products.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'admin-row';

    const iconBtn = document.createElement('button');
    iconBtn.type = 'button';
    iconBtn.className = 'admin-icon';
    iconBtn.innerHTML = iconMarkup(p.icon);
    iconBtn.addEventListener('click', () => openIconPicker({ type: 'product', id: p.id }));

    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.value = p.name;
    nameInp.addEventListener('change', async (e) => { p.name = e.target.value.trim() || p.name; await persistProducts('Name ge\u00e4ndert'); });

    const priceInp = document.createElement('input');
    priceInp.type = 'text';
    priceInp.inputMode = 'decimal';
    priceInp.value = p.price.toFixed(2).replace('.', ',');
    priceInp.addEventListener('change', async (e) => { p.price = parseMoney(e.target.value); await persistProducts('Preis ge\u00e4ndert'); });

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'small-btn';
    up.textContent = '\u25B2';
    up.disabled = idx === 0;
    up.addEventListener('click', async () => { const t = products[idx-1]; products[idx-1] = products[idx]; products[idx] = t; await persistProducts('Sortiert'); });

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'small-btn';
    down.textContent = '\u25BC';
    down.disabled = idx === products.length - 1;
    down.addEventListener('click', async () => { const t = products[idx+1]; products[idx+1] = products[idx]; products[idx] = t; await persistProducts('Sortiert'); });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger-btn';
    del.textContent = 'L\u00f6schen';
    del.addEventListener('click', async () => {
      if (!confirm('Produkt "' + p.name + '" wirklich l\u00f6schen?')) return;
      products = products.filter(x => x.id !== p.id);
      cart.delete(p.id);
      await persistProducts('Produkt gel\u00f6scht');
    });

    row.appendChild(iconBtn);
    row.appendChild(nameInp);
    row.appendChild(priceInp);
    row.appendChild(up);
    row.appendChild(down);
    row.appendChild(del);
    wrap.appendChild(row);
  });
}
function sortProducts(mode) {
  if (mode === 'name') products.sort((a,b) => a.name.localeCompare(b.name, 'de'));
  if (mode === 'price-up') products.sort((a,b) => a.price - b.price);
  if (mode === 'price-down') products.sort((a,b) => b.price - a.price);
  persistProducts('Sortiert');
}
function allCustomIcons() {
  const fromProducts = products.map(p => p.icon).filter(isDataIcon);
  return Array.from(new Set([...customIcons, ...fromProducts]));
}
function renderIconPicker() {
  const g = $('icon-grid');
  if (!g) return;
  g.innerHTML = '';
  BUILTIN_ICONS.forEach(icon => g.appendChild(iconButton(icon)));
  const cg = $('custom-icon-grid');
  if (!cg) return;
  cg.innerHTML = '';
  const custom = allCustomIcons();
  if (!custom.length) {
    const note = document.createElement('p');
    note.style.color = '#66758a';
    note.textContent = 'Noch keine eigenen Icons vorhanden.';
    cg.appendChild(note);
  } else {
    custom.forEach(icon => cg.appendChild(iconButton(icon)));
  }
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
  if (!selectedIconTarget) { closeIconPicker(); return; }
  if (selectedIconTarget.type === 'new') {
    selectedNewIcon = icon;
    const btn = $('new-icon');
    if (btn) btn.innerHTML = iconMarkup(icon);
  } else {
    const p = products.find(x => x.id === selectedIconTarget.id);
    if (p) {
      p.icon = icon;
      await persistProducts('Icon ge\u00e4ndert');
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
  $('admin-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); loginAdmin(); } });

  $('sort-name').addEventListener('click', () => sortProducts('name'));
  $('sort-price-up').addEventListener('click', () => sortProducts('price-up'));
  $('sort-price-down').addEventListener('click', () => sortProducts('price-down'));
  $('reload-admin').addEventListener('click', async () => { await pollCloud(); renderAdminProducts(); });

  $('new-icon').addEventListener('click', () => openIconPicker({ type: 'new' }));
  $('add-product').addEventListener('click', async () => {
    const name = $('new-name').value.trim();
    const price = parseMoney($('new-price').value);
    if (!name || price <= 0) { showToast('Bitte Name und Preis eingeben'); return; }
    products.push({ id: crypto.randomUUID(), name: name, price: price, icon: selectedNewIcon, sort_order: products.length + 1 });
    $('new-name').value = '';
    $('new-price').value = '';
    selectedNewIcon = '\uD83C\uDF70';
    $('new-icon').textContent = '\uD83C\uDF70';
    await persistProducts('Produkt hinzugef\u00fcgt');
  });

  $('icon-close').addEventListener('click', closeIconPicker);
  $('icon-upload').addEventListener('change', async (e) => {
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const iconO = $('icon-overlay');
      const adminO = $('admin-overlay');
      if (iconO && !iconO.hidden) { closeIconPicker(); return; }
      if (adminO && !adminO.hidden) { closeAdmin(); return; }
    }
  });
}
async function boot() {
  setupLogo();

  const iconO = $('icon-overlay');
  iconO.hidden = true;
  iconO.style.display = 'none';
  const adminO = $('admin-overlay');
  adminO.hidden = true;
  adminO.style.display = 'none';

  iconO.addEventListener('click', (e) => { if (e.target === iconO) closeIconPicker(); });
  adminO.addEventListener('click', (e) => { if (e.target === adminO) closeAdmin(); });

  wireEvents();
  await initialLoad();
  setInterval(pollCloud, Math.max(5, SUPABASE_CONFIG.pollIntervalSeconds || 15) * 1000);
}
document.addEventListener('DOMContentLoaded', boot);
