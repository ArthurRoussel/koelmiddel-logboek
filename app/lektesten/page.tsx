"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import InstallatieItem from "@/components/InstallatieItem";
import type { Installatie } from "@/lib/supabase";
import { metCache } from "@/lib/offline";
import { laadInstallaties } from "@/lib/data";
import { lektestStatus } from "@/lib/fgas";
import { vandaag } from "@/lib/opmaak";

function Lektesten() {
  const [lijst, setLijst] = useState<Installatie[] | null>(null);
  useEffect(() => { metCache("installaties", laadInstallaties).then((r) => setLijst(r.data ?? [])); }, []);
  const gepland = (lijst ?? []).filter((i) => i.volgende_lektest).sort((a, b) => a.volgende_lektest!.localeCompare(b.volgende_lektest!));
  const telt = (n: string) => gepland.filter((i) => lektestStatus(i.volgende_lektest, vandaag())?.niveau === n).length;
  return (
    <>
      <h1>Lektesten</h1>
      <p className="sub">Volgens de F-gassenverordening (EU) 2024/573: elke 12, 6 of 3 maanden vanaf 5, 50 of 500 t CO₂-eq, het dubbele met lekdetectiesysteem.</p>
      <div className="facts" style={{ marginBottom: 16 }}>
        <div className="fact"><div className="k">Te laat</div><div className="v" style={{ color: "var(--bad)" }}>{telt("bad")}</div></div>
        <div className="fact"><div className="k">Binnen 45 dagen</div><div className="v" style={{ color: "var(--warn)" }}>{telt("warn")}</div></div>
        <div className="fact"><div className="k">Opgevolgd</div><div className="v">{gepland.length}</div></div>
      </div>
      <div className="stack">
        {gepland.map((i) => <InstallatieItem key={i.id} i={i} metPlanning />)}
        {lijst && !gepland.length && <p className="empty">Geen installaties met verplichte lektest.</p>}
      </div>
    </>
  );
}

export default function Page() { return <Shell><Lektesten /></Shell>; }
