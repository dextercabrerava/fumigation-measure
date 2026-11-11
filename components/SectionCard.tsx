"use client";

import { useState } from "react";
import { avgHeightIn, formatCuFt, formatFtIn, sectionVolumeCuFt } from "@/lib/calc";
import { acceptAi, setField } from "@/lib/store";
import { DIM_FIELDS, FIELD_LABEL, type DimField, type Section } from "@/lib/types";
import { checkSection, isMeasurable } from "@/lib/validation";
import { FtInInput } from "./FtInInput";

interface Props {
  section: Section;
  all: Section[];
  index: number;
  locked: boolean;
  onChange: (s: Section) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SectionCard({ section: s, all, index, locked, onChange, onDuplicate, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const check = checkSection(s, all);
  const untouched = DIM_FIELDS.every((f) => s[f] == null);
  // Don't shout "required" at a section nobody has started yet.
  const errors = untouched ? check.errors.filter((e) => !e.message.includes("required")) : check.errors;
  const errFor = (f: DimField) => errors.find((e) => e.field === f)?.message;
  const warnFor = (f: DimField) => check.unconfirmed.find((w) => w.field === f)?.message;
  const measurable = isMeasurable(s);

  return (
    <article className="fade-up rounded-2xl border border-line border-t-4 border-t-ink bg-paper shadow-[0_1px_2px_rgba(23,23,23,0.04),0_8px_24px_-12px_rgba(23,23,23,0.12)]" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <input
          value={s.name}
          disabled={locked}
          onChange={(e) => onChange({ ...s, name: e.target.value })}
          placeholder="Section name, e.g. Garage"
          aria-label="Section name"
          className="h-11 min-w-0 basis-full rounded-lg sm:basis-0 sm:flex-1 bg-transparent px-1 text-xl font-bold tracking-tight outline-none placeholder:font-medium placeholder:text-mute focus:bg-wash"
        />
        {!locked && (
          <div className="ml-auto flex gap-2">
            <button onClick={onDuplicate} className="press h-11 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ink">
              Duplicate
            </button>
            <button
              onClick={() => (confirmDelete ? onDelete() : (setConfirmDelete(true), setTimeout(() => setConfirmDelete(false), 3000)))}
              className={`press h-11 rounded-lg border px-3 text-sm font-semibold ${confirmDelete ? "border-bad bg-bad text-white" : "border-line text-bad hover:border-bad"}`}
              aria-label={confirmDelete ? "Tap again to delete section" : "Delete section"}
            >
              {confirmDelete ? "Delete?" : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 p-4">
        {DIM_FIELDS.map((f) => (
          <FtInInput
            key={f}
            label={FIELD_LABEL[f]}
            valueIn={s[f]}
            disabled={locked}
            ai={s.ai[f]}
            onAcceptAi={() => onChange(acceptAi(s, f))}
            onChange={(v) => onChange(setField(s, f, v))}
            error={errFor(f)}
            warning={warnFor(f)}
          />
        ))}
      </div>

      {check.unconfirmed.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl border border-warn/40 bg-warn-wash p-3">
          <p className="text-[13px] font-bold text-warn">Check before finalizing</p>
          <ul className="mt-1 space-y-1 text-[13px] text-ink-soft">
            {check.unconfirmed.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
          {!locked && (
            <button
              onClick={() => onChange({ ...s, confirmedWarnings: [...s.confirmedWarnings, ...check.unconfirmed.map((w) => w.code)] })}
              className="press mt-2 min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
            >
              I re-measured, confirm
            </button>
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-3 rounded-b-2xl border-t border-line bg-wash px-4 py-3">
        <div className="text-[13px] text-mute">
          {measurable ? (
            <>
              Avg height <span className="font-semibold text-ink">{formatFtIn(avgHeightIn(s.eaveIn!, s.peakIn!))}</span>
              <span className="mx-1.5">·</span>
              {formatFtIn(s.lengthIn!)} × {formatFtIn(s.widthIn!)}
            </>
          ) : untouched ? (
            "Enter the four measurements or use AI prefill"
          ) : (
            "Finish the measurements to get a volume"
          )}
        </div>
        <div className="shrink-0 whitespace-nowrap text-right">
          <div className="text-[11px] font-bold uppercase tracking-wider text-mute">Section volume</div>
          <div className="text-2xl font-bold tracking-tight">{measurable ? formatCuFt(sectionVolumeCuFt(s)) : "—"} <span className="text-sm font-semibold text-mute">cu ft</span></div>
        </div>
      </div>
    </article>
  );
}
