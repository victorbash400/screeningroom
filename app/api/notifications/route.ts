import { z } from "zod";
import { requireUser } from "../../server/auth";
import { body, checkOrigin, failure, json } from "../../server/http";
import { listRecords, updateNotification, notificationSchema, recordId } from "../../server/records";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const result = await listRecords(user.sub, "notification", new URL(request.url).searchParams.get("cursor") || undefined);
    return json({ notifications: result.records.map((item) => notificationSchema.parse(item.value)), cursor: result.cursor });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ id: recordId, trashed: z.boolean().optional() }).strict());
    return json({ notification: await updateNotification(user.sub, input.id, input.trashed) });
  } catch (error) { return failure(error); }
}
