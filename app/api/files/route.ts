import { requireUser } from "../../server/auth";
import { downloadUrl } from "../../server/files";
import { recordId } from "../../server/records";
import { failure, json } from "../../server/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = recordId.parse(new URL(request.url).searchParams.get("id"));
    return json({ url: await downloadUrl(user.sub, id), expiresIn: 60, ownerId: user.sub });
  } catch (error) { return failure(error); }
}
