import { requireUser } from "../../../server/auth";
import { body, checkOrigin, failure, json } from "../../../server/http";
import { locationInterestSchema } from "../../../lib/locationInterest";
import { mapVenueSearch } from "../../../server/map-venues";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    const area = await body(request, locationInterestSchema);
    return json(await mapVenueSearch(area, request.signal));
  } catch (error) { return failure(error); }
}
