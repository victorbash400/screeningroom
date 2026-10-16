import "server-only";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { identity } from "./aws";
import { account, setSession } from "./auth";
import { authConfig } from "./config";
import { ApiError, json } from "./http";

export async function passwordSignIn(email: string, password: string) {
  const result = await identity().send(
    new InitiateAuthCommand({
      ClientId: authConfig().clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  if (!result.AuthenticationResult?.AccessToken)
    throw new ApiError(
      403,
      "Account requires an additional authentication step.",
    );
  return setSession(
    json({
      user: await account(result.AuthenticationResult.AccessToken),
      expiresAt:
        Date.now() + (result.AuthenticationResult.ExpiresIn || 3600) * 1000,
    }),
    result.AuthenticationResult,
  );
}
