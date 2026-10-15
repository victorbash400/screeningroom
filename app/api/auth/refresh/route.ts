import { cookies } from "next/headers";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { identity } from "../../../server/aws";
import { account, clearSession, refreshCookie, setSession } from "../../../server/auth";
import { authConfig } from "../../../server/config";
import { ApiError, checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const refresh = (await cookies()).get(refreshCookie)?.value;
    if (!refresh) throw new ApiError(401, "Sign in to continue.");
    const result = await identity().send(new InitiateAuthCommand({ ClientId: authConfig().clientId, AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: refresh } }));
    if (!result.AuthenticationResult?.AccessToken) throw new Error("Refresh returned no access token.");
    return setSession(json({ user: await account(result.AuthenticationResult.AccessToken) }), result.AuthenticationResult);
  } catch (error) {
    const response = failure(error);
    return response.status === 401 ? clearSession(response) : response;
  }
}
