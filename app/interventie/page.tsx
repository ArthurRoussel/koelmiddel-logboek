"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Handtekening from "@/components/Handtekening";
import { supabase, INTERVENTIE_TYPES, type Fles, type Installatie } from "@/lib/supabase";
import { bewaarInterventie, metCache } from "@/lib/offline";
import { lekverliesPct } from "@/lib/fgas";
import { kg, vandaag } from "@/lib/opmaak";

function Formulier() {
  const id = useSearchParams().get("installatie") ?? "";
  const router = useRouter();
  const [i, setI] = useState<Installatie | null>(null);
  const [flessen, setFlessen] = useState<Fles[]>([]);
  const [type, setType] = useState("onderhoud");
  const [lektest, setLektest] = useState("");
  const [toegevoegd, setToegevoegd] = useState("0");
  const [recup, setRecup] = useState("0");
  const [fles, setFles] = useState("");
  const [recupfles, setRecupfles] = useState("");
  const [png, setPng] = useState<string | null>(null);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const onHandtekening = useCallback((p: string | null) => setPng(p), []);

  useEffect(() => {
    metCache(`interventie:${id}`, async () => {
      const [a, b] = await Promise.all([
        supabase.from("installatie_overzicht").select("*").eq("id", id).single(),
        supabase.from("fles_saldo").select("*").neq("status", "retour").order("serienummer"),
      ]);
      if (a.error || b.error) throw a.error ?? b.error;
      return { i: a.data as Installatie, flessen: b.data as Fles[] };
    }).then((r) => { if (r.data) { setI(r.data.i); setFlessen(r.data.flessen); } });
  }, [id]);

  if (!i) return <p className="empty">Laden…</p>;
  const add = Number(toegevoegd) || 0, rec = Number(recup) || 0;
  const naBijvulling = lekverliesPct(Number(i.kg_bijgevuld_dit_jaar) + add, i.nominale_inhoud_kg);

  async function opslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (add > 0 && !fles) return setFout("Kies uit welke fles je bijvult, zodat de voorraad klopt.");
    if (rec > 0 && !recupfles) return setFout("Kies de recuperatiefles waarin het koelmiddel zit.");
    const f = new FormData(e.currentTarget);
    setBezig(true); setFout("");
    try {
      const r = await bewaarInterventie({
        toestel_id: crypto.randomUUID(), installatie_id: id, datum: String(f.get("datum")), type,
        kg_toegevoegd: add, fles_toegevoegd_id: fles || null, gerecycleerd: f.get("gerecycleerd") === "on",
        kg_teruggewonnen: rec, fles_recuperatie_id: recupfles || null, lektest: lektest || null,
        lekplaats: lektest === "lek" ? String(f.get("lekplaats") || "") : null, werkzaamheden: String(f.get("opm") || "") || null, handtekening_png: png,
      });
      router.replace(r === "opgeslagen" ? `/installatie/?id=${id}` : `/installatie/?id=${id}&wachtrij=1`);
    } catch (err) {
      setBezig(false); setFout(err instanceof Error ? err.message : String(err));
    }
  }

  const nieuw = flessen.filter((f) => f.soort === "nieuw" && f.koelmiddel === i.koelmiddel);
  const recFl = flessen.filter((f) => f.soort === "recuperatie" && f.koelmiddel === i.koelmiddel);

  return (
    <>
      <Link className="btn link" href={`/installatie/?id=${id}`}>← {i.klant_naam}</Link>
      <h1>Interventie registreren</h1>
      <p className="sub">{i.type} {i.merk} {i.model} · <span className="tag">{i.koelmiddel}</span> {kg(i.nominale_inhoud_kg)} kg</p>
      <form className="stack" onSubmit={opslaan}>
        <div className="grid2">
          <label>Soort interventie<select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(INTERVENTIE_TYPES).filter(([k]) => k !== "ingebruikname").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Datum<input id="datum" name="datum" type="date" defaultValue={vandaag()} required /></label>
          <label>Lektest uitgevoerd<select id="lektest" value={lektest} onChange={(e) => setLektest(e.target.value)}>
            <option value="">Nee</option><option value="dicht">Ja, geen lek</option><option value="lek">Ja, lek gevonden</option></select></label>
        </div>
        {lektest === "lek" && <label>Plaats van het lek<input id="lekplaats" name="lekplaats" placeholder="bv. flare-verbinding binnenunit" /></label>}
        <div className="grid2">
          <label>Bijgevuld (kg)<input id="toegevoegd" type="number" step="0.001" min="0" inputMode="decimal" value={toegevoegd} onChange={(e) => setToegevoegd(e.target.value)} /></label>
          <label>Uit fles<select id="fles" value={fles} onChange={(e) => setFles(e.target.value)}><option value="">–</option>
            {nieuw.map((f) => <option key={f.id} value={f.id}>{f.serienummer} ({kg(f.saldo_kg)} kg)</option>)}</select></label>
          <label>Teruggewonnen (kg)<input id="recup" type="number" step="0.001" min="0" inputMode="decimal" value={recup} onChange={(e) => setRecup(e.target.value)} /></label>
          <label>In recuperatiefles<select id="recupfles" value={recupfles} onChange={(e) => setRecupfles(e.target.value)}><option value="">–</option>
            {recFl.map((f) => <option key={f.id} value={f.id}>{f.serienummer} ({kg(f.saldo_kg)} kg)</option>)}</select></label>
        </div>
        <label className="check"><input type="checkbox" id="gerecycleerd" name="gerecycleerd" /> Bijgevuld met gerecycleerd of geregenereerd koelmiddel</label>
        {add > 0 && lektest === "lek" && <div className="alert bad">Eerst herstellen en opnieuw testen. Bijvullen mag pas na herstel en een lektest door een bevoegde koeltechnicus.</div>}
        {add > 0 && <div className={`alert ${naBijvulling > 10 ? "bad" : naBijvulling > 5 ? "warn" : "ok"}`}>Lekverlies dit jaar na deze bijvulling: {kg(naBijvulling, 1)}%</div>}
        {type === "buitendienst" && <div className="alert warn">De installatie komt op buiten dienst. Het koelmiddel moet binnen de maand verwijderd worden.</div>}
        <label>Uitgevoerde werken en opmerkingen<textarea id="opm" name="opm" rows={3} /></label>
        <Handtekening onWijzig={onHandtekening} />
        {fout && <div className="foutmelding">{fout}</div>}
        <button className="btn primary block" type="submit" disabled={bezig}>{bezig ? "Bezig…" : "Opslaan in logboek"}</button>
      </form>
    </>
  );
}

export default function Page() { return <Shell><Suspense><Formulier /></Suspense></Shell>; }
