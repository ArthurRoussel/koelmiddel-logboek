"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useKlanten, zoek } from "@/components/KlantZoeker";
import { supabase } from "@/lib/supabase";
import { datum } from "@/lib/opmaak";

function Klanten() {
  const klanten = useKlanten();
  const [q, setQ] = useState("");
  const [melding, setMelding] = useState("");
  const [bezig, setBezig] = useState(false);
  const res = useMemo(() => (q ? zoek(klanten, q) : klanten).slice(0, 50), [klanten, q]);
  const laatste = klanten.reduce((m, k) => (k.gesynchroniseerd_op && k.gesynchroniseerd_op > m ? k.gesynchroniseerd_op : m), "");

  async function verversen() {
    setBezig(true); setMelding("");
    const { data, error } = await supabase.functions.invoke("robaws-sync");
    setBezig(false);
    setMelding(error ? `Verversen mislukt: ${error.message}` : `${data.klanten} klanten opgehaald uit Robaws. Herlaad de pagina om ze te zien.`);
  }

  return (
    <>
      <h1>Klanten</h1>
      <p className="sub">{klanten.length.toLocaleString("nl-BE")} klanten uit Robaws{laatste ? `, laatst opgehaald ${datum(laatste)}` : ""}. Klanten aanpassen doe je in Robaws.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <input id="zoek" type="search" placeholder="Zoek op naam, straat of gemeente" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
        <button className="btn" type="button" onClick={verversen} disabled={bezig}>{bezig ? "Bezig…" : "Klanten verversen"}</button>
      </div>
      {melding && <div className="alert ok" style={{ marginBottom: 12 }}>{melding}</div>}
      <div className="stack">
        {res.map((k) => (
          <div className="card" key={k.robaws_id}><strong>{k.naam}</strong><div className="sub" style={{ margin: 0 }}>{k.straat}, {k.postcode} {k.gemeente} · Robaws {k.robaws_id}</div></div>
        ))}
      </div>
    </>
  );
}

export default function Page() { return <Shell><Klanten /></Shell>; }
