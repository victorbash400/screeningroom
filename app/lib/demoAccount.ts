import { apiRequest, object } from "./accountApi";

export async function demoAccount() {
  const result = object(
    await apiRequest("/api/auth/demo", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  );
  if (
    typeof result.email !== "string" ||
    !result.email.trim() ||
    typeof result.password !== "string" ||
    !result.password
  )
    throw new Error("Demo credentials are invalid.");
  return { email: result.email, password: result.password };
}
