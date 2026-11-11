/**
 * The two tools the prefill agent can call. In the demo both read MOCK data
 * from data/mock-property-data.json. In production, swap the bodies for real
 * API calls (property-data provider, aerial roof-measurement provider) and keep
 * the same return shapes: the agent and the UI won't notice.
 */
import mock from "@/data/mock-property-data.json";

type MockProperty = (typeof mock.properties)[number];

function find(address: string): MockProperty | undefined {
  const a = address.toLowerCase().replace(/\s+/g, " ");
  return mock.properties.find((p) => p.match.some((m) => a.includes(m)));
}

export function getPropertyRecords(address: string) {
  const p = find(address);
  if (!p) return { found: false, address, note: "MOCK: no county record for this address in the demo data set." };
  return { found: true, address, mock: true, ...p.records };
}

export function getRoofFootprint(address: string) {
  const p = find(address);
  if (!p) return { found: false, address, note: "MOCK: no aerial footprint for this address in the demo data set." };
  return { found: true, address, mock: true, ...p.footprint };
}

export type RoofFootprint = ReturnType<typeof getRoofFootprint>;
