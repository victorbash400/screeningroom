import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { FetchError, JwtBaseError, WaitPeriodNotYetEndedJwkError } from "aws-jwt-verify/error";
import { GetUserCommand, type AuthenticationResultType } from "@aws-sdk/client-cognito-identity-provider";
import { identity } from "./aws";
import { authConfig } from "./config";
import { ApiError } from "./http";
import { assertAccountActive } from "./account-state";

export const accessCookie = "screeningroom_access";
export const refreshCookie = "screeningroom_refresh";
export interface Account { id: string; email: string; name: string; emailVerified: boolean }

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;
export async function accessToken() {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) throw new ApiError(401, "Sign in to continue.");
  return token;
}

export async function requireUser(allowDeleting = false) {
  const config = authConfig();
  verifier ??= CognitoJwtVerifier.create({ userPoolId: config.poolId, tokenUse: "access", clientId: config.clientId });
  const token = await accessToken();
  let user;
  try { user = await verifier.verify(token); }
  catch (error) {
    if (error instanceof FetchError || error instanceof WaitPeriodNotYetEndedJwkError) throw error;
    if (error instanceof JwtBaseError) throw new ApiError(401, "Session expired. Sign in again.");
    throw error;
  }
  await identity().send(new GetUserCommand({ AccessToken: token }));
  if (!allowDeleting) await assertAccountActive(user.sub);
  return user;
}

export async function account(token: string): Promise<Account> {
  const result = await identity().send(new GetUserCommand({ AccessToken: token }));
  const attrs = Object.fromEntries((result.UserAttributes || []).map((item) => [item.Name, item.Value]));
  if (!attrs.sub || !attrs.email) throw new Error("Account attributes are missing.");
  return { id: attrs.sub, email: attrs.email, name: attrs.name || "", emailVerified: attrs.email_verified === "true" };
}

const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" });
export function setSession(response: NextResponse, result: AuthenticationResultType) {
  if (!result.AccessToken) throw new Error("Authentication returned no access token.");
  response.cookies.set(accessCookie, result.AccessToken, { ...cookieOptions(), maxAge: result.ExpiresIn || 3600 });
  if (result.RefreshToken) response.cookies.set(refreshCookie, result.RefreshToken, { ...cookieOptions(), maxAge: 7 * 86400 });
  return response;
}
export function clearSession(response: NextResponse) {
  for (const key of [accessCookie, refreshCookie]) response.cookies.set(key, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
