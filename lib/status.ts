import { totalVolumeCuFt } from "./calc";
import type { Inspection } from "./types";
import { finalizeBlockers, isMeasurable } from "./validation";

export type InspectionStatus = "Finalized" | "Ready to finalize" | "AI values to confirm" | "In progress";

export function inspectionStatus(i: Inspection): InspectionStatus {
  if (i.finalizedAt) return "Finalized";
  const blockers = finalizeBlockers(i.sections);
  if (blockers.length === 0) return "Ready to finalize";
  if (blockers.some((b) => b.message.includes("AI value"))) return "AI values to confirm";
  return "In progress";
}

export const STATUS_STYLE: Record<InspectionStatus, string> = {
  Finalized: "bg-ink text-white",
  "Ready to finalize": "bg-good-wash text-good",
  "AI values to confirm": "bg-warn-wash text-warn",
  "In progress": "bg-wash text-ink-soft",
};

/** Total of the sections that are fully and validly measured. */
export function measuredTotal(i: Inspection) {
  const ok = i.sections.filter(isMeasurable);
  return { cuFt: totalVolumeCuFt(ok), counted: ok.length, of: i.sections.length };
}
