import { NextResponse } from "next/server";
import { AuthError, SetupRequiredError, requireSession } from "@/lib/auth";
import { weatherQuerySchema } from "@/lib/validation";
import { getWeather } from "@/lib/weather";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    await requireSession();
    const query = weatherQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return NextResponse.json({ ok: false, error: "Choose a valid location and temperature unit." }, { status: 400, headers });
    const result = await getWeather(query.data.lat, query.data.lon, query.data.unit);
    return NextResponse.json({ ok: true, ...result }, { headers });
  } catch (error) {
    const status = error instanceof AuthError ? 401 : error instanceof SetupRequiredError ? 503 : 502;
    return NextResponse.json({ ok: false, error: status === 401 ? "Sign in to see your weather." : status === 503 ? "Private studio setup is required." : "Weather is unavailable right now. Try again shortly." }, { status, headers });
  }
}
