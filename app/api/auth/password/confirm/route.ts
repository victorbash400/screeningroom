import { ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../../../server/aws";
import { email, code, password } from "../../../../server/auth-input";
import { authConfig } from "../../../../server/config";
import { body, checkOrigin, failure, json } from "../../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email, code, password: password.min(12) }).strict());
    await identity().send(new ConfirmForgotPasswordCommand({ ClientId: authConfig().clientId, Username: input.email, ConfirmationCode: input.code, Password: input.password }));
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
