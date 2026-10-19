"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import InstallatieItem from "@/components/InstallatieItem";
import type { Installatie } from "@/lib/supabase";
import { metCache } from "@/lib/offline";
import { laadInstallaties } from "@/lib/data";

function Installaties() {
  const [lijst, setLijst] = useState<Installatie[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { metCache("installaties", laadInstallaties).then((r) => setLijst(r.data ?? [])); }, []);
  const s = q.toLowerCase();
  const zichtbaar = (lijst ?? []).filter((i) =>
    !s || `${i.klant_naam} ${i.klant_gemeente} ${i.merk} ${i.model} ${i.serienummer} ${i.koelmiddel}`.toLowerCase().includes(s));
  return (
    <>
      <h1>Installaties</h1>
      <p className="sub">{lijst ? `${lijst.length} installaties bij ${new Set(lijst.map((i) => i.klant_id)).size} klanten` : "Laden…"}</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <input id="zoek" type="search" placeholder="Zoek op klant, gemeente, merk of serienummer" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
        <Link className="btn primary" href="/installatie/nieuw/">Nieuwe installatie</Link>
      </div>
      <div className="stack">
        {zichtbaar.map((i) => <InstallatieItem key={i.id} i={i} />)}
        {lijst && !zichtbaar.length && <p className="empty">{lijst.length ? "Geen installatie gevonden." : "Nog geen installaties. Voeg de eerste toe met Nieuwe installatie."}</p>}
      </div>
    </>
  );
}

export default function Page() { return <Shell><Installaties /></Shell>; }
