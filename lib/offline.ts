// Werken zonder bereik: laatst geladen gegevens bewaren, en interventies in een wachtrij zetten tot er weer netwerk is.
import { supabase } from "./supabase";

const CACHE = "logboek-cache:";
const WACHTRIJ = "logboek-wachtrij";

function lees<T>(sleutel: string): T | null {
  try { const r = localStorage.getItem(sleutel); return r ? (JSON.parse(r) as T) : null; } catch { return null; }
}
function schrijf(sleutel: string, waarde: unknown) {
  try { localStorage.setItem(sleutel, JSON.stringify(waarde)); } catch { /* opslag vol of geblokkeerd */ }
}

// Probeert online te laden; lukt dat niet, dan de laatst bewaarde versie.
export async function metCache<T>(sleutel: string, laad: () => Promise<T>): Promise<{ data: T | null; offline: boolean }> {
  try {
    const data = await laad();
    schrijf(CACHE + sleutel, data);
    return { data, offline: false };
  } catch {
    return { data: lees<T>(CACHE + sleutel), offline: true };
  }
}

export type NieuweInterventie = Record<string, unknown> & { toestel_id: string; installatie_id: string };

export const wachtrij = () => lees<NieuweInterventie[]>(WACHTRIJ) ?? [];

// Bewaart een interventie. Zonder netwerk gaat ze in de wachtrij; toestel_id voorkomt dubbele opslag bij een nieuwe poging.
const netwerkfout = (m: string) => !navigator.onLine || /fetch|network|load failed/i.test(m);

export async function bewaarInterventie(v: NieuweInterventie): Promise<"opgeslagen" | "in wachtrij"> {
  try {
    const { error } = await supabase.from("interventies").insert(v);
    if (!error || error.code === "23505") return "opgeslagen";
    throw new Error(error.message);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (!netwerkfout(m)) throw new Error(m);
  }
  schrijf(WACHTRIJ, [...wachtrij(), v]);
  window.dispatchEvent(new Event("wachtrij"));
  return "in wachtrij";
}

export async function verstuurWachtrij(): Promise<number> {
  const rij = wachtrij();
  if (!rij.length || !navigator.onLine) return rij.length;
  const over: NieuweInterventie[] = [];
  for (const v of rij) {
    const { error } = await supabase.from("interventies").insert(v);
    if (error && error.code !== "23505") over.push(v);
  }
  schrijf(WACHTRIJ, over);
  window.dispatchEvent(new Event("wachtrij"));
  return over.length;
}
