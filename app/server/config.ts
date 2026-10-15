import "server-only";

export function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function region() { return env("AWS_REGION"); }

export function authConfig() {
  return { region: region(), poolId: env("COGNITO_USER_POOL_ID"), clientId: env("COGNITO_CLIENT_ID") };
}
