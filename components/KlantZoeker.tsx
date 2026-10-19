"use client";

import { useEffect, useMemo, useState } from "react";
import { alleRijen, type Klant } from "@/lib/supabase";
import { metCache } from "@/lib/offline";

export function useKlanten() {
  const [klanten, setKlanten] = useState<Klant[]>([]);
  useEffect(() => {
    metCache("klanten", () => alleRijen<Klant>("klanten", "robaws_id,naam,straat,postcode,gemeente,gesynchroniseerd_op", "naam"))
      .then((r) => setKlanten(r.data ?? []));
  }, []);
  return klanten;
}

// Zoekt lokaal in de klantenlijst uit Robaws (de Robaws-API zelf kan niet zoeken).
export function zoek(klanten: Klant[], q: string) {
  const s = q.toLowerCase().trim();
  if (!s) return [];
  const delen = s.split(/\s+/);
  return klanten.filter((k) => { const t = `${k.naam} ${k.gemeente ?? ""} ${k.straat ?? ""}`.toLowerCase(); return delen.every((d) => t.includes(d)); });
}

export default function KlantZoeker({ waarde, onKies }: { waarde: Klant | null; onKies: (k: Klant) => void }) {
  const klanten = useKlanten();
  const [q, setQ] = useState("");
  const res = useMemo(() => zoek(klanten, q).slice(0, 8), [klanten, q]);
  return (
    <div>
      <label>Klant <span className="h">uit Robaws ({klanten.length.toLocaleString("nl-BE")} klanten)</span>
        <input id="klant-zoek" type="search" placeholder="Typ een naam, straat of gemeente" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {waarde && <div className="alert ok" style={{ marginTop: 6 }}>Gekozen: {waarde.naam}, {waarde.straat}, {waarde.gemeente}</div>}
      <div className="results">
        {res.map((k) => (
          <button key={k.robaws_id} className="item" type="button" onClick={() => { onKies(k); setQ(""); }}>
            <span className="t">{k.naam}</span><span className="m">{k.straat}, {k.postcode} {k.gemeente}</span>
          </button>
        ))}
        {q && !res.length && <p className="sub">Niet gevonden. Maak de klant aan in Robaws en ververs daarna de klantenlijst.</p>}
      </div>
    </div>
  );
}
