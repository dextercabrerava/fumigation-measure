import { toInches } from "./calc";
import type { Inspection, Section } from "./types";

/**
 * Two sample inspections loaded on first run and on "Reset demo".
 * Edit these before recording if you want different addresses or numbers.
 * The addresses match data/mock-property-data.json so AI prefill has data.
 */

function section(id: string, name: string, dims?: [eave: [number, number], peak: [number, number], length: [number, number], width: [number, number]]): Section {
  return {
    id,
    name,
    eaveIn: dims ? toInches(...dims[0]) : null,
    peakIn: dims ? toInches(...dims[1]) : null,
    lengthIn: dims ? toInches(...dims[2]) : null,
    widthIn: dims ? toInches(...dims[3]) : null,
    ai: {},
    confirmedWarnings: [],
  };
}

export function seedInspections(): Inspection[] {
  return [
    {
      id: "insp-coquina",
      address: "1880 Coquina Way, Sarasota, FL 34231",
      customer: "Derek and Anh Whitfield",
      inspector: "Luis Carrasco",
      createdAt: "2026-11-10T14:22:00-05:00",
      finalizedAt: null,
      aiNote: null,
      sections: [
        section("sec-coq-main", "Main house", [[10, 1], [18, 9], [58, 2], [34, 5]]),
        section("sec-coq-garage", "Garage"),
        section("sec-coq-poolbath", "Pool bath addition"),
      ],
    },
    {
      id: "insp-palmetto",
      address: "4127 Palmetto Ridge Dr, Tampa, FL 33624",
      customer: "Marisol Ortega",
      inspector: "Luis Carrasco",
      createdAt: "2026-11-09T09:47:00-05:00",
      finalizedAt: null,
      aiNote: null,
      sections: [section("sec-pal-main", "Main house", [[9, 8], [16, 7], [61, 5], [33, 1]])],
    },
  ];
}
