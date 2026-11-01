/* shopvintage.de – Warenkorb + Produkte aus products.json
   Einbinden in index.html direkt vor </body>, NACH dem bestehenden <script>:  <script src="cart.js"></script> */
(function () {
  const FREE_FROM = 75, SHIPPING = 7.69, KEY = 'sv_cart';
  const eur = n => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = p => typeof p === 'number' ? p : parseFloat(String(p).replace(/[^\d,]/g, '').replace(',', '.'));
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };

  const css = document.createElement('style');
  css.textContent = `
  .cart-fab{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:90;background:var(--olive);color:#fff;border:0;border-radius:30px;padding:14px 20px;font:500 14px 'Work Sans',sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2)}
  .cart-fab b{background:#fff;color:var(--olive);border-radius:10px;padding:1px 8px;margin-left:6px}
  .cart-ov{position:fixed;inset:0;background:rgba(26,25,22,.55);z-index:120;opacity:0;pointer-events:none;transition:opacity .25s}
  .cart-ov.open{opacity:1;pointer-events:auto}
  .cart-dr{position:absolute;right:0;top:0;bottom:0;width:min(420px,100%);background:var(--cream);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s}
  .cart-ov.open .cart-dr{transform:none}
  .cart-hd{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid var(--line)}
  .cart-hd h3{font-size:22px}.cart-x{background:none;border:0;font-size:26px;cursor:pointer}
  .cart-body{flex:1;overflow:auto;padding:14px 22px}
  .cart-line{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);align-items:center}
  .cart-line img{width:56px;height:70px;object-fit:cover;border-radius:4px;background:#f0eee5}
  .cart-line div{flex:1;font-size:14px}.cart-line small{color:var(--muted);display:block}
  .cart-rm{background:none;border:0;color:var(--muted);cursor:pointer;text-decoration:underline;font-size:12px}
  .cart-ft{padding:18px 22px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:#fff;font-size:14px}
  .cart-row{display:flex;justify-content:space-between;margin-bottom:6px}.cart-tot{font-weight:600;font-size:17px}
  .cart-bar{height:6px;background:var(--line);border-radius:3px;margin:8px 0 12px;overflow:hidden}.cart-bar i{display:block;height:100%;background:var(--olive)}
  .cart-go{width:100%;background:var(--olive);color:#fff;border:0;border-radius:4px;padding:14px;font:500 15px 'Work Sans',sans-serif;cursor:pointer;margin-top:10px}
  .cart-go:disabled{opacity:.5;cursor:default}
  .cart-msg{position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:130;background:var(--olive);color:#fff;padding:12px 22px;border-radius:6px;font-size:14px}`;
  document.head.appendChild(css);

  const fab = document.createElement('button');
  fab.className = 'cart-fab'; fab.setAttribute('aria-label', 'Warenkorb öffnen');
  const ov = document.createElement('div');
  ov.className = 'cart-ov';
  ov.innerHTML = `<div class="cart-dr"><div class="cart-hd"><h3>Warenkorb</h3><button class="cart-x" aria-label="Schließen">&times;</button></div><div class="cart-body"></div><div class="cart-ft"></div></div>`;
  document.body.append(fab, ov);
  const body = ov.querySelector('.cart-body'), ft = ov.querySelector('.cart-ft');
  const open = () => { draw(); ov.classList.add('open'); }, close = () => ov.classList.remove('open');
  fab.onclick = open;
  ov.querySelector('.cart-x').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };

  const find = id => items.find(i => i.id === id);
  const sum = () => cart.reduce((s, id) => s + (find(id) ? num(find(id).price) : 0), 0);

  function draw() {
    cart = cart.filter(id => find(id)); save();
    const sub = sum(), ship = sub >= FREE_FROM || !cart.length ? 0 : SHIPPING;
    fab.innerHTML = `🛍 Warenkorb <b>${cart.length}</b>`;
    body.innerHTML = cart.length ? cart.map(id => {
      const i = find(id);
      return `<div class="cart-line"><img src="images/${esc(i.folder)}/A1.jpeg" alt=""><div>${esc(i.n)}<small>${esc(i.b)} · Gr. ${esc(i.size)}</small><button class="cart-rm" data-id="${i.id}">Entfernen</button></div><strong>${esc(i.price)}</strong></div>`;
    }).join('') : '<p style="color:var(--muted)">Dein Warenkorb ist leer.</p>';
    const rest = Math.max(0, FREE_FROM - sub);
    ft.innerHTML = cart.length ? `
      <div>${rest > 0 ? `Noch <b>${eur(rest)}</b> bis zum kostenlosen Versand` : '🎉 Du sparst dir den Versand!'}</div>
      <div class="cart-bar"><i style="width:${Math.min(100, sub / FREE_FROM * 100)}%"></i></div>
      <div class="cart-row"><span>Zwischensumme</span><span>${eur(sub)}</span></div>
      <div class="cart-row"><span>Versand (DHL)</span><span>${ship ? eur(ship) : 'kostenlos'}</span></div>
      <div class="cart-row cart-tot"><span>Gesamt</span><span>${eur(sub + ship)}</span></div>
      <button class="cart-go">Sicher bezahlen</button>` : '';
    body.querySelectorAll('.cart-rm').forEach(b => b.onclick = () => { cart = cart.filter(x => x !== +b.dataset.id); save(); draw(); });
    const go = ft.querySelector('.cart-go');
    if (go) go.onclick = checkout;
  }

  async function checkout() {
    const go = ft.querySelector('.cart-go');
    go.disabled = true; go.textContent = 'Einen Moment …';
    try {
      const r = await fetch('/.netlify/functions/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: cart }) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || 'Fehler');
      location.href = d.url;
    } catch (e) {
      alert('Checkout nicht möglich: ' + e.message);
      go.disabled = false; go.textContent = 'Sicher bezahlen';
    }
  }

  function toast(t) {
    const m = document.createElement('div'); m.className = 'cart-msg'; m.textContent = t;
    document.body.appendChild(m); setTimeout(() => m.remove(), 5000);
  }

  // "Jetzt sicher kaufen" im Detail-Fenster -> in den Warenkorb
  const buy = document.getElementById('modalBuyBtn');
  buy.textContent = 'In den Warenkorb';
  buy.addEventListener('click', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const it = items.find(i => i.n === modalTitle.textContent && (i.b + ' · ' + i.cat) === modalBrand.textContent);
    if (!it) return;
    if (!cart.includes(it.id)) cart.push(it.id); // Einzelstücke: nur 1x pro Artikel
    save(); overlay.classList.remove('open'); open();
  }, true);

  // Produkte aus products.json (vom Admin-Tool erzeugt); sonst bleiben die Einträge aus index.html
  fetch('products.json?' + Date.now()).then(r => r.ok ? r.json() : null).then(list => {
    if (Array.isArray(list)) {
      items.length = 0;
      list.filter(p => !p.sold).forEach(p => items.push({ id: p.id, folder: p.folder, cat: p.cat, b: p.brand, n: p.name, size: p.size, desc: p.desc, price: eur(num(p.price)) }));
      renderProducts('all');
    }
    draw();
  }).catch(draw);

  const q = new URLSearchParams(location.search);
  if (q.get('success')) { cart = []; save(); toast('Danke für deine Bestellung! Du bekommst eine Bestätigung per E-Mail.'); history.replaceState({}, '', location.pathname); }
  draw();
})();
