import "server-only";
import { Agent } from "node:https";
import { awsLookup } from "./aws-dns";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { authOperation } from "./auth-operation";
import { region } from "./config";

let documentClient: DynamoDBDocumentClient | undefined;
let storageClient: S3Client | undefined;
let identityClient: CognitoIdentityProviderClient | undefined;
const requestHandler = () => ({
  connectionTimeout: 10_000, requestTimeout: 15_000, throwOnRequestTimeout: true,
  httpsAgent: new Agent({ keepAlive: true, lookup: awsLookup, autoSelectFamily: true, autoSelectFamilyAttemptTimeout: 250 }),
});

export function database() {
  if (!documentClient) {
    const client = new DynamoDBClient({ region: region(), maxAttempts: 1, requestHandler: requestHandler() });
    client.middlewareStack.add((next) => async (args) => {
      try { return await next(args); }
      catch (error) {
        const request = args.request as { hostname?: string };
        console.error("DynamoDB request failed", JSON.stringify({ hostname: request.hostname, name: error instanceof Error ? error.name : "UnknownError" }));
        throw error;
      }
    }, { step: "finalizeRequest", name: "databaseConnectionDiagnostics" });
    documentClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }
  return documentClient;
}
export function storage() { return storageClient ??= new S3Client({ region: region(), maxAttempts: 1, requestHandler: requestHandler() }); }
export function identity() {
  if (!identityClient) {
    identityClient = new CognitoIdentityProviderClient({ region: region(), maxAttempts: 1, requestHandler: requestHandler() });
    identityClient.middlewareStack.add((next, context) => (args) => authOperation(`cognito:${context.commandName}`, () => next(args)), { step: "initialize", name: "authenticationDiagnostics" });
  }
  return identityClient;
}
