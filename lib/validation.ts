/**
 * Measurement checks.
 *
 * Why this matters: fumigant dosage is calculated from cubic volume. Too low and
 * termites survive (a re-treat, a warranty claim); too high and you waste
 * gas and raise the safety risk. A wrong number here is a wrong dose there.
 *
 * Two tiers:
 *  - HARD errors block the section: missing or zero values, peak below eave.
 *  - SOFT warnings are allowed but need a "confirm" tap: heights or dimensions
 *    outside what a house normally looks like, or one section far bigger than the
 *    rest (usually a typo like 620 for 62).
 */
import { z } from "zod";
import { sectionVolumeCuFt, toInches } from "./calc";
import { DIM_FIELDS, FIELD_LABEL, type DimField, type Section } from "./types";

export interface Issue {
  code: string; // stable id, used to remember a confirmed warning
  field: DimField | "section";
  message: string;
}

export interface SectionCheck {
  errors: Issue[];
  warnings: Issue[]; // all soft warnings, confirmed or not
  unconfirmed: Issue[]; // warnings still waiting for a confirm tap
}

/** Zod schema for a complete, measurable section (hard rules only). */
export const MeasuredSectionSchema = z
  .object({
    eaveIn: z.number({ error: "Eave height is required" }).int().positive("Eave height must be more than 0"),
    peakIn: z.number({ error: "Peak height is required" }).int().positive("Peak height must be more than 0"),
    lengthIn: z.number({ error: "Length is required" }).int().positive("Length must be more than 0"),
    widthIn: z.number({ error: "Width is required" }).int().positive("Width must be more than 0"),
  })
  .refine((s) => s.peakIn >= s.eaveIn, {
    path: ["peakIn"],
    message: "Peak height can't be lower than the eave",
  });

/** Plausibility bands for a US residential structure, in inches. */
export const LIMITS = {
  eave: { min: toInches(7, 0), max: toInches(30, 0) },
  peak: { max: toInches(45, 0) },
  roofRise: { max: toInches(25, 0) }, // peak − eave
  footprint: { min: toInches(4, 0), max: toInches(200, 0) },
  /** A section more than this many times the next-largest section gets flagged. */
  outlierRatio: 6,
} as const;

function hardErrors(s: Section): Issue[] {
  const parsed = MeasuredSectionSchema.safeParse({
    eaveIn: s.eaveIn ?? undefined,
    peakIn: s.peakIn ?? undefined,
    lengthIn: s.lengthIn ?? undefined,
    widthIn: s.widthIn ?? undefined,
  });
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => {
    const field = i.path[0] as DimField;
    return { code: `err-${field}`, field, message: i.message };
  });
}

function softWarnings(s: Section, others: Section[]): Issue[] {
  const w: Issue[] = [];
  const { eaveIn, peakIn, lengthIn, widthIn } = s;
  if (eaveIn != null && eaveIn > 0) {
    if (eaveIn < LIMITS.eave.min) w.push({ code: "eave-low", field: "eaveIn", message: "Eave under 7 ft is unusual for a house. Crawl-space or shed?" });
    if (eaveIn > LIMITS.eave.max) w.push({ code: "eave-high", field: "eaveIn", message: "Eave over 30 ft is about three storeys. Double-check." });
  }
  if (peakIn != null && peakIn > LIMITS.peak.max) w.push({ code: "peak-high", field: "peakIn", message: "Peak over 45 ft is tall for a residence." });
  if (peakIn != null && eaveIn != null && peakIn - eaveIn > LIMITS.roofRise.max)
    w.push({ code: "rise-high", field: "peakIn", message: "Roof rises more than 25 ft above the eave. Steep or mis-keyed?" });
  for (const [field, v] of [["lengthIn", lengthIn], ["widthIn", widthIn]] as const) {
    if (v == null || v <= 0) continue;
    if (v < LIMITS.footprint.min) w.push({ code: `${field}-low`, field, message: `${FIELD_LABEL[field]} under 4 ft is very small for a tarped section.` });
    if (v > LIMITS.footprint.max) w.push({ code: `${field}-high`, field, message: `${FIELD_LABEL[field]} over 200 ft. Typo?` });
  }

  // Outlier vs the other measured sections.
  if (isMeasurable(s)) {
    const otherVols = others.filter(isMeasurable).map(sectionVolumeCuFt);
    if (otherVols.length >= 1) {
      const biggestOther = Math.max(...otherVols);
      const mine = sectionVolumeCuFt(s);
      if (biggestOther > 0 && mine > biggestOther * LIMITS.outlierRatio)
        w.push({
          code: "outlier",
          field: "section",
          message: `This section is ${Math.round(mine / biggestOther)}× the size of the next-largest section. Confirm it's not a typo.`,
        });
    }
  }
  return w;
}

export function checkSection(s: Section, all: Section[]): SectionCheck {
  const errors = hardErrors(s);
  const warnings = softWarnings(s, all.filter((o) => o.id !== s.id));
  const unconfirmed = warnings.filter((w) => !s.confirmedWarnings.includes(w.code));
  return { errors, warnings, unconfirmed };
}

export function pendingAiFields(s: Section): DimField[] {
  return DIM_FIELDS.filter((f) => s.ai[f]?.status === "pending");
}

export interface FinalizeBlocker {
  sectionId: string;
  sectionName: string;
  message: string;
}

/** Everything that stops an inspection from being finalized. Empty list = good to go. */
export function finalizeBlockers(sections: Section[]): FinalizeBlocker[] {
  const out: FinalizeBlocker[] = [];
  if (sections.length === 0) out.push({ sectionId: "", sectionName: "Inspection", message: "Add at least one section" });
  for (const s of sections) {
    const c = checkSection(s, sections);
    const name = s.name || "Untitled section";
    if (c.errors.length) out.push({ sectionId: s.id, sectionName: name, message: `${c.errors.length} required ${c.errors.length === 1 ? "fix" : "fixes"}` });
    if (c.unconfirmed.length) out.push({ sectionId: s.id, sectionName: name, message: `${c.unconfirmed.length} warning${c.unconfirmed.length === 1 ? "" : "s"} to confirm` });
    const p = pendingAiFields(s).length;
    if (p) out.push({ sectionId: s.id, sectionName: name, message: `${p} AI value${p === 1 ? "" : "s"} not yet confirmed` });
  }
  return out;
}

/** Only fully valid sections count toward the total bar. */
export function isMeasurable(s: Section): s is Section & { eaveIn: number; peakIn: number; lengthIn: number; widthIn: number } {
  return hardErrors(s).length === 0;
}
