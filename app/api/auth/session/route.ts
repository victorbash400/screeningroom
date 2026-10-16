import { cookies } from "next/headers";
import {
  accessCookie,
  accessToken,
  account,
  refreshCookie,
  requireUser,
} from "../../../server/auth";
import { ApiError, failure, json } from "../../../server/http";

export async function GET() {
  try {
    const jar = await cookies();
    if (!jar.get(accessCookie)?.value) {
      if (jar.get(refreshCookie)?.value)
        throw new ApiError(401, "Session needs refresh.");
      return json({ user: null });
    }
    const user = await requireUser();
    return json({
      user: await account(await accessToken()),
      expiresAt: user.exp * 1000,
    });
  } catch (error) {
    return failure(error);
  }
}
