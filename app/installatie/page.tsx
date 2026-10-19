"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Shell, { useApp } from "@/components/Shell";
import { supabase, INTERVENTIE_TYPES, type Fles, type Installatie, type Interventie } from "@/lib/supabase";
import { metCache, wachtrij } from "@/lib/offline";
import { beoordeelLekverlies, lektestStatus, lekverliesPct } from "@/lib/fgas";
import { kg, datum, vandaag } from "@/lib/opmaak";

type Gegevens = { i: Installatie; log: Interventie[]; flessen: Record<string, string> };

function Detail() {
  const id = useSearchParams().get("id") ?? "";
  const { koelmiddelen, techniekers } = useApp();
  const [g, setG] = useState<Gegevens | null>(null);
  const [nietGevonden, setNietGevonden] = useState(false);

  useEffect(() => {
    metCache(`installatie:${id}`, async () => {
      const [i, log, fl] = await Promise.all([
        supabase.from("installatie_overzicht").select("*").eq("id", id).single(),
        supabase.from("interventies").select("*").eq("installatie_id", id).order("datum", { ascending: false }).order("aangemaakt_op", { ascending: false }),
        supabase.from("flessen").select("id,serienummer"),
      ]);
      if (i.error || log.error || fl.error) throw i.error ?? log.error ?? fl.error;
      return { i: i.data as Installatie, log: log.data as Interventie[], flessen: Object.fromEntries((fl.data as Fles[]).map((f) => [f.id, f.serienummer])) };
    }).then((r) => (r.data ? setG(r.data) : setNietGevonden(true)));
  }, [id]);

  if (nietGevonden) return <p className="empty">Installatie niet gevonden.</p>;
  if (!g) return <p className="empty">Laden…</p>;
  const { i, log, flessen } = g;
  const jaar = new Date().getFullYear();
  const vorigJaarKg = log.filter((v) => v.type !== "ingebruikname" && v.datum.startsWith(String(jaar - 1))).reduce((s, v) => s + Number(v.kg_toegevoegd), 0);
  const oordeel = beoordeelLekverlies(i.lekverlies_pct_dit_jaar, lekverliesPct(vorigJaarKg, i.nominale_inhoud_kg), i.nominale_inhoud_kg);
  const st = lektestStatus(i.volgende_lektest, vandaag());
  const km = koelmiddelen[i.koelmiddel];
  const drempel = i.hermetisch ? 10 : 5;
  const wachtend = wachtrij().filter((v) => v.installatie_id === i.id);

  return (
    <>
      <Link className="btn link" href="/">← Installaties</Link>
      <h1>{i.klant_naam}</h1>
      <p className="sub">{i.klant_straat}, {i.klant_postcode} {i.klant_gemeente} · Robaws klant {i.klant_id}</p>
      <div className="stack">
        {oordeel && <div className={`alert ${oordeel.niveau}`}>{oordeel.tekst}</div>}
        {st?.niveau === "bad" && <div className="alert bad">Lekdichtheidscontrole is {-st.dagen} dagen te laat.</div>}
        <div className="card">
          <div style={{ fontWeight: 600 }}>{i.type} · {i.merk} {i.model}</div>
          <div className="sub" style={{ margin: "2px 0 0" }}>Serienummer <span className="mono">{i.serienummer || "–"}</span> · {i.locatie || "geen locatie"} · in gebruik sinds {datum(i.ingebruikname)}</div>
        </div>
        <div className="facts">
          <div className="fact"><div className="k">Koelmiddel</div><div className="v">{i.koelmiddel}</div><div className="n">GWP {km?.gwp.toLocaleString("nl-BE")} · {km?.veiligheidsklasse}</div></div>
          <div className="fact"><div className="k">Nominale inhoud</div><div className="v">{kg(i.nominale_inhoud_kg)} kg</div><div className="n">{kg(i.ton_co2_eq)} t CO₂-eq</div></div>
          <div className="fact"><div className="k">Lekverlies {jaar}</div><div className="v">{kg(i.lekverlies_pct_dit_jaar, 1)}%</div><div className="n">{kg(i.kg_bijgevuld_dit_jaar)} kg bijgevuld</div></div>
          <div className="fact"><div className="k">Volgende lektest</div><div className="v">{i.lektest_interval_maanden ? datum(i.volgende_lektest) : "–"}</div>
            <div className="n">{i.lektest_interval_maanden ? `elke ${i.lektest_interval_maanden} maanden` : `onder ${drempel} t CO₂-eq`}</div></div>
        </div>
        <p className="sub" style={{ margin: 0 }}>
          {i.logboekplichtig ? "Logboekplichtig" : `Onder de drempel van ${drempel} t CO₂-eq: logboek niet verplicht, wel aanbevolen`}
          {i.hermetisch ? " · hermetisch gesloten" : ""}{i.lekdetectiesysteem ? " · met lekdetectiesysteem" : ""}.
        </p>
        {i.status === "actief" && <Link className="btn primary block" href={`/interventie/?installatie=${i.id}`}>Interventie registreren</Link>}
      </div>
      <h2>Logboek</h2>
      {wachtend.length > 0 && <div className="alert warn" style={{ marginBottom: 8 }}>{wachtend.length} interventie(s) staan op dit toestel en worden verstuurd zodra er netwerk is.</div>}
      <ul className="log">
        {log.map((v) => {
          const cls = v.lektest === "lek" ? "leak" : v.kg_teruggewonnen > 0 ? "rec" : v.kg_toegevoegd > 0 ? "add" : v.type === "lektest" ? "test" : "";
          const t = techniekers[v.technieker_id];
          return (
            <li key={v.id} className={cls}>
              <div className="head"><span>{INTERVENTIE_TYPES[v.type]}{v.corrigeert_id ? " (correctie)" : ""}</span><span className="mono" style={{ fontWeight: 400 }}>{datum(v.datum)}</span></div>
              {v.kg_toegevoegd > 0 && <div className="q">+{kg(v.kg_toegevoegd)} kg bijgevuld uit {flessen[v.fles_toegevoegd_id!] ?? "?"}{v.gerecycleerd ? " (gerecycleerd)" : ""}</div>}
              {v.kg_teruggewonnen > 0 && <div className="q">−{kg(v.kg_teruggewonnen)} kg teruggewonnen in {flessen[v.fles_recuperatie_id!] ?? "?"}</div>}
              {v.lektest && <div>Lektest: {v.lektest === "dicht" ? "geen lek gevonden" : `lek gevonden${v.lekplaats ? ", " + v.lekplaats : ""}`}</div>}
              {v.werkzaamheden && <div>{v.werkzaamheden}</div>}
              <div className="meta">{t?.naam ?? "?"} · {t?.certificaat_nummer ?? "certificaat ontbreekt"}{v.handtekening_png ? " · afgetekend door klant" : ""}</div>
            </li>
          );
        })}
        {!log.length && <li>Nog geen interventies.</li>}
      </ul>
    </>
  );
}

export default function Page() { return <Shell><Suspense><Detail /></Suspense></Shell>; }
