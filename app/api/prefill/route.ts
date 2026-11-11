import { NextResponse } from "next/server";
import { z } from "zod";
import { prefill } from "@/lib/agent/prefill";

export const maxDuration = 60;

const Body = z.object({
  address: z.string().trim().min(5, "Enter the street address first"),
  sections: z.array(z.object({ id: z.string(), name: z.string() })).max(20),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });
  }
  const result = await prefill(parsed.data);
  return NextResponse.json(result);
}
