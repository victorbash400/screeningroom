import { z } from "zod";
import { requireUser } from "../../../server/auth";
import { body, checkOrigin, failure, json } from "../../../server/http";
import { getRecord, putRecord } from "../../../server/records";
import { mapHomeSchema } from "../../../lib/mapHome";

const id = "00000000-0000-4000-8000-000000000003";
export async function GET() {
  try {
    const user = await requireUser();
    const record = await getRecord(user.sub, "project", id);
    return json({ home: record ? mapHomeSchema.parse(record.value) : null, revision: record?.version ?? 0 });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ home: mapHomeSchema, revision: z.number().int().nonnegative() }).strict());
    const record = await putRecord(user.sub, "project", id, input.home, input.revision);
    return json({ home: input.home, revision: record.version });
  } catch (error) { return failure(error); }
}
