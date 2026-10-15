import { ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../../server/aws";
import { email } from "../../../server/auth-input";
import { authConfig } from "../../../server/config";
import { body, checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email }).strict());
    await identity().send(new ResendConfirmationCodeCommand({ ClientId: authConfig().clientId, Username: input.email }));
    return json({ sent: true });
  } catch (error) { return failure(error); }
}
