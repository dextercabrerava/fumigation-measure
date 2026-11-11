import { describe, expect, it } from "vitest";
import { runMock } from "@/lib/agent/prefill";
import { seedInspections } from "@/lib/seed";
import { applyProposal } from "@/lib/store";

describe("mock prefill agent", () => {
  const coquina = seedInspections().find((i) => i.id === "insp-coquina")!;

  it("proposes every footprint segment and maps to existing sections", () => {
    const r = runMock({ address: coquina.address, sections: coquina.sections.map((s) => ({ id: s.id, name: s.name })) });
    expect(r.mode).toBe("mock");
    expect(r.proposal!.sections.map((s) => s.section_id)).toEqual(["sec-coq-main", "sec-coq-garage", "sec-coq-poolbath"]);
    const garage = r.proposal!.sections[1];
    expect(garage.confidence.peak).toBeLessThan(0.6); // tree cover → human review
  });

  it("never overwrites inspector values and marks AI values pending", () => {
    const r = runMock({ address: coquina.address, sections: coquina.sections.map((s) => ({ id: s.id, name: s.name })) });
    const next = applyProposal(coquina, r.proposal!);
    const main = next.sections[0];
    expect(main.lengthIn).toBe(coquina.sections[0].lengthIn);
    expect(main.ai).toEqual({});
    expect(next.sections[1].ai.peakIn?.status).toBe("pending");
  });

  it("returns an empty proposal for an unknown address", () => {
    const r = runMock({ address: "77 Nowhere Ln, Ocala, FL", sections: [] });
    expect(r.proposal!.sections).toEqual([]);
  });
});
