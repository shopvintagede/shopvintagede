// Öffentlich: liefert das aktuell laufende Angebot (oder null)
import { getStore } from "@netlify/blobs";
export default async () => {
  const offer = await getStore("shop").get("offer", { type: "json" });
  const active = offer && offer.endsAt > Date.now() ? offer : null;
  return new Response(JSON.stringify(active), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};
