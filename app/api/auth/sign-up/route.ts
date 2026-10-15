import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../../server/aws";
import { email, password, name } from "../../../server/auth-input";
import { authConfig } from "../../../server/config";
import { body, checkOrigin, failure, json } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email, password: password.min(12), name }).strict());
    const result = await identity().send(new SignUpCommand({ ClientId: authConfig().clientId, Username: input.email, Password: input.password, UserAttributes: [{ Name: "email", Value: input.email }, { Name: "name", Value: input.name }] }));
    return json({ confirmationRequired: !result.UserConfirmed });
  } catch (error) { return failure(error); }
}
