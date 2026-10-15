import "server-only";
import { Agent } from "node:https";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { region } from "./config";

let documentClient: DynamoDBDocumentClient | undefined;
let storageClient: S3Client | undefined;
let identityClient: CognitoIdentityProviderClient | undefined;
const requestHandler = { connectionTimeout: 5_000, requestTimeout: 15_000, throwOnRequestTimeout: true, httpsAgent: new Agent({ keepAlive: true, family: 4 }) };

export function database() {
  return documentClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({ region: region(), maxAttempts: 1, requestHandler }), { marshallOptions: { removeUndefinedValues: true } });
}
export function storage() { return storageClient ??= new S3Client({ region: region(), maxAttempts: 1, requestHandler }); }
export function identity() { return identityClient ??= new CognitoIdentityProviderClient({ region: region(), maxAttempts: 1, requestHandler }); }
