import { z } from "zod";
import { requireUser } from "../../../server/auth";
import { failure, json } from "../../../server/http";
import { searchPlaces } from "../../../server/search-places";

export async function GET(request: Request) {
  try {
    await requireUser();
    const query = z.string().trim().min(1).max(200).parse(new URL(request.url).searchParams.get("q"));
    return json({ places: await searchPlaces(query, request.signal) });
  } catch (error) { return failure(error); }
}
