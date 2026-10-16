import { cookies } from "next/headers";
import {
  accessCookie,
  refreshCookie,
  requireSession,
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
    const { user, account } = await requireSession();
    return json({
      user: account,
      expiresAt: user.exp * 1000,
    });
  } catch (error) {
    return failure(error);
  }
}
