import { UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { identity } from "../../server/aws";
import { account, accessToken, clearSession, requireUser } from "../../server/auth";
import { name, email } from "../../server/auth-input";
import { ApiError, body, checkOrigin, failure, json } from "../../server/http";
import { deleteOwnerAccount } from "../../server/delete-account";

export const maxDuration = 60;

export async function GET() {
  try { await requireUser(); return json({ user: await account(await accessToken()) }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    await requireUser();
    const input = await body(request, z.object({ name }).strict());
    const token = await accessToken();
    await identity().send(new UpdateUserAttributesCommand({ AccessToken: token, UserAttributes: [{ Name: "name", Value: input.name }] }));
    return json({ user: await account(token) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email }).strict());
    const user = await requireUser(true);
    const token = await accessToken();
    const current = await account(token);
    if (current.id !== user.sub || input.email !== current.email.toLowerCase()) throw new ApiError(400, "Email does not match your account.");
    await deleteOwnerAccount(user.sub, token);
    return clearSession(json({ deleted: true }));
  } catch (error) { return failure(error); }
}
