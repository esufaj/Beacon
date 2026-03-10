import { NextResponse } from "next/server";
import {
  getLocationFromRedis,
  getAllLocationsFromRedis,
} from "@/lib/cache/location-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (query) {
    const location = await getLocationFromRedis(query);
    if (!location) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(location);
  }

  const all = await getAllLocationsFromRedis();
  return NextResponse.json(all);
}
