import { describe, expect, it } from "vitest";
import { avgHeightIn, formatFtIn, sectionVolumeCuFt, splitInches, toInches, totalVolumeCuFt } from "@/lib/calc";

const ft = (f: number, i = 0) => toInches(f, i);

describe("unit conversion", () => {
  it("feet + inches to inches and back", () => {
    expect(toInches(9, 8)).toBe(116);
    expect(splitInches(116)).toEqual({ ft: 9, in: 8 });
    expect(formatFtIn(116)).toBe("9′ 8″");
    expect(formatFtIn(120)).toBe("10′");
  });
});

describe("section math", () => {
  it("average height is the midpoint of eave and peak", () => {
    expect(avgHeightIn(ft(10), ft(20))).toBe(ft(15));
    expect(avgHeightIn(ft(9, 8), ft(16, 7))).toBe(157.5); // half inch is fine
  });

  it("volume = length × width × avg height (simple gable)", () => {
    // 40 × 30 footprint, 10 ft eave, 20 ft peak → 40·30·15 = 18,000 cu ft exactly
    expect(sectionVolumeCuFt({ eaveIn: ft(10), peakIn: ft(20), lengthIn: ft(40), widthIn: ft(30) })).toBe(18000);
  });

  it("matches box + triangular roof prism", () => {
    const s = { eaveIn: ft(9, 8), peakIn: ft(16, 7), lengthIn: ft(61, 5), widthIn: ft(33, 1) };
    const L = s.lengthIn / 12, W = s.widthIn / 12, E = s.eaveIn / 12, P = s.peakIn / 12;
    const boxPlusPrism = L * W * E + (L * W * (P - E)) / 2;
    expect(sectionVolumeCuFt(s)).toBeCloseTo(boxPlusPrism, 6);
  });

  it("total sums sections without float drift", () => {
    const a = { eaveIn: ft(10, 1), peakIn: ft(18, 9), lengthIn: ft(58, 2), widthIn: ft(34, 5) };
    const b = { eaveIn: ft(9, 8), peakIn: ft(14, 3), lengthIn: ft(24, 4), widthIn: ft(22, 7) };
    expect(totalVolumeCuFt([a, b])).toBeCloseTo(sectionVolumeCuFt(a) + sectionVolumeCuFt(b), 9);
    // 0.1-foot style inputs would drift in floats; integer inches don't
    const tiny = { eaveIn: 1, peakIn: 1, lengthIn: 1, widthIn: 1 };
    expect(totalVolumeCuFt(Array(1728).fill(tiny))).toBe(1);
  });

  it("empty structure totals zero", () => {
    expect(totalVolumeCuFt([])).toBe(0);
  });
});
