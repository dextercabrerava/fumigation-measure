"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCuFt } from "@/lib/calc";
import { inspectionStatus, measuredTotal, STATUS_STYLE } from "@/lib/status";
import { useStore } from "@/lib/store";

export default function InspectionsPage() {
  const { ready, inspections, create } = useStore();
  const router = useRouter();

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-mute">Structural fumigation</p>
          <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
        </div>
        <button onClick={() => router.push(`/inspections/${create()}`)} className="press min-h-12 rounded-xl bg-ink px-5 font-semibold text-white hover:bg-ink-soft">
          New inspection
        </button>
      </div>

      {!ready ? (
        <div className="space-y-3">
          {[0, 1].map((k) => (
            <div key={k} className="h-28 animate-pulse rounded-2xl border border-line bg-paper" />
          ))}
        </div>
      ) : inspections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
          <p className="font-semibold">No inspections yet.</p>
          <p className="mt-1 text-sm text-mute">Start one above, or tap Reset demo to load the two samples again.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {inspections.map((i, n) => {
            const status = inspectionStatus(i);
            const t = measuredTotal(i);
            return (
              <li key={i.id} className="fade-up" style={{ animationDelay: `${n * 70}ms` }}>
                <Link
                  href={`/inspections/${i.id}`}
                  className="press block rounded-2xl border border-line border-t-4 border-t-ink bg-paper p-4 transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-14px_rgba(23,23,23,0.25)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold tracking-tight">{i.address || "New inspection, no address yet"}</p>
                      <p className="truncate text-sm text-mute">
                        {i.customer || "No customer"} · {new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-sm text-mute">
                      {i.sections.length} section{i.sections.length === 1 ? "" : "s"}
                      {t.counted < t.of && ` · ${t.of - t.counted} not measured`}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {formatCuFt(t.cuFt)} <span className="text-sm font-semibold text-mute">cu ft</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-center text-xs text-mute">Saved on this device only. Demo build, sample data.</p>
    </div>
  );
}
