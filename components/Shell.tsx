"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Koelmiddel, type Profiel } from "@/lib/supabase";
import { metCache, verstuurWachtrij, wachtrij } from "@/lib/offline";

type AppContext = { profiel: Profiel; koelmiddelen: Record<string, Koelmiddel>; techniekers: Record<string, Profiel> };
const Ctx = createContext<AppContext | null>(null);
export const useApp = () => useContext(Ctx)!;

const TABS = [
  { href: "/", label: "Installaties", icoon: <><rect x="3" y="6" width="18" height="10" rx="2" /><path d="M7 16v3M17 16v3M7 11h10" /></> },
  { href: "/lektesten/", label: "Lektesten", icoon: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /> },
  { href: "/flessen/", label: "Flessen", icoon: <path d="M9 3h6M10 3v3a5 5 0 0 0-3 4.6V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.4A5 5 0 0 0 14 6V3" /> },
  { href: "/jaaroverzicht/", label: "Jaaroverzicht", icoon: <path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3" /> },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pad = usePathname();
  const [sessie, setSessie] = useState<Session | null | undefined>(undefined);
  const [ctx, setCtx] = useState<AppContext | null>(null);
  const [wachtend, setWachtend] = useState(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessie(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessie(s));
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const tel = () => setWachtend(wachtrij().length);
    const online = () => { setOffline(!navigator.onLine); verstuurWachtrij().then(setWachtend); };
    tel(); online();
    window.addEventListener("wachtrij", tel);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => { data.subscription.unsubscribe(); window.removeEventListener("wachtrij", tel); window.removeEventListener("online", online); window.removeEventListener("offline", online); };
  }, []);

  useEffect(() => {
    if (sessie === null) router.replace("/login/");
    if (!sessie) return;
    (async () => {
      const r = await metCache("basis", async () => {
        const [p, k, t] = await Promise.all([
          supabase.from("profielen").select("*").eq("id", sessie.user.id).single(),
          supabase.from("koelmiddelen").select("*").order("code"),
          supabase.from("profielen").select("*"),
        ]);
        if (p.error || k.error || t.error) throw p.error ?? k.error ?? t.error;
        return {
          profiel: p.data as Profiel,
          koelmiddelen: Object.fromEntries((k.data as Koelmiddel[]).map((x) => [x.code, x])),
          techniekers: Object.fromEntries((t.data as Profiel[]).map((x) => [x.id, x])),
        };
      });
      if (r.data) setCtx(r.data);
    })();
  }, [sessie, router]);

  if (!sessie || !ctx) return <main><div className="wrap"><p className="empty">Laden…</p></div></main>;

  return (
    <Ctx.Provider value={ctx}>
      <header className="top"><div className="wrap">
        <div className="brand">Koelmiddellogboek<small>AR Airco</small></div>
        <div className="spacer" />
        <Link className="klanten" href="/klanten/">Klanten</Link>
        <div className="who">{ctx.profiel.naam}<br /><span className="mono">{ctx.profiel.certificaat_nummer ?? "certificaat ontbreekt"}</span></div>
      </div></header>
      {(offline || wachtend > 0) && (
        <div className="demo"><div className="wrap">
          <span>{offline ? "Geen netwerk. Je ziet de laatst geladen gegevens." : ""} {wachtend > 0 ? `${wachtend} interventie(s) wachten op verzending.` : ""}</span>
          {wachtend > 0 && !offline && <button type="button" onClick={() => verstuurWachtrij().then(setWachtend)}>Nu versturen</button>}
        </div></div>
      )}
      <main><div className="wrap">{children}</div></main>
      <nav className="tabs" aria-label="Hoofdmenu"><div className="wrap">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={pad === t.href || (t.href === "/" && pad.startsWith("/installatie")) ? "page" : undefined}>
            <svg viewBox="0 0 24 24">{t.icoon}</svg>{t.label}
          </Link>
        ))}
      </div></nav>
    </Ctx.Provider>
  );
}
