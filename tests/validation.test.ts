import { describe, expect, it } from "vitest";
import { toInches } from "@/lib/calc";
import type { Section } from "@/lib/types";
import { checkSection, finalizeBlockers } from "@/lib/validation";

const ft = (f: number, i = 0) => toInches(f, i);
function sec(over: Partial<Section> = {}): Section {
  return { id: Math.random().toString(36), name: "Main house", eaveIn: ft(10), peakIn: ft(18), lengthIn: ft(50), widthIn: ft(30), ai: {}, confirmedWarnings: [], ...over };
}

describe("hard errors", () => {
  it("passes a normal house", () => {
    const s = sec();
    expect(checkSection(s, [s]).errors).toEqual([]);
  });
  it("rejects peak below eave", () => {
    const s = sec({ eaveIn: ft(12), peakIn: ft(10) });
    expect(checkSection(s, [s]).errors.map((e) => e.field)).toContain("peakIn");
  });
  it("rejects empty and zero values", () => {
    const s = sec({ lengthIn: null, widthIn: 0 });
    const fields = checkSection(s, [s]).errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["lengthIn", "widthIn"]));
  });
});

describe("soft warnings", () => {
  it("flags implausible heights and dimensions", () => {
    const s = sec({ eaveIn: ft(5), lengthIn: ft(620) });
    const codes = checkSection(s, [s]).warnings.map((w) => w.code);
    expect(codes).toEqual(expect.arrayContaining(["eave-low", "lengthIn-high"]));
  });
  it("flags a section far larger than the others", () => {
    const garage = sec({ id: "g", name: "Garage", eaveIn: ft(9), peakIn: ft(14), lengthIn: ft(22), widthIn: ft(20) });
    const typo = sec({ id: "m", lengthIn: ft(180), widthIn: ft(60) });
    expect(checkSection(typo, [typo, garage]).warnings.map((w) => w.code)).toContain("outlier");
  });
  it("a normal house next to its garage is not an outlier", () => {
    const garage = sec({ id: "g", eaveIn: ft(9), peakIn: ft(15), lengthIn: ft(24), widthIn: ft(22) });
    const main = sec({ id: "m", eaveIn: ft(10, 1), peakIn: ft(18, 9), lengthIn: ft(58, 2), widthIn: ft(34, 5) });
    expect(checkSection(main, [main, garage]).warnings).toEqual([]);
  });
  it("a confirmed warning stops blocking", () => {
    const s = sec({ eaveIn: ft(5) });
    expect(finalizeBlockers([s])).toHaveLength(1);
    expect(finalizeBlockers([{ ...s, confirmedWarnings: ["eave-low"] }])).toHaveLength(0);
  });
});

describe("AI values gate finalize", () => {
  it("blocks while an AI value is pending", () => {
    const s = sec({ ai: { peakIn: { valueIn: ft(18), confidence: 0.54, source: "mock", status: "pending" } } });
    expect(finalizeBlockers([s])[0].message).toMatch(/AI value/);
    const ok = sec({ ai: { peakIn: { valueIn: ft(18), confidence: 0.54, source: "mock", status: "accepted" } } });
    expect(finalizeBlockers([ok])).toEqual([]);
  });
});
