import { requireUser } from "../../../server/auth";
import { body, checkOrigin, failure, json } from "../../../server/http";
import { populationWidgetSchema } from "../../../lib/audienceWidget";
import { populationResult } from "../../../server/population";

export async function POST(request: Request) {
  try {
    checkOrigin(request); await requireUser();
    const widget = await body(request, populationWidgetSchema);
    return json(await populationResult(widget, request.signal));
  } catch (error) { return failure(error); }
}
