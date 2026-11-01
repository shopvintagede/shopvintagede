{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // Erstellt eine Stripe-Checkout-Session. Preise werden SERVERSEITIG aus products.json gelesen,\
// damit niemand im Browser Preise manipulieren kann.\
const FREE_FROM = 75, SHIPPING_CENTS = 769;\
\
exports.handler = async (event) => \{\
  const json = (statusCode, body) => (\{ statusCode, headers: \{ 'Content-Type': 'application/json' \}, body: JSON.stringify(body) \});\
  if (event.httpMethod !== 'POST') return json(405, \{ error: 'Method not allowed' \});\
  try \{\
    const \{ ids \} = JSON.parse(event.body || '\{\}');\
    if (!Array.isArray(ids) || !ids.length || ids.length > 50) return json(400, \{ error: 'Warenkorb ist leer.' \});\
\
    const base = process.env.URL || `https://$\{event.headers.host\}`;\
    const all = await (await fetch(`$\{base\}/products.json?$\{Date.now()\}`)).json();\
    const chosen = [...new Set(ids)].map(id => all.find(p => p.id === id));\
    if (chosen.some(p => !p || p.sold)) return json(409, \{ error: 'Ein Artikel ist leider nicht mehr verf\'fcgbar.' \});\
\
    const cents = chosen.map(p => Math.round(Number(p.price) * 100));\
    const subtotal = cents.reduce((a, b) => a + b, 0);\
    const shipping = subtotal >= FREE_FROM * 100 ? 0 : SHIPPING_CENTS;\
\
    const f = new URLSearchParams(\{\
      mode: 'payment', locale: 'de',\
      success_url: `$\{base\}/?success=1`, cancel_url: `$\{base\}/`,\
      'shipping_address_collection[allowed_countries][0]': 'DE',\
      'phone_number_collection[enabled]': 'true',\
      'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',\
      'shipping_options[0][shipping_rate_data][display_name]': shipping ? 'DHL Paket' : 'DHL Paket (kostenlos ab 75 \'80)',\
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(shipping),\
      'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'eur',\
      'metadata[artikel]': chosen.map(p => `$\{p.folder\}`).join(',').slice(0, 480),\
    \});\
    chosen.forEach((p, i) => \{\
      f.set(`line_items[$\{i\}][quantity]`, '1');\
      f.set(`line_items[$\{i\}][price_data][currency]`, 'eur');\
      f.set(`line_items[$\{i\}][price_data][unit_amount]`, String(cents[i]));\
      f.set(`line_items[$\{i\}][price_data][product_data][name]`, `$\{p.brand\} $\{p.name\} (Gr. $\{p.size\})`);\
    \});\
\
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', \{\
      method: 'POST',\
      headers: \{ Authorization: `Bearer $\{process.env.STRIPE_SECRET_KEY\}`, 'Content-Type': 'application/x-www-form-urlencoded' \},\
      body: f,\
    \});\
    const s = await r.json();\
    if (!r.ok) return json(500, \{ error: s.error?.message || 'Stripe-Fehler' \});\
    return json(200, \{ url: s.url \});\
  \} catch (e) \{\
    return json(500, \{ error: 'Serverfehler' \});\
  \}\
\};}