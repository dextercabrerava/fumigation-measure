"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { avgHeightIn, formatCuFt, formatFtIn, sectionVolumeCuFt } from "@/lib/calc";
import { measuredTotal } from "@/lib/status";
import { useStore } from "@/lib/store";
import { finalizeBlockers, isMeasurable } from "@/lib/validation";

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, get, update } = useStore();
  const insp = get(id);

  if (!ready) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-paper" />;
  if (!insp)
    return (
      <div className="rounded-2xl border border-line bg-paper p-6">
        <p className="font-semibold">That inspection isn&apos;t on this device.</p>
        <Link href="/" className="mt-2 inline-block font-semibold underline">Back to inspections</Link>
      </div>
    );

  const blockers = finalizeBlockers(insp.sections);
  const total = measuredTotal(insp);
  const aiCount = insp.sections.reduce((n, s) => n + Object.values(s.ai).filter(Boolean).length, 0);

  return (
    <div>
      <Link href={`/inspections/${insp.id}`} className="text-sm font-semibold text-mute hover:text-ink">← Back to measurements</Link>

      <div className="mt-3 rounded-2xl border border-line border-t-[6px] border-t-ink bg-paper p-5">
        <p className="text-[12px] font-bold uppercase tracking-wider text-mute">Fumigation volume</p>
        <p className="mt-1 text-5xl font-bold tracking-tight">
          {formatCuFt(total.cuFt)} <span className="text-xl font-semibold text-mute">cu ft</span>
        </p>
        <p className="mt-2 font-semibold">{insp.address || "No address"}</p>
        <p className="text-sm text-mute">
          {insp.customer || "No customer"} · Inspector {insp.inspector}
          {aiCount > 0 && ` · ${aiCount} values from AI prefill`}
        </p>
      </div>

      <h2 className="mt-6 mb-3 text-2xl font-bold tracking-tight">Per section</h2>

      {/* Table on wider screens */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-paper sm:block">
        <table className="w-full text-[13.5px]">
          <thead className="bg-wash text-left text-[11.5px] font-bold uppercase tracking-wider text-mute">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-3 py-3 text-right">Eave</th>
              <th className="px-3 py-3 text-right">Peak</th>
              <th className="px-3 py-3 text-right">Avg ht</th>
              <th className="px-3 py-3 text-right">L × W</th>
              <th className="px-4 py-3 text-right">Cu ft</th>
            </tr>
          </thead>
          <tbody>
            {insp.sections.map((s) => {
              const ok = isMeasurable(s);
              return (
                <tr key={s.id} className="border-t border-line hover:bg-wash/60">
                  <td className="px-4 py-3 font-semibold">{s.name || "Untitled section"}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{s.eaveIn != null ? formatFtIn(s.eaveIn) : "—"}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{s.peakIn != null ? formatFtIn(s.peakIn) : "—"}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{ok ? formatFtIn(avgHeightIn(s.eaveIn, s.peakIn)) : "—"}</td>
                  <td className="px-3 py-3 text-right text-ink-soft">{ok ? `${formatFtIn(s.lengthIn)} × ${formatFtIn(s.widthIn)}` : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold">{ok ? formatCuFt(sectionVolumeCuFt(s)) : "—"}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink">
              <td className="px-4 py-3 font-bold" colSpan={5}>Total</td>
              <td className="px-4 py-3 text-right text-lg font-bold">{formatCuFt(total.cuFt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stacked rows on phones */}
      <ul className="space-y-2 sm:hidden">
        {insp.sections.map((s) => {
          const ok = isMeasurable(s);
          return (
            <li key={s.id} className="rounded-xl border border-line bg-paper p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{s.name || "Untitled section"}</span>
                <span className="text-lg font-bold">{ok ? formatCuFt(sectionVolumeCuFt(s)) : "—"} <span className="text-xs text-mute">cu ft</span></span>
              </div>
              <p className="mt-1 text-[13px] text-mute">
                {ok
                  ? `Eave ${formatFtIn(s.eaveIn)} · Peak ${formatFtIn(s.peakIn)} · Avg ${formatFtIn(avgHeightIn(s.eaveIn, s.peakIn))} · ${formatFtIn(s.lengthIn)} × ${formatFtIn(s.widthIn)}`
                  : "Not fully measured"}
              </p>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 rounded-2xl border border-line bg-paper p-4">
        {insp.finalizedAt ? (
          <p className="font-semibold">
            Finalized {new Date(insp.finalizedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Next step in production: send to dosage calc and scheduling.
          </p>
        ) : blockers.length > 0 ? (
          <>
            <p className="font-bold">Can&apos;t finalize yet</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {blockers.map((b, k) => (
                <li key={k} className="flex items-center justify-between gap-3 rounded-lg bg-wash px-3 py-2">
                  <span>
                    <span className="font-semibold">{b.sectionName}</span>: {b.message}
                  </span>
                  <Link href={`/inspections/${insp.id}`} className="shrink-0 font-semibold underline">Fix</Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-mute">Fumigant dosage is set from this volume, so every number is checked by a person before it&apos;s final.</p>
          </>
        ) : (
          <p className="font-semibold text-good">All sections measured and checked.</p>
        )}
        {!insp.finalizedAt && (
          <button
            disabled={blockers.length > 0}
            onClick={() => update(insp.id, (i) => ({ ...i, finalizedAt: new Date().toISOString() }))}
            className="press mt-4 min-h-14 w-full rounded-xl bg-ink font-semibold text-white hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-35"
          >
            Finalize inspection
          </button>
        )}
      </section>
    </div>
  );
}
