"""Verify account deletion's guards using only isolated disposable fixtures."""
import argparse
import http.cookiejar
import json
import secrets
import subprocess
import tempfile
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", required=True)
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--allow-delete", action="store_true", help="Exercise successful deletion of the disposable account after scoped permissions are approved")
    args = parser.parse_args()
    values = dict(line.partition("=")[::2] for line in (Path(__file__).resolve().parents[1] / ".env.local").read_text().splitlines() if line and not line.startswith("#") and "=" in line)
    assert values["DYNAMODB_TABLE_NAME"] == "ScreeningRoom-dev"
    pool, table, bucket = (values[key] for key in ["COGNITO_USER_POOL_ID", "DYNAMODB_TABLE_NAME", "S3_BUCKET_NAME"])

    def aws(service, action, payload, missing=False):
        with tempfile.NamedTemporaryFile(mode="w", prefix="screeningroom-deletion-test-", suffix=".json") as file:
            json.dump(payload, file)
            file.flush()
            result = subprocess.run(["aws", service, action, "--cli-input-json", "file://" + file.name, "--profile", args.profile, "--region", values["AWS_REGION"], "--output", "json"], text=True, capture_output=True)
        if missing and "UserNotFoundException" in result.stderr:
            return None
        if result.returncode:
            raise RuntimeError("Fixture operation failed: " + action + " " + result.stderr)
        return json.loads(result.stdout) if result.stdout.strip() else {}

    def client():
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

        def request(path, method="GET", body=None, status=200, origin=None):
            req = urllib.request.Request(args.url + path, method=method, data=json.dumps(body).encode() if body else None, headers={"Content-Type": "application/json", "Origin": origin or args.url})
            try:
                response = opener.open(req, timeout=70)
            except urllib.error.HTTPError as error:
                response = error
            data = json.loads(response.read())
            assert response.status == status, (response.status, data)
            return data
        return request

    fixtures = []
    try:
        for _ in range(2):
            email = "screeningroom-delete-verify-" + uuid.uuid4().hex + "@example.com"
            password = "Aa9" + secrets.token_urlsafe(24)
            result = aws("cognito-idp", "admin-create-user", {"UserPoolId": pool, "Username": email, "MessageAction": "SUPPRESS", "UserAttributes": [{"Name": "email", "Value": email}, {"Name": "email_verified", "Value": "true"}, {"Name": "name", "Value": "Deletion verification"}]})
            user = {"email": email, "username": result["User"]["Username"], "id": next(item["Value"] for item in result["User"]["Attributes"] if item["Name"] == "sub"), "recordId": str(uuid.uuid4())}
            fixtures.append(user)
            aws("cognito-idp", "admin-set-user-password", {"UserPoolId": pool, "Username": user["username"], "Password": password, "Permanent": True})
            user["request"] = client()
            user["request"]("/api/auth/sign-in", "POST", {"email": email, "password": password})
            aws("dynamodb", "put-item", {"TableName": table, "Item": {"pk": {"S": "USER#" + user["id"]}, "sk": {"S": "workspace#" + user["recordId"]}, "value": {"M": {"name": {"S": "Deletion verification"}}}, "version": {"N": "1"}}})
            user["fileId"] = str(uuid.uuid4())
            user["fileKey"] = "users/" + user["id"] + "/files/" + user["fileId"]
            # Multiple versions and a delete marker exercise permanent version cleanup.
            for _ in range(2):
                aws("s3api", "put-object", {"Bucket": bucket, "Key": user["fileKey"]})
            aws("s3api", "delete-object", {"Bucket": bucket, "Key": user["fileKey"]})

        owner, other = fixtures
        request = owner["request"]
        request("/api/account", "DELETE", {"email": other["email"]}, 400)
        request("/api/account", "DELETE", {"email": owner["email"], "userId": other["id"]}, 400)
        request("/api/account", "DELETE", {"email": owner["email"]}, 403, "https://untrusted.example")
        assert len(request("/api/records?kind=workspace")["records"]) == 1
        print("PASS wrong-email, client-supplied owner and Origin rejection; owner data preserved", flush=True)

        if args.allow_delete:
            state_key = {"pk": {"S": "ACCOUNT#" + owner["id"]}, "sk": {"S": "state"}}
            aws("dynamodb", "put-item", {"TableName": table, "Item": {**state_key, "uploads": {"N": "1"}}})
            request("/api/account", "DELETE", {"email": owner["email"]}, 409)
            assert request("/api/account")["user"]["id"] == owner["id"]
            aws("dynamodb", "put-item", {"TableName": table, "Item": {**state_key, "state": {"S": "deleting"}, "uploads": {"N": "0"}}})
            request("/api/records", "PUT", {"id": str(uuid.uuid4()), "kind": "workspace", "value": {}, "expectedVersion": 0}, 409)
            assert request("/api/account", "DELETE", {"email": owner["email"].upper()}) == {"deleted": True}
            assert request("/api/auth/session")["user"] is None
            assert aws("cognito-idp", "admin-get-user", {"UserPoolId": pool, "Username": owner["username"]}, missing=True) is None
            assert not aws("dynamodb", "query", {"TableName": table, "KeyConditionExpression": "pk = :pk", "ExpressionAttributeValues": {":pk": {"S": "USER#" + owner["id"]}}}).get("Items")
            versions = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": "users/" + owner["id"] + "/"})
            assert not versions.get("Versions") and not versions.get("DeleteMarkers")
            print("PASS upload guard, retry from deletion state, case-insensitive confirmation, permanent owner cleanup and cookie/session removal", flush=True)
        else:
            result = request("/api/account", "DELETE", {"email": owner["email"].upper()}, 503)
            assert "version-cleanup permissions" in result["error"]
            assert request("/api/auth/session")["user"]["id"] == owner["id"]
            assert len(request("/api/records?kind=workspace")["records"]) == 1
            versions = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": owner["fileKey"]})
            assert len(versions["Versions"]) == 2 and len(versions["DeleteMarkers"]) == 1
            print("PASS permissions preflight fails before deleting records, storage versions, identity or session", flush=True)

        assert len(other["request"]("/api/records?kind=workspace")["records"]) == 1
        assert other["request"]("/api/account")["user"]["id"] == other["id"]
        versions = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": other["fileKey"]})
        assert len(versions["Versions"]) == 2 and len(versions["DeleteMarkers"]) == 1
        print("PASS other-user identity, records and S3 versions preserved", flush=True)
    finally:
        for user in fixtures:
            for partition in ["USER#" + user["id"], "ACCOUNT#" + user["id"]]:
                page = aws("dynamodb", "query", {"TableName": table, "KeyConditionExpression": "pk = :pk", "ExpressionAttributeValues": {":pk": {"S": partition}}, "ProjectionExpression": "pk, sk"})
                for item in page.get("Items", []):
                    aws("dynamodb", "delete-item", {"TableName": table, "Key": item})
            if "fileKey" in user:
                page = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": user["fileKey"]})
                for item in page.get("Versions", []) + page.get("DeleteMarkers", []):
                    if item["Key"] == user["fileKey"]:
                        aws("s3api", "delete-object", {"Bucket": bucket, "Key": item["Key"], "VersionId": item["VersionId"]})
            aws("cognito-idp", "admin-delete-user", {"UserPoolId": pool, "Username": user["username"]}, missing=True)
        print("Disposable deletion-verification fixtures cleaned; other application data unchanged.", flush=True)


if __name__ == "__main__":
    main()
