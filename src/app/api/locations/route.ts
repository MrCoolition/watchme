import { NextResponse } from "next/server";
import { AuthError, SetupRequiredError, requireSession } from "@/lib/auth";
import { locationQuerySchema } from "@/lib/validation";
import { searchLocations } from "@/lib/weather";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    await requireSession();
    const query = locationQuerySchema.safeParse(new URL(request.url).searchParams.get("q"));
    if (!query.success) return NextResponse.json({ ok: false, error: "Enter a city name between 2 and 80 characters." }, { status: 400, headers });
    return NextResponse.json({ ok: true, data: await searchLocations(query.data) }, { headers });
  } catch (error) {
    const status = error instanceof AuthError ? 401 : error instanceof SetupRequiredError ? 503 : 502;
    return NextResponse.json({ ok: false, error: status === 401 ? "Sign in to search locations." : status === 503 ? "Private studio setup is required." : "Location search is unavailable. Try again shortly." }, { status, headers });
  }
}
