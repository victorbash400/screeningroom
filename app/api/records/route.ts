import { z } from "zod";
import { requireUser } from "../../server/auth";
import { body, checkOrigin, failure, json } from "../../server/http";
import { deleteRecord, listRecords, putRecord, recordId, recordKind } from "../../server/records";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const kind = recordKind.exclude(["notification"]).parse(params.get("kind"));
    return json(await listRecords(user.sub, kind, params.get("cursor") || undefined));
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ id: recordId, kind: recordKind.exclude(["notification"]), value: z.json(), expectedVersion: z.number().int().min(0) }).strict());
    return json({ record: await putRecord(user.sub, input.kind, input.id, input.value, input.expectedVersion) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ id: recordId, kind: recordKind.exclude(["notification"]), version: z.number().int().positive() }).strict());
    await deleteRecord(user.sub, input.kind, input.id, input.version);
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
