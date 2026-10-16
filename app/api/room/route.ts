import { z } from "zod";
import { requireUser } from "../../server/auth";
import { body, checkOrigin, failure, json } from "../../server/http";
import { loadRoom, saveRoom } from "../../server/room";

export async function GET() {
  try { const user = await requireUser(); return json(await loadRoom(user.sub)); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const input = await body(request, z.object({ fileId: z.string().uuid(), revision: z.number().int().nonnegative(), imports: z.array(z.string()), mutationId: z.string().uuid() }).strict());
    return json(await saveRoom(user.sub, input.fileId, input.revision, input.imports, input.mutationId));
  } catch (error) { return failure(error); }
}
