import { cookies } from "next/headers";
import { RevokeTokenCommand } from "@aws-sdk/client-cognito-identity-provider";
import { identity } from "../../../server/aws";
import { clearSession, refreshCookie } from "../../../server/auth";
import { authConfig } from "../../../server/config";
import { checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const refresh = (await cookies()).get(refreshCookie)?.value;
    if (refresh) await identity().send(new RevokeTokenCommand({ ClientId: authConfig().clientId, Token: refresh }));
    return clearSession(json({ ok: true }));
  } catch (error) { return failure(error); }
}
