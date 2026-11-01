// Admin: Angebot anlegen/beenden. Passwort steht NUR in Netlify (ADMIN_PASSWORD).
import { getStore } from "@netlify/blobs";
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
const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return out({ error: "POST erforderlich" }, 405);
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.headers.get("x-admin-password") !== pw) return out({ error: "Falsches Passwort" }, 401);
  const store = getStore("shop");
  const body = await req.json();
  try {
    if (body.action === "status") return out({ offer: await store.get("offer", { type: "json" }) });

    if (body.action === "end") {
      const o = await store.get("offer", { type: "json" });
      if (o?.promoId) await stripe("promotion_codes/" + o.promoId, { active: "false" });
      await store.delete("offer");
      return out({ ok: true });
    }

    if (body.action === "create") {
      const percent = Number(body.percent), hours = Number(body.hours);
      const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!(percent > 0 && percent <= 100) || !(hours > 0) || code.length < 3) return out({ error: "Bitte Rabatt (1-100), Dauer in Stunden und Code prüfen." }, 400);
      const endsAt = Date.now() + hours * 3600000;
      const coupon = await stripe("coupons", { percent_off: String(percent), duration: "once", name: body.title || code });
      const promo = await stripe("promotion_codes", {
        coupon: coupon.id, code, expires_at: String(Math.floor(endsAt / 1000)),
        ...(body.firstOnly ? { "restrictions[first_time_transaction]": "true" } : {}),
      });
      const offer = { title: body.title || "Aktion", percent, code, firstOnly: !!body.firstOnly, endsAt, promoId: promo.id };
      await store.setJSON("offer", offer);
      return out({ ok: true, offer });
    }
    return out({ error: "Unbekannte Aktion" }, 400);
  } catch (e) { return out({ error: e.message }, 500); }
};
