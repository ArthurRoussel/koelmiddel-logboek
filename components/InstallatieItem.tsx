import Link from "next/link";
import type { Installatie } from "@/lib/supabase";
import { lektestStatus } from "@/lib/fgas";
import { kg, datum, vandaag } from "@/lib/opmaak";

export function TestPill({ i }: { i: Installatie }) {
  if (i.status !== "actief") return <span className="pill neutral">buiten dienst</span>;
  const st = lektestStatus(i.volgende_lektest, vandaag());
  return st ? <span className={`pill ${st.niveau}`}>{st.tekst}</span> : <span className="pill neutral">geen lektest nodig</span>;
}

export default function InstallatieItem({ i, metPlanning = false }: { i: Installatie; metPlanning?: boolean }) {
  return (
    <Link className="item" href={`/installatie/?id=${i.id}`}>
      <span className="t">{i.klant_naam} · {i.type}</span>
      <span className="m">
        {i.klant_gemeente} · {metPlanning
          ? <>{kg(i.ton_co2_eq)} t CO₂-eq · elke {i.lektest_interval_maanden} mnd · gepland {datum(i.volgende_lektest)}</>
          : <>{i.merk} {i.model} · <span className="tag">{i.koelmiddel}</span> <span className="mono">{kg(i.nominale_inhoud_kg)} kg</span></>}
      </span>
      <span className="r"><TestPill i={i} /></span>
    </Link>
  );
}
