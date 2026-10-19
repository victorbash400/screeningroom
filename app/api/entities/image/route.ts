import { z } from "zod";
import { requireUser } from "../../../server/auth";
import { entityImage } from "../../../server/entity-image";
import { failure, json } from "../../../server/http";

export async function GET(request: Request) {
  try {
    await requireUser();
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const response = json(await entityImage(id, request.signal));
    response.headers.set("Cache-Control", "private, max-age=3600");
    return response;
  } catch (error) { return failure(error); }
}
