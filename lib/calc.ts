/**
 * Fumigation volume math. Pure functions, no React, no I/O.
 *
 * Every length is stored as a whole number of INCHES. Inspectors enter feet +
 * inches, we convert once, and all arithmetic below stays in integers until the
 * very last division into cubic feet. That avoids float drift like
 * 10.1 * 3 = 30.299999999999997 creeping into a dosage number.
 *
 * Formula, per section:
 *   avg_height     = (eave + peak) / 2
 *   section_volume = length × width × avg_height
 *   total          = sum of section volumes
 *
 * This is EXACT for a simple gable section: a rectangular box up to the eave
 * plus a triangular prism (the roof) on top. Box = L·W·eave, prism =
 * L·W·(peak − eave)/2, and the two add up to L·W·(eave + peak)/2.
 * For hip roofs, dormers or flat roofs it is an approximation (a hip roof holds
 * less air than a gable with the same peak, so the number errs high, which is
 * the safe side for fumigant dosage).
 */

export const INCHES_PER_FOOT = 12;
export const CUBIC_INCHES_PER_CUBIC_FOOT = 1728; // 12³

export interface SectionDims {
  eaveIn: number;
  peakIn: number;
  lengthIn: number;
  widthIn: number;
}

/** Feet + inches → whole inches. Inches may exceed 11 (e.g. 9 ft 14 in = 122 in). */
export function toInches(feet: number, inches: number): number {
  return Math.round(feet) * INCHES_PER_FOOT + Math.round(inches);
}

/** Whole inches → { ft, in } for display and for the ft/in inputs. */
export function splitInches(totalInches: number): { ft: number; in: number } {
  const t = Math.max(0, Math.round(totalInches));
  return { ft: Math.floor(t / INCHES_PER_FOOT), in: t % INCHES_PER_FOOT };
}

/** "16′ 4″" */
export function formatFtIn(totalInches: number): string {
  const { ft, in: inch } = splitInches(totalInches);
  return inch === 0 ? `${ft}′` : `${ft}′ ${inch}″`;
}

/** Average height in inches. Can be a half inch (e.g. 109.5) and that's fine. */
export function avgHeightIn(eaveIn: number, peakIn: number): number {
  return (eaveIn + peakIn) / 2;
}

/**
 * Twice the section volume in cubic inches: L × W × (eave + peak).
 * Kept doubled so it is always an exact integer; the ÷2 happens in cubic feet.
 */
function doubledCubicInches(s: SectionDims): number {
  return s.lengthIn * s.widthIn * (s.eaveIn + s.peakIn);
}

/** Section volume in cubic feet (unrounded). */
export function sectionVolumeCuFt(s: SectionDims): number {
  return doubledCubicInches(s) / (2 * CUBIC_INCHES_PER_CUBIC_FOOT);
}

/** Total in cubic feet. Sums in exact integer cubic inches, divides once. */
export function totalVolumeCuFt(sections: SectionDims[]): number {
  const doubled = sections.reduce((sum, s) => sum + doubledCubicInches(s), 0);
  return doubled / (2 * CUBIC_INCHES_PER_CUBIC_FOOT);
}

/** Display: whole cubic feet with thousands separators. */
export function formatCuFt(cuFt: number): string {
  return Math.round(cuFt).toLocaleString("en-US");
}
