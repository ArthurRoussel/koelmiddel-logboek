export const kg = (n: number | null | undefined, d = 2) =>
  Number(n ?? 0).toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });

export const datum = (s: string | null | undefined) =>
  s ? new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" }) : "–";

export const vandaag = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
};
