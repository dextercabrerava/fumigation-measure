"use client";

/**
 * App state: plain React state, mirrored to localStorage. No database in the
 * demo. In production this layer becomes an offline-first local DB (IndexedDB)
 * with a sync queue to the server, see the architecture diagram.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedInspections } from "./seed";
import { StoreSchema, type DimField, type Inspection, type Section } from "./types";
import type { Proposal } from "./agent/prefill";

const KEY = "fumigation-measure:v1";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): Inspection[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = StoreSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data.inspections;
    }
  } catch {
    /* corrupted storage, fall through to seed */
  }
  return seedInspections();
}

export function blankSection(name = ""): Section {
  return { id: uid("sec"), name, eaveIn: null, peakIn: null, lengthIn: null, widthIn: null, ai: {}, confirmedWarnings: [] };
}

interface StoreApi {
  ready: boolean;
  inspections: Inspection[];
  get: (id: string) => Inspection | undefined;
  create: () => string;
  update: (id: string, fn: (i: Inspection) => Inspection) => void;
  remove: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);

  // Read localStorage only after mount, so server and client render the same first frame.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setInspections(load());
  }, []);

  useEffect(() => {
    if (inspections) localStorage.setItem(KEY, JSON.stringify({ version: 1, inspections }));
  }, [inspections]);

  const update = useCallback((id: string, fn: (i: Inspection) => Inspection) => {
    setInspections((all) => all?.map((i) => (i.id === id ? fn(i) : i)) ?? all);
  }, []);

  const api = useMemo<StoreApi>(
    () => ({
      ready: inspections !== null,
      inspections: inspections ?? [],
      get: (id) => inspections?.find((i) => i.id === id),
      create: () => {
        const id = uid("insp");
        const fresh: Inspection = {
          id,
          address: "",
          customer: "",
          inspector: "Luis Carrasco",
          createdAt: new Date().toISOString(),
          finalizedAt: null,
          aiNote: null,
          sections: [blankSection("Main house")],
        };
        setInspections((all) => [fresh, ...(all ?? [])]);
        return id;
      },
      update,
      remove: (id) => setInspections((all) => all?.filter((i) => i.id !== id) ?? all),
      reset: () => setInspections(seedInspections()),
    }),
    [inspections, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

// ---------- pure section edits (easy to test, easy to explain) ----------

/** Inspector typed a value. If it was an AI field, it now counts as checked ("edited"). */
export function setField(s: Section, field: DimField, valueIn: number | null): Section {
  const ai = { ...s.ai };
  if (ai[field]) ai[field] = { ...ai[field]!, status: "edited" };
  // Any change can make an old "confirmed" warning stale, so ask again.
  return { ...s, [field]: valueIn, ai, confirmedWarnings: [] };
}

export function acceptAi(s: Section, field: DimField): Section {
  const sug = s.ai[field];
  if (!sug) return s;
  return { ...s, ai: { ...s.ai, [field]: { ...sug, status: "accepted" } } };
}

export function duplicateSection(s: Section): Section {
  return { ...structuredClone(s), id: uid("sec"), name: `${s.name || "Section"} (copy)` };
}

const FIELD_MAP: Record<DimField, "eave_in" | "peak_in" | "length_in" | "width_in"> = {
  eaveIn: "eave_in",
  peakIn: "peak_in",
  lengthIn: "length_in",
  widthIn: "width_in",
};
const CONF_MAP: Record<DimField, "eave" | "peak" | "length" | "width"> = { eaveIn: "eave", peakIn: "peak", lengthIn: "length", widthIn: "width" };

/**
 * Merge an AI proposal into the inspection. Rule: AI never overwrites a value
 * the inspector already entered. It only fills empty fields (or replaces an
 * earlier AI value still pending), and every filled value starts "pending".
 */
export function applyProposal(insp: Inspection, p: Proposal): Inspection {
  const sections = [...insp.sections];
  for (const prop of p.sections) {
    let idx = sections.findIndex((s) => s.id === prop.section_id);
    if (idx === -1) {
      sections.push(blankSection(prop.section_name));
      idx = sections.length - 1;
    }
    const s = { ...sections[idx], ai: { ...sections[idx].ai } };
    for (const f of Object.keys(FIELD_MAP) as DimField[]) {
      const existing = s[f];
      const canFill = existing == null || s.ai[f]?.status === "pending";
      if (!canFill) continue;
      s[f] = prop[FIELD_MAP[f]];
      s.ai[f] = { valueIn: prop[FIELD_MAP[f]], confidence: prop.confidence[CONF_MAP[f]], source: prop.source, status: "pending" };
    }
    sections[idx] = s;
  }
  return { ...insp, sections, aiNote: p.summary };
}
