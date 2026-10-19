import { test } from "node:test";
import assert from "node:assert/strict";
import { beoordeelLekverlies, lektestIntervalMaanden, lektestStatus, lekverliesPct, plusMaanden, tonCo2Eq } from "./fgas.ts";

const inst = (kg: number, gwp: number, hermetisch = false, lds = false) =>
  ({ nominale_inhoud_kg: kg, gwp, hermetisch, lekdetectiesysteem: lds });

test("ton CO2-eq", () => {
  assert.equal(tonCo2Eq(inst(6.5, 2139)), 13.9);
  assert.equal(tonCo2Eq(inst(3.2, 675)), 2.16);
});

test("lektestinterval volgens 2024/573", () => {
  assert.equal(lektestIntervalMaanden(inst(3.2, 675)), null); // 2,16 t: onder 5 t
  assert.equal(lektestIntervalMaanden(inst(7.5, 675)), 12); // 5,06 t
  assert.equal(lektestIntervalMaanden(inst(7.5, 675, true)), null); // hermetisch: pas vanaf 10 t
  assert.equal(lektestIntervalMaanden(inst(7.5, 675, false, true)), 24);
  assert.equal(lektestIntervalMaanden(inst(30, 2088)), 6); // 62,6 t
  assert.equal(lektestIntervalMaanden(inst(130, 3922)), 3); // 509,9 t
  assert.equal(lektestIntervalMaanden(inst(130, 3922, false, true)), 6);
});

test("lekverlies en oordeel", () => {
  assert.equal(lekverliesPct(0.45, 6.5), 6.9);
  assert.equal(beoordeelLekverlies(6.9, 0, 6.5)?.niveau, "warn");
  assert.equal(beoordeelLekverlies(12, 11, 6.5)?.niveau, "bad");
  assert.equal(beoordeelLekverlies(120, 0, 35)?.niveau, "bad");
  assert.equal(beoordeelLekverlies(4, 0, 6.5), null);
});

test("datums", () => {
  assert.equal(plusMaanden("2026-01-31", 1), "2026-02-28");
  assert.equal(plusMaanden("2025-10-19", 12), "2026-10-19");
  assert.equal(lektestStatus("2026-10-10", "2026-10-19")?.niveau, "bad");
  assert.equal(lektestStatus("2026-11-01", "2026-10-19")?.niveau, "warn");
  assert.equal(lektestStatus(null, "2026-10-19"), null);
});
