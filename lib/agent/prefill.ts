/**
 * The AI prefill agent.
 *
 * Live mode: Claude gets the address and the section names, calls
 * get_property_records and get_roof_footprint (mock data), then hands back one
 * proposal per section through submit_measurements. Every number carries a
 * confidence score; the inspector confirms or edits each one in the UI.
 *
 * Mock mode: no ANTHROPIC_API_KEY, or the live call fails or times out. The same
 * tools run and a fixed rule set turns the footprint into proposals, so the demo
 * never breaks in front of a client.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getPropertyRecords, getRoofFootprint } from "./property-tools";

export const MODEL = "claude-opus-5-5";

/**
 * Hard ceiling for the whole live run (every turn, every tool call). Kept well
 * under the route's maxDuration (60 s) so a slow model can never get the
 * function killed before the mock fallback answers.
 */
export const LIVE_DEADLINE_MS = 25_000;

/** Resolve with `work`, or reject once `ms` passes, whichever comes first. */
export function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

// ---------- what the agent returns ----------

const Conf = z.number().min(0).max(1);
export const ProposalSchema = z.object({
  summary: z.string(),
  sections: z.array(
    z.object({
      section_id: z.string(), // an existing id, or "new"
      section_name: z.string(),
      eave_in: z.number().int().positive(),
      peak_in: z.number().int().positive(),
      length_in: z.number().int().positive(),
      width_in: z.number().int().positive(),
      confidence: z.object({ eave: Conf, peak: Conf, length: Conf, width: Conf }),
      source: z.string(),
      rationale: z.string(),
    }),
  ),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export interface PrefillRequest {
  address: string;
  sections: { id: string; name: string }[];
}

export interface PrefillResult {
  mode: "live" | "mock";
  reason?: string; // why we fell back to mock
  toolCalls: { name: string; input: unknown }[];
  proposal: Proposal | null;
  message?: string;
}

// ---------- tool definitions sent to Claude ----------

const addressInput = {
  type: "object" as const,
  properties: { address: { type: "string", description: "Full street address of the structure" } },
  required: ["address"],
  additionalProperties: false,
};

const confidenceSchema = { type: "number", description: "0 to 1" };

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_property_records",
    description:
      "Look up the county property record for an address: year built, living area, number of stories, construction, roof type and the list of structures on the parcel. Returns found:false if there is no record.",
    input_schema: addressInput,
    strict: true,
  },
  {
    name: "get_roof_footprint",
    description:
      "Get the aerial roof footprint for an address: one segment per roof plane group with length_ft, width_ft, roof form, pitch (rise/12), a height hint and the imagery quality. Footprint length and width are measured; heights are NOT measured and must be estimated.",
    input_schema: addressInput,
    strict: true,
  },
  {
    name: "submit_measurements",
    description:
      "Submit the proposed measurements, one entry per section. Call this exactly once, at the end. All lengths in whole inches.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "sections"],
      properties: {
        summary: { type: "string", description: "One or two sentences for the inspector, plain English." },
        sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["section_id", "section_name", "eave_in", "peak_in", "length_in", "width_in", "confidence", "source", "rationale"],
            properties: {
              section_id: { type: "string", description: "id of the inspector's existing section, or \"new\" for a structure they haven't added" },
              section_name: { type: "string" },
              eave_in: { type: "integer" },
              peak_in: { type: "integer" },
              length_in: { type: "integer" },
              width_in: { type: "integer" },
              confidence: {
                type: "object",
                additionalProperties: false,
                required: ["eave", "peak", "length", "width"],
                properties: { eave: confidenceSchema, peak: confidenceSchema, length: confidenceSchema, width: confidenceSchema },
              },
              source: { type: "string", description: "Which tool data the numbers came from" },
              rationale: { type: "string", description: "One short sentence on how the heights were estimated" },
            },
          },
        },
      },
    },
  },
];

const SYSTEM = `You prefill structural fumigation measurements for a pest control inspector in the US.
For each section of the structure you need eave height, peak height, length and width, in whole inches.

How to work:
- Call get_property_records and get_roof_footprint for the address, then call submit_measurements once.
- Length and width come from the roof footprint (convert feet to inches, round). Their confidence is about the footprint_confidence.
- Heights are estimates. Eave: about 9 ft 8 in for a single storey on slab, 8 ft 4 in for a low addition, 19 ft 6 in for two storeys. Peak = eave + (width / 2) × (pitch rise / 12). Keep eave confidence around 0.65 to 0.75.
- Lower the peak confidence below 0.6 when the imagery quality mentions tree cover, shadow or an obstructed ridge. That flags it for human review, which is the point.
- Match footprint segments to the inspector's sections by meaning ("Garage" = "Attached garage"). Use section_id "new" for a structure the inspector hasn't added.
- All tool data in this demo is labelled MOCK. Say so in the summary.
- Never invent a structure that isn't in the tool data. If there is no data, submit an empty sections list and say why.`;

