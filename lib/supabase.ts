import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "ontbreekt",
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export type Klant = { robaws_id: number; naam: string; straat: string | null; postcode: string | null; gemeente: string | null; gesynchroniseerd_op?: string };
export type Koelmiddel = { code: string; gwp: number; veiligheidsklasse: string };
export type Profiel = { id: string; naam: string; certificaat_nummer: string | null; certificaat_categorie: string | null };

export type Installatie = {
  id: string; klant_id: number; type: string; merk: string; model: string; serienummer: string | null; locatie: string | null;
  koelmiddel: string; nominale_inhoud_kg: number; hermetisch: boolean; lekdetectiesysteem: boolean; ingebruikname: string; status: string;
  klant_naam: string; klant_straat: string | null; klant_postcode: string | null; klant_gemeente: string | null;
  gwp: number; ton_co2_eq: number; lektest_interval_maanden: number | null; laatste_lektest: string | null; volgende_lektest: string | null;
  kg_bijgevuld_dit_jaar: number; lekverlies_pct_dit_jaar: number; logboekplichtig: boolean;
};

export type Fles = {
  id: string; serienummer: string; koelmiddel: string; soort: "nieuw" | "recuperatie"; inhoud_bij_ontvangst_kg: number; capaciteit_kg: number | null;
  leverancier: string | null; factuurnummer: string | null; status: string; saldo_kg: number;
};

export type Interventie = {
  id: string; installatie_id: string; datum: string; type: string; technieker_id: string; kg_toegevoegd: number; fles_toegevoegd_id: string | null;
  gerecycleerd: boolean; kg_teruggewonnen: number; fles_recuperatie_id: string | null; lektest: "dicht" | "lek" | null; lekplaats: string | null;
  werkzaamheden: string | null; handtekening_png: string | null; corrigeert_id: string | null; toestel_id: string | null; aangemaakt_op: string;
};

export const INTERVENTIE_TYPES: Record<string, string> = {
  ingebruikname: "Ingebruikname", onderhoud: "Onderhoud", lektest: "Lekdichtheidscontrole", herstelling: "Herstelling",
  bijvulling: "Bijvulling", recuperatie: "Recuperatie", buitendienst: "Buitendienststelling",
};
export const INSTALLATIE_TYPES = ["Split", "Multisplit", "VRF", "Lucht-waterwarmtepomp", "Koelcel", "Vriescel", "Chiller"];

// Supabase geeft standaard maximaal 1000 rijen per vraag terug; de klantenlijst is groter.
export async function alleRijen<T>(tabel: string, kolommen: string, sorteer: string): Promise<T[]> {
  const uit: T[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase.from(tabel).select(kolommen).order(sorteer).range(van, van + 999);
    if (error) throw error;
    uit.push(...(data as T[]));
    if (data.length < 1000) return uit;
  }
}
