"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, type Fles } from "@/lib/supabase";
import { metCache } from "@/lib/offline";
import { kg } from "@/lib/opmaak";

const STATUSSEN = ["in voorraad", "bij technieker", "retour"];

function Flessen() {
  const [lijst, setLijst] = useState<Fles[] | null>(null);
  const laad = () => metCache("flessen", async () => {
    const { data, error } = await supabase.from("fles_saldo").select("*").order("status").order("serienummer");
    if (error) throw error;
    return data as Fles[];
  }).then((r) => setLijst(r.data ?? []));
  useEffect(() => { laad(); }, []);

  async function zetStatus(id: string, status: string) {
    await supabase.from("flessen").update({ status }).eq("id", id);
    laad();
  }

  return (
    <>
      <h1>Flessen</h1>
      <p className="sub">Saldo = inhoud bij ontvangst min bijvullingen plus teruggewonnen koelmiddel, berekend uit het logboek.</p>
      <div className="row" style={{ marginBottom: 12 }}><Link className="btn primary" href="/flessen/nieuw/">Fles toevoegen</Link></div>
      <div className="stack">
        {(lijst ?? []).map((f) => {
          const cap = f.soort === "recuperatie" ? Number(f.capaciteit_kg) || 12 : Number(f.inhoud_bij_ontvangst_kg) || 1;
          return (
            <div className="card" key={f.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div><strong className="mono">{f.serienummer}</strong> <span className="tag">{f.koelmiddel}</span></div>
                <span className={`pill ${f.soort === "recuperatie" ? "neutral" : "ok"}`}>{f.soort}</span>
              </div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                <span className="sub" style={{ margin: 0 }}>{f.leverancier}{f.factuurnummer ? ` · factuur ${f.factuurnummer}` : ""}</span>
                <span className="mono">{kg(f.saldo_kg)} / {kg(cap)} kg</span>
              </div>
              <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, (f.saldo_kg / cap) * 100))}%` }} /></div>
              <label style={{ marginTop: 8 }}>Status
                <select id={`status-${f.id}`} value={f.status} onChange={(e) => zetStatus(f.id, e.target.value)}>
                  {STATUSSEN.map((s) => <option key={s}>{s}</option>)}</select></label>
            </div>
          );
        })}
        {lijst && !lijst.length && <p className="empty">Nog geen flessen. Voeg een fles toe bij ontvangst van de leverancier.</p>}
      </div>
    </>
  );
}

export default function Page() { return <Shell><Flessen /></Shell>; }
