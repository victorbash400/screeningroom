import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../../server/aws";
import { email, code } from "../../../server/auth-input";
import { authConfig } from "../../../server/config";
import { body, checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email, code }).strict());
    await identity().send(new ConfirmSignUpCommand({ ClientId: authConfig().clientId, Username: input.email, ConfirmationCode: input.code }));
    return json({ confirmed: true });
  } catch (error) { return failure(error); }
}