// ---------- live run ----------

async function runLive(req: PrefillRequest, apiKey: string): Promise<PrefillResult> {
  const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 0 });
  const toolCalls: PrefillResult["toolCalls"] = [];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Address: ${req.address}\nInspector's sections: ${JSON.stringify(req.sections)}`,
    },
  ];

  for (let turn = 0; turn < 6; turn++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });

    if (res.stop_reason === "refusal") throw new Error("model declined the request");
    if (res.stop_reason === "max_tokens") throw new Error("response hit max_tokens");

    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (uses.length === 0) throw new Error("model finished without submitting measurements");
    messages.push({ role: "assistant", content: res.content });

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      toolCalls.push({ name: u.name, input: u.input });
      if (u.name === "submit_measurements") {
        const parsed = ProposalSchema.safeParse(u.input);
        if (!parsed.success) throw new Error("proposal failed validation");
        return { mode: "live", toolCalls, proposal: parsed.data };
      }
      const address = String((u.input as { address?: string }).address ?? req.address);
      const data = u.name === "get_property_records" ? getPropertyRecords(address) : u.name === "get_roof_footprint" ? getRoofFootprint(address) : { error: `unknown tool ${u.name}` };
      results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(data) });
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("agent ran out of turns");
}

// ---------- mock run: same tools, fixed rules ----------

const EAVE_IN = { single: 116, low: 100, two: 234 }; // 9'8", 8'4", 19'6"

function norm(s: string) {
  return s.toLowerCase().replace(/attached|detached/g, "").trim();
}

export function runMock(req: PrefillRequest, reason?: string): PrefillResult {
  const toolCalls = [
    { name: "get_property_records", input: { address: req.address } },
    { name: "get_roof_footprint", input: { address: req.address } },
  ];
  getPropertyRecords(req.address);
  const fp = getRoofFootprint(req.address);
  if (!fp.found || !("segments" in fp)) {
    return {
      mode: "mock",
      reason,
      toolCalls,
      proposal: { summary: "No mock property data for this address. Measure on site.", sections: [] },
    };
  }

  const used = new Set<string>();
  const sections = fp.segments.map((seg) => {
    const match = req.sections.find((s) => !used.has(s.id) && (norm(s.name).includes(norm(seg.label)) || norm(seg.label).includes(norm(s.name))));
    if (match) used.add(match.id);
    const hint = seg.height_hint.toLowerCase();
    const eave = hint.includes("two") ? EAVE_IN.two : hint.includes("low") ? EAVE_IN.low : EAVE_IN.single;
    const rise = Number(seg.pitch.split("/")[0]);
    const widthIn = Math.round(seg.width_ft * 12);
    const peak = Math.round(eave + (widthIn / 2) * (rise / 12));
    const obstructed = /tree|shadow|obstruct|hidden/.test(seg.imagery_quality + " " + hint);
    return {
      section_id: match?.id ?? "new",
      section_name: match?.name ?? seg.label,
      eave_in: eave,
      peak_in: peak,
      length_in: Math.round(seg.length_ft * 12),
      width_in: widthIn,
      confidence: {
        eave: hint.includes("two") ? 0.66 : 0.72,
        peak: obstructed ? 0.54 : 0.69,
        length: seg.footprint_confidence,
        width: Math.round((seg.footprint_confidence - 0.02) * 100) / 100,
      },
      source: `${fp.source}, captured ${fp.capture_date}`,
      rationale: `Footprint from aerial outline; eave from "${seg.height_hint}"; peak from ${seg.pitch} pitch over half the width.${obstructed ? " Ridge partly obstructed, so the peak needs a tape check." : ""}`,
    };
  });

  return {
    mode: "mock",
    reason,
    toolCalls,
    proposal: {
      summary: `Prefilled ${sections.length} section${sections.length === 1 ? "" : "s"} from MOCK county and aerial data. Footprints are measured; heights are estimates, so check them on site.`,
      sections,
    },
  };
}

export async function prefill(req: PrefillRequest): Promise<PrefillResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || process.env.PREFILL_MODE === "mock") return runMock(req, "No API key set, using canned mock agent");
  try {
    return await withDeadline(runLive(req, key), LIVE_DEADLINE_MS);
  } catch (err) {
    const why = err instanceof Anthropic.APIError ? `Claude API error ${err.status ?? ""}`.trim() : err instanceof Error ? err.message : "unknown error";
    console.error("[prefill] live run failed, falling back to mock:", why);
    return runMock(req, `Live agent unavailable (${why}), using canned mock agent`);
  }
}
