import { z } from "zod";

export const DIM_FIELDS = ["eaveIn", "peakIn", "lengthIn", "widthIn"] as const;
export type DimField = (typeof DIM_FIELDS)[number];

export const FIELD_LABEL: Record<DimField, string> = {
  eaveIn: "Eave height",
  peakIn: "Peak height",
  lengthIn: "Length",
  widthIn: "Width",
};

/** One AI-proposed value waiting for (or past) the inspector's check. */
export const AiSuggestionSchema = z.object({
  valueIn: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  /** pending = shown, not yet confirmed; accepted = tapped confirm; edited = inspector typed over it */
  status: z.enum(["pending", "accepted", "edited"]),
});
export type AiSuggestion = z.infer<typeof AiSuggestionSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  // null = not entered yet. Whole inches otherwise.
  eaveIn: z.number().int().nullable(),
  peakIn: z.number().int().nullable(),
  lengthIn: z.number().int().nullable(),
  widthIn: z.number().int().nullable(),
  ai: z.partialRecord(z.enum(DIM_FIELDS), AiSuggestionSchema).default({}),
  /** Soft-warning codes the inspector has tapped "confirm" on. */
  confirmedWarnings: z.array(z.string()).default([]),
});
export type Section = z.infer<typeof SectionSchema>;

export const InspectionSchema = z.object({
  id: z.string(),
  address: z.string(),
  customer: z.string(),
  inspector: z.string(),
  createdAt: z.string(),
  finalizedAt: z.string().nullable(),
  aiNote: z.string().nullable().default(null),
  sections: z.array(SectionSchema),
});
export type Inspection = z.infer<typeof InspectionSchema>;

export const StoreSchema = z.object({
  version: z.literal(1),
  inspections: z.array(InspectionSchema),
});
export type Store = z.infer<typeof StoreSchema>;
