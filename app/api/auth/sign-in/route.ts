import { z } from "zod";
import { passwordSignIn } from "../../../server/password-sign-in";
import { email, password } from "../../../server/auth-input";
import { body, checkOrigin, failure } from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await body(request, z.object({ email, password }).strict());
    return await passwordSignIn(input.email, input.password);
  } catch (error) {
    return failure(error);
  }
}
