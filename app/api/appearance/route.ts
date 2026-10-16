import { z } from "zod";
import { requireUser } from "../../server/auth";
import { ApiError, body, checkOrigin, failure, json } from "../../server/http";
import { getRecord, putRecord } from "../../server/records";
import { defaultAppearance, parseAppearance } from "../../lib/appearance";
const id = "00000000-0000-4000-8000-000000000002";
export async function GET() {
  try {
    const user = await requireUser();
    const record = await getRecord(user.sub, "project", id);
    return json({ value: record?.value ?? defaultAppearance, revision: record?.version ?? 0 });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ value: z.json(), revision: z.number().int().nonnegative() }).strict());
    let value;
    try { value = parseAppearance(JSON.stringify(input.value)); }
    catch { throw new ApiError(400, "Appearance is invalid."); }
    const record = await putRecord(user.sub, "project", id, value, input.revision);
    return json({ value, revision: record.version });
  } catch (error) { return failure(error); }
}
