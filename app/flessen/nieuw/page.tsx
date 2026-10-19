"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell, { useApp } from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { vandaag } from "@/lib/opmaak";

function NieuweFles() {
  const router = useRouter();
  const { koelmiddelen } = useApp();
  const [soort, setSoort] = useState("nieuw");
  const [fout, setFout] = useState("");

  async function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("flessen").insert({
      serienummer: f.get("serie"), koelmiddel: f.get("koelmiddel"), soort, inhoud_bij_ontvangst_kg: Number(f.get("inhoud")) || 0,
      capaciteit_kg: soort === "recuperatie" ? Number(f.get("capaciteit")) || null : null,
      leverancier: f.get("leverancier") || null, factuurnummer: f.get("factuur") || null, ontvangen_op: f.get("ontvangen"),
    });
    if (error) return setFout(error.code === "23505" ? "Er bestaat al een fles met dit serienummer." : error.message);
    router.replace("/flessen/");
  }

  return (
    <>
      <Link className="btn link" href="/flessen/">← Flessen</Link>
      <h1>Fles toevoegen</h1>
      <form className="stack" onSubmit={opslaan}>
        <div className="grid2">
          <label>Serienummer<input id="serie" name="serie" required /></label>
          <label>Koelmiddel<select id="koelmiddel" name="koelmiddel">{Object.keys(koelmiddelen).map((k) => <option key={k}>{k}</option>)}</select></label>
          <label>Soort<select id="soort" value={soort} onChange={(e) => setSoort(e.target.value)}>
            <option value="nieuw">Nieuw koelmiddel</option><option value="recuperatie">Recuperatiefles</option></select></label>
          <label>Inhoud bij ontvangst (kg)<input id="inhoud" name="inhoud" type="number" step="0.001" min="0" inputMode="decimal" defaultValue="0" /></label>
          {soort === "recuperatie" && <label>Capaciteit (kg)<input id="capaciteit" name="capaciteit" type="number" step="0.1" min="0" inputMode="decimal" defaultValue="12" /></label>}
          <label>Ontvangen op<input id="ontvangen" name="ontvangen" type="date" defaultValue={vandaag()} /></label>
          <label>Leverancier<input id="leverancier" name="leverancier" /></label>
          <label>Aankoopfactuur<input id="factuur" name="factuur" /></label>
        </div>
        {fout && <div className="foutmelding">{fout}</div>}
        <button className="btn primary block" type="submit">Fles opslaan</button>
      </form>
    </>
  );
}

export default function Page() { return <Shell><NieuweFles /></Shell>; }
