import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../../server/aws";
import { account, setSession } from "../../../server/auth";
import { email, password } from "../../../server/auth-input";
import { authConfig } from "../../../server/config";
import { ApiError, body, checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email, password }).strict());
    const result = await identity().send(new InitiateAuthCommand({ ClientId: authConfig().clientId, AuthFlow: "USER_PASSWORD_AUTH", AuthParameters: { USERNAME: input.email, PASSWORD: input.password } }));
    if (!result.AuthenticationResult?.AccessToken) throw new ApiError(403, "Account requires an additional authentication step.");
    return setSession(json({ user: await account(result.AuthenticationResult.AccessToken) }), result.AuthenticationResult);
  } catch (error) { return failure(error); }
}
