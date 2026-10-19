// Regels uit de F-gassenwetgeving, gedeeld door de schermen.
// De database berekent dezelfde waarden in de view installatie_overzicht; hier staan ze voor offline gebruik en waarschuwingen vooraf.

export type InstallatieBasis = {
  nominale_inhoud_kg: number;
  gwp: number;
  hermetisch: boolean;
  lekdetectiesysteem: boolean;
};

export const tonCo2Eq = (i: Pick<InstallatieBasis, "nominale_inhoud_kg" | "gwp">) =>
  Math.round(((i.nominale_inhoud_kg * i.gwp) / 1000) * 100) / 100;

// Verordening (EU) 2024/573 art. 5: lekdichtheidscontrole elke 12, 6 of 3 maanden vanaf 5, 50 of 500 t CO2-eq;
// met lekdetectiesysteem het dubbele. Hermetisch gesloten toestellen pas vanaf 10 t CO2-eq.
export function lektestIntervalMaanden(i: InstallatieBasis): number | null {
  const t = tonCo2Eq(i);
  if (t < (i.hermetisch ? 10 : 5)) return null;
  if (t >= 500) return i.lekdetectiesysteem ? 6 : 3;
  if (t >= 50) return i.lekdetectiesysteem ? 12 : 6;
  return i.lekdetectiesysteem ? 24 : 12;
}

// VLAREM II art. 1: relatief lekverlies L = bijvullingen in het kalenderjaar / nominale inhoud x 100%.
export const lekverliesPct = (kgBijgevuld: number, nominaleInhoudKg: number) =>
  nominaleInhoudKg > 0 ? Math.round((kgBijgevuld / nominaleInhoudKg) * 1000) / 10 : 0;

export type LekverliesOordeel = { niveau: "ok" | "warn" | "bad"; tekst: string } | null;

// VLAREM II art. 5.16.3.3 §6: doel max. 5%/jaar; >10% twee jaar na elkaar = buitenbedrijfstelling;
// >100% bij installaties boven 30 kg = melding binnen 14 dagen.
export function beoordeelLekverlies(pctDitJaar: number, pctVorigJaar: number, nominaleInhoudKg: number): LekverliesOordeel {
  if (pctDitJaar > 100 && nominaleInhoudKg > 30)
    return { niveau: "bad", tekst: "Lekverlies boven 100% bij een installatie boven 30 kg. Melden binnen 14 dagen." };
  if (pctDitJaar > 10 && pctVorigJaar > 10)
    return { niveau: "bad", tekst: "Twee kalenderjaren na elkaar meer dan 10% lekverlies. Buitenbedrijfstelling binnen 12 maanden en melding binnen 14 dagen." };
  if (pctDitJaar > 5) return { niveau: "warn", tekst: `Lekverlies ${pctDitJaar.toLocaleString("nl-BE")}% dit jaar, boven de doelstelling van maximaal 5%.` };
  return null;
}

export function plusMaanden(datum: string, maanden: number): string {
  const [j, m, d] = datum.split("-").map(Number);
  const r = new Date(Date.UTC(j, m - 1 + maanden, d));
  // 31 januari + 1 maand wordt 28/29 februari, zoals in PostgreSQL
  if (r.getUTCDate() !== d) r.setUTCDate(0);
  return r.toISOString().slice(0, 10);
}

export function lektestStatus(volgende: string | null, vandaag: string) {
  if (!volgende) return null;
  const dagen = Math.round((Date.parse(volgende) - Date.parse(vandaag)) / 864e5);
  if (dagen < 0) return { niveau: "bad" as const, dagen, tekst: `${-dagen} d te laat` };
  if (dagen <= 45) return { niveau: "warn" as const, dagen, tekst: `binnen ${dagen} d` };
  return { niveau: "ok" as const, dagen, tekst: "in orde" };
}
