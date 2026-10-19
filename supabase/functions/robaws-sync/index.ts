// Haalt de volledige klantenlijst uit Robaws en zet ze in de tabel `klanten`.
// De zoekfilter op /clients werkt niet in Robaws, dus we lezen altijd alle pagina's en zoeken in de app zelf.
// Secrets (supabase secrets set): ROBAWS_ACCESS_KEY, ROBAWS_SECRET, optioneel ROBAWS_BASE_URL.
// Oproepen: nachtelijk via pg_cron (zie supabase/cron.sql) of met de knop "Klanten verversen" in de app.

import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const BASIS = Deno.env.get("ROBAWS_BASE_URL") ?? "https://app.robaws.com/api/v2";
const AUTH = "Basic " + btoa(`${Deno.env.get("ROBAWS_ACCESS_KEY")}:${Deno.env.get("ROBAWS_SECRET")}`);
const PAGINA = 100;

type RobawsKlant = {
  id: string;
  name: string;
  email: string | null;
  tel: string | null;
  gsm: string | null;
  status: string | null;
  updatedAt: string | null;
  address: { addressLine1: string | null; postalCode: string | null; city: string | null; country: string | null } | null;
};

async function haalPagina(page: number): Promise<{ items: RobawsKlant[]; totalPages: number }> {
  for (let poging = 0; poging < 5; poging++) {
    const res = await fetch(`${BASIS}/clients?include=address&size=${PAGINA}&page=${page}`, {
      headers: { Authorization: AUTH, Accept: "application/json" },
    });
    if (res.status === 429) {
      // Robaws vraagt om de rate-limit te respecteren; wacht en probeer opnieuw.
      const wacht = Number(res.headers.get("retry-after") ?? 2 ** poging) * 1000;
      await new Promise((r) => setTimeout(r, wacht));
      continue;
    }
    if (!res.ok) throw new Error(`Robaws /clients pagina ${page}: HTTP ${res.status} ${await res.text()}`);
    return await res.json();
  }
  throw new Error(`Robaws /clients pagina ${page}: te veel 429-antwoorden`);
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Alleen een ingelogde technieker of de cron-job (service role) mag de sync starten.
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return new Response("Niet aangemeld", { status: 401 });
    const { data: profiel } = await supabase.from("profielen").select("actief").eq("id", data.user.id).single();
    if (!profiel?.actief) return new Response("Geen toegang", { status: 403 });
  }

  const nu = new Date().toISOString();
  let page = 0, totaal = 0, totalPages = 1;
  while (page < totalPages) {
    const r = await haalPagina(page);
    totalPages = r.totalPages;
    const rijen = r.items.map((k) => ({
      robaws_id: Number(k.id),
      naam: k.name,
      straat: k.address?.addressLine1 ?? null,
      postcode: k.address?.postalCode ?? null,
      gemeente: k.address?.city ?? null,
      land: k.address?.country ?? null,
      email: k.email,
      telefoon: k.tel,
      gsm: k.gsm,
      robaws_status: k.status,
      robaws_gewijzigd_op: k.updatedAt,
      gesynchroniseerd_op: nu,
    }));
    const { error } = await supabase.from("klanten").upsert(rijen, { onConflict: "robaws_id" });
    if (error) return new Response(`Opslaan mislukt: ${error.message}`, { status: 500 });
    totaal += rijen.length;
    page++;
  }

  return Response.json({ klanten: totaal, gesynchroniseerd_op: nu });
});
