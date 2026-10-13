// Treuepunkte: zählt Käufe pro E-Mail, beim 5., 10., 15. ... Kauf gibt es einen 5-€-Code per Mail
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
const stripe = async (path, params) => {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Stripe-Fehler");
  return j;
};
const validSig = (raw, header) => {
  const p = Object.fromEntries((header || "").split(",").map((x) => x.split("=")));
  const exp = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(p.t + "." + raw).digest("hex");
  return p.v1 && p.v1.length === exp.length && crypto.timingSafeEqual(Buffer.from(p.v1), Buffer.from(exp));
};
export default async (req) => {
  const raw = await req.text();
  if (!validSig(raw, req.headers.get("stripe-signature"))) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed") return new Response("ignored");
  const s = event.data.object;
  const email = (s.customer_details?.email || "").trim().toLowerCase();
  if (!email) return new Response("no email");
  const store = getStore("loyalty");
  if (await store.get("seen-" + s.id)) return new Response("duplicate");
  await store.set("seen-" + s.id, "1");
  const key = "count-" + encodeURIComponent(email);
  const count = Number((await store.get(key)) || 0) + 1;
  await store.set(key, String(count));
  if (count % 5 === 0) {
    const coupon = await stripe("coupons", { amount_off: "500", currency: "eur", duration: "once", name: "Treue-Rabatt 5 EUR" });
    const code = "DANKE" + crypto.randomBytes(3).toString("hex").toUpperCase();
    await stripe("promotion_codes", { coupon: coupon.id, code, max_redemptions: "1" });
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM, to: email, subject: "Dein 5-€-Rabattcode von shopvintage.de",
        text: `Danke für deinen ${count}. Einkauf bei shopvintage.de!\n\nHier ist dein aktivierter Rabattcode über 5 €: ${code}\nGib ihn beim Bezahlen im Feld "Aktionscode" ein. Er ist einmal einlösbar.\n\nDein Team von shopvintage.de aus Uplengen`,
      }),
    });
  }
  return new Response("ok");
};
