"use client";

import { useEffect, useState } from "react";
import Shell, { useApp } from "@/components/Shell";
import { supabase, INTERVENTIE_TYPES, type Fles } from "@/lib/supabase";
import { kg } from "@/lib/opmaak";

type Rij = {
  datum: string; type: string; kg_toegevoegd: number; kg_teruggewonnen: number; gerecycleerd: boolean; lektest: string | null; technieker_id: string;
  werkzaamheden: string | null;
  installaties: { koelmiddel: string; merk: string; model: string; serienummer: string | null; klanten: { naam: string; gemeente: string | null } };
};

function csvVeld(v: unknown) { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function Jaaroverzicht() {
  const { koelmiddelen, techniekers } = useApp();
  const [jaar, setJaar] = useState(new Date().getFullYear());
  const [rijen, setRijen] = useState<Rij[] | null>(null);
  const [voorraad, setVoorraad] = useState<Record<string, number>>({});
  const [fout, setFout] = useState("");

  useEffect(() => {
    setRijen(null);
    supabase.from("interventies")
      .select("datum,type,kg_toegevoegd,kg_teruggewonnen,gerecycleerd,lektest,technieker_id,werkzaamheden,installaties(koelmiddel,merk,model,serienummer,klanten(naam,gemeente))")
      .gte("datum", `${jaar}-01-01`).lte("datum", `${jaar}-12-31`).order("datum")
      .then(({ data, error }) => (error ? setFout(error.message) : setRijen(data as unknown as Rij[])));
    supabase.from("fles_saldo").select("koelmiddel,saldo_kg,soort,status").eq("soort", "nieuw").neq("status", "retour")
      .then(({ data }) => {
        const v: Record<string, number> = {};
        ((data ?? []) as Fles[]).forEach((f) => (v[f.koelmiddel] = (v[f.koelmiddel] ?? 0) + Number(f.saldo_kg)));
        setVoorraad(v);
      });
  }, [jaar]);

  const per: Record<string, { n: number; bij: number; terug: number }> = {};
  (rijen ?? []).forEach((r) => {
    const p = (per[r.installaties.koelmiddel] ??= { n: 0, bij: 0, terug: 0 });
    p.n++; p.bij += Number(r.kg_toegevoegd); p.terug += Number(r.kg_teruggewonnen);
  });
  const codes = [...new Set([...Object.keys(per), ...Object.keys(voorraad)])].sort();
  const tco2 = (c: string) => ((per[c]?.bij ?? 0) * (koelmiddelen[c]?.gwp ?? 0)) / 1000;

  function exporteer() {
    const kop = ["Datum", "Klant", "Gemeente", "Installatie", "Serienummer", "Koelmiddel", "Interventie", "Bijgevuld kg", "Teruggewonnen kg", "Gerecycleerd", "Lektest", "Technieker", "Certificaat", "Werkzaamheden"];
    const lijnen = (rijen ?? []).map((r) => {
      const t = techniekers[r.technieker_id];
      return [r.datum, r.installaties.klanten.naam, r.installaties.klanten.gemeente, `${r.installaties.merk} ${r.installaties.model}`, r.installaties.serienummer,
        r.installaties.koelmiddel, INTERVENTIE_TYPES[r.type], kg(r.kg_toegevoegd, 3), kg(r.kg_teruggewonnen, 3), r.gerecycleerd ? "ja" : "nee",
        r.lektest ?? "", t?.naam, t?.certificaat_nummer, r.werkzaamheden].map(csvVeld).join(";");
    });
    const blob = new Blob(["﻿" + [kop.join(";"), ...lijnen].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `koelmiddelboekhouding-${jaar}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <h1>Jaaroverzicht {jaar}</h1>
      <p className="sub">Koelmiddelenboekhouding van het bedrijf, opgebouwd uit alle interventies en flessen.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {[jaar - 1, jaar, jaar + 1].filter((j) => j <= new Date().getFullYear()).map((j) => (
          <button key={j} className={`btn ${j === jaar ? "primary" : ""}`} type="button" onClick={() => setJaar(j)}>{j}</button>
        ))}
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn" type="button" onClick={exporteer} disabled={!rijen?.length}>Exporteer naar Excel (CSV)</button>
      </div>
      {fout && <div className="foutmelding">{fout}</div>}
      <div className="card table-wrap"><table>
        <thead><tr><th>Koelmiddel</th><th className="num">Interventies</th><th className="num">Bijgevuld kg</th><th className="num">Teruggewonnen kg</th><th className="num">Voorraad kg</th><th className="num">Bijgevuld t CO₂-eq</th></tr></thead>
        <tbody>{codes.map((c) => (
          <tr key={c}><td><span className="tag">{c}</span></td><td className="num">{per[c]?.n ?? 0}</td><td className="num">{kg(per[c]?.bij)}</td>
            <td className="num">{kg(per[c]?.terug)}</td><td className="num">{kg(voorraad[c])}</td><td className="num">{kg(tco2(c))}</td></tr>
        ))}</tbody>
        <tfoot><tr><th colSpan={5}>Totaal bijgevuld</th><th className="num">{kg(codes.reduce((s, c) => s + tco2(c), 0))}</th></tr></tfoot>
      </table></div>
      {rijen && !codes.length && <p className="empty">Nog geen interventies in {jaar}.</p>}
    </>
  );
}

export default function Page() { return <Shell><Jaaroverzicht /></Shell>; }
