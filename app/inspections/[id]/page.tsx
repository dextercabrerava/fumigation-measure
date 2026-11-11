"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import { TotalBar } from "@/components/TotalBar";
import type { PrefillResult } from "@/lib/agent/prefill";
import { applyProposal, blankSection, duplicateSection, useStore } from "@/lib/store";
import type { Inspection } from "@/lib/types";

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, get, update } = useStore();
  const insp = get(id);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PrefillResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-paper" />;
  if (!insp)
    return (
      <div className="rounded-2xl border border-line bg-paper p-6">
        <p className="font-semibold">That inspection isn&apos;t on this device.</p>
        <Link href="/" className="mt-2 inline-block font-semibold underline">Back to inspections</Link>
      </div>
    );

  const locked = !!insp.finalizedAt;
  const edit = (fn: (i: Inspection) => Inspection) => update(insp.id, fn);

  async function runPrefill() {
    if (!insp) return;
    setBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/prefill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: insp.address, sections: insp.sections.map((s) => ({ id: s.id, name: s.name })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prefill failed");
      const r = data as PrefillResult;
      setResult(r);
      if (r.proposal) edit((i) => applyProposal(i, r.proposal!));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Prefill failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/" className="text-sm font-semibold text-mute hover:text-ink">← Inspections</Link>

      {locked && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink px-4 py-3 text-white">
          <span className="text-sm font-semibold">Finalized {new Date(insp.finalizedAt!).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Read only.</span>
          <button onClick={() => edit((i) => ({ ...i, finalizedAt: null }))} className="press min-h-10 rounded-lg bg-white px-3 text-sm font-semibold text-ink">
            Reopen
          </button>
        </div>
      )}

      <section className="mt-3 rounded-2xl border border-line border-t-4 border-t-ink bg-paper p-4">
        <label htmlFor="address" className="text-[12px] font-bold uppercase tracking-wider text-mute">Property address</label>
        <input
          id="address"
          value={insp.address}
          disabled={locked}
          onChange={(e) => edit((i) => ({ ...i, address: e.target.value }))}
          placeholder="Street, city, state, ZIP"
          autoComplete="street-address"
          className="mt-1.5 h-14 w-full rounded-xl border-2 border-line px-3 text-lg font-semibold outline-none focus:border-ink"
        />
        <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          <div>
            <label htmlFor="customer" className="text-[12px] font-bold uppercase tracking-wider text-mute">Customer</label>
            <input
              id="customer"
              value={insp.customer}
              disabled={locked}
              onChange={(e) => edit((i) => ({ ...i, customer: e.target.value }))}
              className="mt-1.5 h-12 w-full rounded-xl border-2 border-line px-3 font-semibold outline-none focus:border-ink"
            />
          </div>
          <div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-mute">Inspector</span>
            <p className="mt-1.5 flex h-12 items-center font-semibold">{insp.inspector}</p>
          </div>
        </div>

        {!locked && (
          <div className="mt-4 rounded-xl border-2 border-dashed border-ink/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">AI prefill</p>
                <p className="text-[13px] text-mute">Pulls property records and the roof footprint, proposes values you confirm. Never overwrites what you typed.</p>
              </div>
              <button
                onClick={runPrefill}
                disabled={busy || insp.address.trim().length < 5}
                className="press min-h-12 shrink-0 rounded-xl bg-ink px-5 font-semibold text-white hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Reading property data…" : "Prefill with AI"}
              </button>
            </div>
            {aiError && <p className="mt-2 text-[13px] font-semibold text-bad">{aiError}</p>}
            {result && (
              <div className="mt-3 border-t border-line pt-3 text-[13px]">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${result.mode === "live" ? "bg-ink text-white" : "bg-wash text-ink-soft"}`}>
                    {result.mode === "live" ? "Live · Claude tool calling" : "Canned mock agent"}
                  </span>
                  <span className="text-mute">Tools called: {result.toolCalls.map((t) => t.name).join(", ")}</span>
                </p>
                {result.reason && <p className="mt-1 text-mute">{result.reason}</p>}
                {insp.aiNote && <p className="mt-1 text-ink-soft">{insp.aiNote}</p>}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-6 mb-3 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Sections</h2>
        <span className="text-sm text-mute">{insp.sections.length} total</span>
      </div>

      <div className="space-y-4">
        {insp.sections.map((s, n) => (
          <SectionCard
            key={s.id}
            section={s}
            all={insp.sections}
            index={n}
            locked={locked}
            onChange={(next) => edit((i) => ({ ...i, sections: i.sections.map((x) => (x.id === s.id ? next : x)) }))}
            onDuplicate={() =>
              edit((i) => {
                const at = i.sections.findIndex((x) => x.id === s.id);
                const copy = [...i.sections];
                copy.splice(at + 1, 0, duplicateSection(s));
                return { ...i, sections: copy };
              })
            }
            onDelete={() => edit((i) => ({ ...i, sections: i.sections.filter((x) => x.id !== s.id) }))}
          />
        ))}
        {insp.sections.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-paper p-6 text-center text-sm text-mute">No sections. Add the main house first, then garage, additions, lanai.</p>
        )}
      </div>

      {!locked && (
        <button
          onClick={() => edit((i) => ({ ...i, sections: [...i.sections, blankSection("")] }))}
          className="press mt-4 min-h-14 w-full rounded-2xl border-2 border-dashed border-ink/40 bg-paper font-semibold hover:border-ink"
        >
          + Add section
        </button>
      )}

      <TotalBar inspection={insp} href={`/inspections/${insp.id}/summary`} cta="Review & finalize" />
    </div>
  );
}
