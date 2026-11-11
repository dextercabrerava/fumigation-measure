"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

export function Header() {
  const { reset } = useStore();
  const router = useRouter();
  const [armed, setArmed] = useState(false);

  function onReset() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    reset();
    setArmed(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-t-[6px] border-ink bg-paper/95 backdrop-blur border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-[15px] font-bold text-white">FM</span>
          <span className="min-w-0">
            <span className="block truncate text-[17px] font-bold leading-tight tracking-tight">Fumigation Measure</span>
            <span className="block truncate text-xs text-mute">Structural fumigation · Inspections</span>
          </span>
        </Link>
        <span className="ml-auto hidden shrink-0 rounded-full border border-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider sm:inline">
          Demo · sample data
        </span>
        <button
          onClick={onReset}
          className={`press ml-auto shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold sm:ml-0 ${armed ? "border-bad bg-bad text-white" : "border-line bg-paper hover:border-ink"}`}
        >
          {armed ? "Tap to confirm" : "Reset demo"}
        </button>
      </div>
      <div className="border-t border-line bg-ink px-4 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-white sm:hidden">
        Demo · sample data
      </div>
    </header>
  );
}
