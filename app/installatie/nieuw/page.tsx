"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Shell, { useApp } from "@/components/Shell";
import KlantZoeker from "@/components/KlantZoeker";
import { supabase, INSTALLATIE_TYPES, type Fles, type Klant } from "@/lib/supabase";
import { lektestIntervalMaanden, tonCo2Eq } from "@/lib/fgas";
import { kg, vandaag } from "@/lib/opmaak";

function Nieuw() {
  const router = useRouter();
  const { koelmiddelen } = useApp();
  const [klant, setKlant] = useState<Klant | null>(null);
  const [koelmiddel, setKoelmiddel] = useState("R32");
  const [inhoud, setInhoud] = useState("");
  const [hermetisch, setHermetisch] = useState(false);
  const [lds, setLds] = useState(false);
  const [extra, setExtra] = useState("0");
  const [flessen, setFlessen] = useState<Fles[]>([]);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    supabase.from("fles_saldo").select("*").eq("soort", "nieuw").neq("status", "retour").then(({ data }) => setFlessen((data as Fles[]) ?? []));
  }, []);

  const basis = { nominale_inhoud_kg: Number(inhoud) || 0, gwp: koelmiddelen[koelmiddel]?.gwp ?? 0, hermetisch, lekdetectiesysteem: lds };
  const m = lektestIntervalMaanden(basis);

  async function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!klant) return setFout("Kies eerst een klant.");
    const f = new FormData(e.currentTarget);
    const extraKg = Number(extra) || 0;
    if (extraKg > 0 && !f.get("fles")) return setFout("Kies uit welke fles je bijvult.");
    setBezig(true); setFout("");
    const { data, error } = await supabase.from("installaties").insert({
      klant_id: klant.robaws_id, type: f.get("type"), merk: f.get("merk"), model: f.get("model"), serienummer: f.get("serie") || null,
      locatie: f.get("locatie") || null, ingebruikname: f.get("start"), koelmiddel, nominale_inhoud_kg: basis.nominale_inhoud_kg,
      hermetisch, lekdetectiesysteem: lds,
    }).select("id").single();
    if (error) { setBezig(false); return setFout(error.message); }
    // De ingebruikname is de eerste regel van het logboek, met de lektest bij oplevering.
    const r = await supabase.from("interventies").insert({
      installatie_id: data.id, datum: f.get("start"), type: "ingebruikname", kg_toegevoegd: extraKg, fles_toegevoegd_id: f.get("fles") || null,
      lektest: "dicht", werkzaamheden: f.get("opm") || null, toestel_id: crypto.randomUUID(),
    });
    if (r.error) { setBezig(false); return setFout(`Installatie opgeslagen, maar de ingebruikname niet: ${r.error.message}`); }
    router.replace(`/installatie/?id=${data.id}`);
  }

  return (
    <>
      <Link className="btn link" href="/">← Installaties</Link>
      <h1>Nieuwe installatie</h1>
      <form className="stack" onSubmit={opslaan}>
        <KlantZoeker waarde={klant} onKies={setKlant} />
        <div className="grid2">
          <label>Type<select id="type" name="type">{INSTALLATIE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Locatie<input id="locatie" name="locatie" placeholder="bv. buitenunit achtergevel" /></label>
          <label>Merk<input id="merk" name="merk" required /></label>
          <label>Model<input id="model" name="model" required /></label>
          <label>Serienummer<input id="serie" name="serie" /></label>
          <label>In gebruik sinds<input id="start" name="start" type="date" defaultValue={vandaag()} required /></label>
          <label>Koelmiddel<select id="koelmiddel" value={koelmiddel} onChange={(e) => setKoelmiddel(e.target.value)}>
            {Object.keys(koelmiddelen).map((k) => <option key={k}>{k}</option>)}</select></label>
          <label>Nominale inhoud (kg) <span className="h">fabrieksvulling plus bijvulling</span>
            <input id="inhoud" type="number" step="0.001" min="0" inputMode="decimal" required value={inhoud} onChange={(e) => setInhoud(e.target.value)} /></label>
        </div>
        <label className="check"><input type="checkbox" id="hermetisch" checked={hermetisch} onChange={(e) => setHermetisch(e.target.checked)} /> Hermetisch gesloten</label>
        <label className="check"><input type="checkbox" id="lds" checked={lds} onChange={(e) => setLds(e.target.checked)} /> Lekdetectiesysteem aanwezig</label>
        <div className="alert ok">{kg(tonCo2Eq(basis))} t CO₂-eq · {m ? `lekdichtheidscontrole elke ${m} maanden` : "geen periodieke lektest verplicht"}</div>
        <h2 style={{ margin: "8px 0 0" }}>Ingebruikname</h2>
        <div className="grid2">
          <label>Bijgevuld bij plaatsing (kg)<input id="extra" type="number" step="0.001" min="0" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} /></label>
          <label>Uit fles<select id="fles" name="fles"><option value="">–</option>
            {flessen.filter((f) => f.koelmiddel === koelmiddel).map((f) => <option key={f.id} value={f.id}>{f.serienummer} ({kg(f.saldo_kg)} kg)</option>)}</select></label>
        </div>
        <label>Opmerkingen<textarea id="opm" name="opm" rows={2} placeholder="bv. leidinglengte 25 m, druktest stikstof 40 bar OK" /></label>
        {fout && <div className="foutmelding">{fout}</div>}
        <button className="btn primary block" type="submit" disabled={bezig}>{bezig ? "Bezig…" : "Installatie opslaan"}</button>
      </form>
    </>
  );
}

export default function Page() { return <Shell><Nieuw /></Shell>; }
