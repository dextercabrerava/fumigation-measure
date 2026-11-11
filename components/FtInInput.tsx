"use client";

import { useId, useState } from "react";
import { splitInches } from "@/lib/calc";
import type { AiSuggestion } from "@/lib/types";

interface Props {
  label: string;
  valueIn: number | null;
  onChange: (inches: number | null) => void;
  ai?: AiSuggestion;
  onAcceptAi?: () => void;
  error?: string;
  warning?: string;
  disabled?: boolean;
}

function toText(v: number | null) {
  if (v == null) return { ft: "", inch: "" };
  const s = splitInches(v);
  return { ft: String(s.ft), inch: String(s.in) };
}

function fromText(ft: string, inch: string): number | null {
  if (ft.trim() === "" && inch.trim() === "") return null;
  const f = Number(ft || 0);
  const i = Number(inch || 0);
  if (!Number.isFinite(f) || !Number.isFinite(i)) return null;
  return Math.max(0, Math.round(f)) * 12 + Math.max(0, Math.round(i));
}

/** Feet + inches entry with big touch targets. Emits whole inches. */
export function FtInInput({ label, valueIn, onChange, ai, onAcceptAi, error, warning, disabled }: Props) {
  const id = useId();
  const [text, setText] = useState(() => toText(valueIn));
  const [seen, setSeen] = useState(valueIn);

  // Value changed from outside (AI prefill, duplicate, reset): resync the boxes.
  if (valueIn !== seen) {
    setSeen(valueIn);
    if (fromText(text.ft, text.inch) !== valueIn) setText(toText(valueIn));
  }

  function edit(next: { ft: string; inch: string }) {
    setText(next);
    const v = fromText(next.ft, next.inch);
    setSeen(v);
    onChange(v);
  }

  const pending = ai?.status === "pending";
  const lowConf = ai && ai.confidence < 0.6;
  const tone = error ? "border-bad" : pending ? "border-ink border-dashed" : warning ? "border-warn" : "border-line";

  return (
    <div className="min-w-0">
      <label htmlFor={`${id}-ft`} className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-mute">
        {label}
      </label>
      <div className={`flex items-stretch overflow-hidden rounded-xl border-2 bg-paper ${tone} ${disabled ? "opacity-60" : ""}`}>
        <div className="flex flex-1 items-center">
          <input
            id={`${id}-ft`}
            inputMode="numeric"
            type="number"
            min={0}
            placeholder="–"
            disabled={disabled}
            value={text.ft}
            onChange={(e) => edit({ ...text, ft: e.target.value })}
            aria-label={`${label} feet`}
            aria-invalid={!!error}
            className="h-14 w-full min-w-0 bg-transparent pl-2 text-right text-xl sm:text-2xl font-bold outline-none placeholder:text-line"
          />
          <span className="px-1.5 text-[13px] font-semibold text-mute sm:px-2">ft</span>
        </div>
        <div className="w-px bg-line" />
        <div className="flex w-[42%] items-center">
          <input
            inputMode="numeric"
            type="number"
            min={0}
            max={11}
            placeholder="–"
            disabled={disabled}
            value={text.inch}
            onChange={(e) => edit({ ...text, inch: e.target.value })}
            aria-label={`${label} inches`}
            className="h-14 w-full min-w-0 bg-transparent pl-1 text-right text-xl sm:text-2xl font-bold outline-none placeholder:text-line"
          />
          <span className="px-1.5 text-[13px] font-semibold text-mute sm:px-2">in</span>
        </div>
      </div>

      {ai && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
          {pending ? (
            <>
              <span className={`rounded-full px-2 py-1 font-semibold ${lowConf ? "bg-bad-wash text-bad" : "bg-wash text-ink-soft"}`}>
                AI suggested · {Math.round(ai.confidence * 100)}% confidence
              </span>
              {lowConf && <span className="rounded-full bg-bad px-2 py-1 font-semibold text-white">Needs human review</span>}
              {!disabled && (
                <button onClick={onAcceptAi} className="press min-h-9 rounded-full bg-ink px-3 py-1 font-semibold text-white hover:bg-ink-soft">
                  Confirm
                </button>
              )}
            </>
          ) : (
            <span className="rounded-full bg-good-wash px-2 py-1 font-semibold text-good">
              {ai.status === "accepted" ? "AI value confirmed" : "Edited by inspector"}
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-1.5 text-[13px] font-semibold text-bad">{error}</p>}
      {!error && warning && <p className="mt-1.5 text-[13px] font-semibold text-warn">{warning}</p>}
    </div>
  );
}
