import { z } from "zod";
import {
  ApiError,
  body,
  checkOrigin,
  failure,
  json,
} from "../../../server/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await body(request, z.object({}).strict());
    const email = process.env.DEMO_ACCOUNT_EMAIL;
    const password = process.env.DEMO_ACCOUNT_PASSWORD;
    if (!email || !password)
      throw new ApiError(503, "Demo account is not configured.");
    return json({ email, password });
  } catch (error) {
    return failure(error);
  }
}
