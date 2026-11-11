"use client";

import Link from "next/link";
import { formatCuFt } from "@/lib/calc";
import { measuredTotal } from "@/lib/status";
import type { Inspection } from "@/lib/types";

/** Sticky bottom bar: the one number the whole visit is about. */
export function TotalBar({ inspection, href, cta }: { inspection: Inspection; href?: string; cta?: string }) {
  const t = measuredTotal(inspection);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t-4 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-mute">Total cubic feet</div>
          <div className="text-3xl font-bold leading-none tracking-tight" aria-live="polite">
            {formatCuFt(t.cuFt)}
          </div>
          <div className="mt-1 text-[12px] text-mute">
            {t.counted} of {t.of} section{t.of === 1 ? "" : "s"} counted
          </div>
        </div>
        {href && cta && (
          <Link href={href} className="press grid min-h-14 shrink-0 place-items-center rounded-xl bg-ink px-5 font-semibold text-white hover:bg-ink-soft">
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}
