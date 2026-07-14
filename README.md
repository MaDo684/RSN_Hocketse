<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0b2341" />
  <title>Schulfest-Kasse | Realschule Neuffen</title>
  <link rel="stylesheet" href="css/style.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script defer src="js/config.js"></script>
  <script defer src="js/app.js"></script>
</head>
<body>
  <header class="app-header">
    <div class="brand">
      <img id="school-logo" class="school-logo" alt="Logo Realschule Neuffen" />
      <div>
        <h1>Schulfest-Kasse</h1>
        <p>Realschule Neuffen</p>
      </div>
    </div>
    <div class="header-actions">
      <button id="refresh-cloud" class="ghost" title="Daten aus Supabase aktualisieren">🔄</button>
      <button id="open-admin" class="secondary">Admin</button>
    </div>
  </header>

  <main class="layout">
    <section class="sales-panel">
      <div class="total-sticky">
        <span>Gesamt</span>
        <strong id="total-top">0,00 €</strong>
      </div>
      <div class="section-title">
        <h2>Produkte</h2>
        <span id="sync-status" class="status">Lade ...</span>
      </div>
      <div id="products-grid" class="products-grid" aria-live="polite"></div>
    </section>

    <aside class="cart-panel">
      <h2>Warenkorb</h2>
      <div id="cart-items" class="cart-items empty">Noch keine Artikel ausgewählt.</div>
      <div class="cart-total cart-total-large">
        <span>Gesamtsumme</span><strong id="total-payment">0,00 €</strong>
      </div>
      <section class="payment-box">
        <label for="given-input">Gegeben</label>
        <input id="given-input" inputmode="decimal" type="text" placeholder="z. B. 20,00" />
        <div id="quick-amounts" class="quick-amounts"></div>
        <div id="change-result" class="change neutral">Rückgeld: 0,00 €</div>
      </section>
      <button id="clear-cart" class="danger wide">Warenkorb leeren</button>
    </aside>
  </main>

  <footer class="footer">
    <strong>Realschule Neuffen</strong> · Hohenzollernstraße 24 · 72639 Neuffen · 07025 9211-0 · info@rsneuffen.de
  </footer>

  <dialog id="admin-dialog" class="modal">
    <form method="dialog" class="modal-card admin-card">
      <button class="modal-close" value="close" aria-label="Schließen">×</button>
      <div id="admin-login">
        <h2>Admin-Bereich</h2>
        <p>Bitte Admin-Passwort eingeben. Das Passwort liegt nicht im Klartext im Code.</p>
        <input id="admin-password" type="password" autocomplete="current-password" placeholder="Passwort" />
        <button id="admin-login-btn" type="button" class="primary wide">Einloggen</button>
        <p id="login-error" class="error"></p>
      </div>
      <div id="admin-content" hidden>
        <h2>Produktverwaltung</h2>
        <p id="sync-explainer" class="hint"></p>
        <div class="admin-actions">
          <button id="sort-name" type="button">Name A–Z</button>
          <button id="sort-price-asc" type="button">Preis ↑</button>
          <button id="sort-price-desc" type="button">Preis ↓</button>
          <button id="reset-products" type="button" class="danger">Lokal zurücksetzen</button>
        </div>
        <div id="admin-products" class="admin-products"></div>
        <h3>Neues Produkt</h3>
        <div class="new-product">
          <button id="new-icon" class="icon-button" type="button">🍰</button>
          <input id="new-name" type="text" placeholder="Name" />
          <input id="new-price" type="text" inputmode="decimal" placeholder="Preis" />
          <button id="add-product" class="primary" type="button">Hinzufügen</button>
        </div>
      </div>
    </form>
  </dialog>

  <dialog id="icon-dialog" class="modal">
    <form method="dialog" class="modal-card icon-card">
      <button class="modal-close" value="close" aria-label="Schließen">×</button>
      <h2>Icon auswählen</h2>
      <h3>Schulfest-Icons</h3>
      <div id="builtin-icons" class="icon-grid"></div>
      <h3>Eigene Icons</h3>
      <p class="small-note">Eigene Icons werden lokal gespeichert. Sobald ein eigenes Icon einem Produkt zugewiesen wird, wird es mit diesem Produkt nach Supabase synchronisiert.</p>
      <div class="upload-row"><input id="icon-upload" type="file" accept="image/*" /></div>
      <div id="custom-icons" class="icon-grid custom-icons"></div>
    </form>
  </dialog>
</body>
</html>
