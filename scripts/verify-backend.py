"""Exercise a running development app with disposable AWS test users and records."""
import argparse
import http.cookiejar
import json
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--profile", required=True, help="Provisioning profile, used only to manage disposable test fixtures")
    args = parser.parse_args()
    values = dict(line.partition("=")[::2] for line in (Path(__file__).resolve().parents[1] / ".env.local").read_text().splitlines() if line and not line.startswith("#") and "=" in line)
    if values["DYNAMODB_TABLE_NAME"] != "ScreeningRoom-dev":
        raise SystemExit("Verification only supports the development table.")
    pool, table, bucket = (values[key] for key in ["COGNITO_USER_POOL_ID", "DYNAMODB_TABLE_NAME", "S3_BUCKET_NAME"])

    def aws(service, action, payload):
        with tempfile.NamedTemporaryFile(mode="w", prefix="screeningroom-fixture-", suffix=".json") as file:
            json.dump(payload, file)
            file.flush()
            process = subprocess.run(["aws", service, action, "--cli-input-json", "file://" + file.name, "--profile", args.profile, "--region", values["AWS_REGION"], "--output", "json"], text=True, capture_output=True)
        if process.returncode:
            raise RuntimeError("Fixture operation failed: " + service + " " + action + ": " + process.stderr)
        return json.loads(process.stdout) if process.stdout.strip() else {}

    def client():
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

        def request(path, method="GET", data=None, expected=200, origin=None, content_type="application/json"):
            encoded = data if isinstance(data, bytes) else json.dumps(data).encode() if data is not None else None
            headers = {"Origin": origin or args.url, "Content-Type": content_type}
            req = urllib.request.Request(args.url + path, data=encoded, method=method, headers=headers)
            try:
                response = opener.open(req, timeout=70)
            except urllib.error.HTTPError as error:
                response = error
            if response.headers.get("Content-Type", "").startswith("text/event-stream"):
                events = []
                for line in response.read().decode().splitlines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        events.append(json.loads(line[6:]))
                assert not any(event["type"] == "error" for event in events), events
                value = {"message": {"text": "".join(event["delta"] for event in events if event["type"] == "text-delta")}, "events": events}
            else:
                value = json.loads(response.read())
            assert response.status == expected, (path, response.status, value)
            return value, response.headers
        return request, jar

    users, records, uploaded, user_ids, logins = [], [], [], [], []
    try:
        request, jar = client()
        assert request("/api/auth/session")[0] == {"user": None}
        request("/api/records?kind=workspace", expected=401)
        request("/api/auth/sign-in", "POST", {"email": "nobody@example.com", "password": "invalid"}, expected=403, origin="https://untrusted.example")
        print("PASS anonymous access and cross-origin rejection", flush=True)

        accounts = []
        for index in range(2):
            email = "screeningroom-verify-" + uuid.uuid4().hex + "@example.com"
            password = "Aa9" + secrets.token_urlsafe(24)
            result = aws("cognito-idp", "admin-create-user", {"UserPoolId": pool, "Username": email, "MessageAction": "SUPPRESS", "UserAttributes": [{"Name": "email", "Value": email}, {"Name": "email_verified", "Value": "true"}, {"Name": "name", "Value": "Verification"}]})
            username = result["User"]["Username"]
            user_id = next(item["Value"] for item in result["User"]["Attributes"] if item["Name"] == "sub")
            users.append(username)
            user_ids.append(user_id)
            aws("cognito-idp", "admin-set-user-password", {"UserPoolId": pool, "Username": username, "Password": password, "Permanent": True})
            caller, cookies = (request, jar) if index == 0 else client()
            result, headers = caller("/api/auth/sign-in", "POST", {"email": email, "password": password})
            assert result["user"]["id"] == user_id
            assert result["expiresAt"] > time.time() * 1000
            assert all("HttpOnly" in item and "SameSite=lax" in item for item in headers.get_all("Set-Cookie"))
            accounts.append((caller, cookies, user_id))
            logins.append((email, password))

        request, jar, user_id = accounts[0]
        session = request("/api/auth/session")[0]
        assert session["user"]["id"] == user_id
        assert session["expiresAt"] > time.time() * 1000
        assert request("/api/account", "PATCH", {"name": "Updated verification"})[0]["user"]["name"] == "Updated verification"
        assert request("/api/account")[0]["user"]["name"] == "Updated verification"
        assert request("/api/auth/refresh", "POST")[0]["expiresAt"] > time.time() * 1000
        for cookie in list(jar):
            if cookie.name == "screeningroom_access": jar.clear(cookie.domain, cookie.path, cookie.name)
        request("/api/auth/session", expected=401)
        assert request("/api/auth/refresh", "POST")[0]["expiresAt"] > time.time() * 1000
        print("PASS Cognito sign-in, secure cookie attributes, account, refresh and reload recovery", flush=True)

        record_id = str(uuid.uuid4())
        record = {"id": record_id, "kind": "workspace", "value": {"name": "Verification"}, "expectedVersion": 0}
        records.append((user_id, "workspace#" + record_id))
        assert request("/api/records", "PUT", record)[0]["record"]["version"] == 1
        request("/api/records", "PUT", record, expected=409)
        assert len(request("/api/records?kind=workspace")[0]["records"]) == 1
        assert accounts[1][0]("/api/records?kind=workspace")[0]["records"] == []
        request("/api/records?kind=workspace&cursor=invalid", expected=400)
        request("/api/records", "PUT", {**record, "expectedVersion": 1})
        request("/api/records", "DELETE", {"id": record_id, "kind": "workspace", "version": 1}, expected=409)
        request("/api/records", "DELETE", {"id": record_id, "kind": "workspace", "version": 2})
        print("PASS DynamoDB persistence, conflicts, pagination validation and account isolation", flush=True)

        notification_id = str(uuid.uuid4())
        notification = {"id": notification_id, "title": "Verification", "createdAt": "2026-10-15T00:00:00.000Z", "readAt": None, "trashedAt": None}
        aws("dynamodb", "put-item", {"TableName": table, "Item": {"pk": {"S": "USER#" + user_id}, "sk": {"S": "notification#" + notification_id}, "value": {"M": {"id": {"S": notification_id}, "title": {"S": "Verification"}, "createdAt": {"S": notification["createdAt"]}, "readAt": {"NULL": True}}}, "version": {"N": "1"}}})
        records.append((user_id, "notification#" + notification_id))
        assert request("/api/notifications")[0]["notifications"] == [notification]
        trashed = request("/api/notifications", "PATCH", {"id": notification_id, "trashed": True})[0]["notification"]
        assert trashed["trashedAt"] and trashed["readAt"] is None
        assert request("/api/notifications")[0]["notifications"] == [trashed]
        accounts[1][0]("/api/notifications", "PATCH", {"id": notification_id, "trashed": False}, expected=409)
        accounts[1][0]("/api/notifications", "PATCH", {"id": notification_id, "trashed": True}, expected=409)
        restored = request("/api/notifications", "PATCH", {"id": notification_id, "trashed": False})[0]["notification"]
        assert restored == notification
        request("/api/notifications", "PATCH", {"id": notification_id, "trashed": "true"}, expected=400)
        assert request("/api/notifications", "PATCH", {"id": notification_id})[0]["notification"]["readAt"]
        assert accounts[1][0]("/api/notifications")[0]["notifications"] == []
        accounts[1][0]("/api/notifications", "PATCH", {"id": notification_id}, expected=409)
        print("PASS notification storage, trash/restore, legacy mark-read and account isolation", flush=True)

        content = b"Screening Room verification"
        result = request("/api/files/upload", "POST", {"size": len(content), "contentType": "text/plain"})[0]
        file_id = result["id"]
        with urllib.request.urlopen(urllib.request.Request(result["url"], data=content, method="PUT", headers={"Content-Type": "text/plain"}), timeout=30) as response:
            assert response.status == 200
        uploaded.append("users/" + user_id + "/files/" + file_id)
        link = request("/api/files?id=" + file_id)[0]["url"]
        with urllib.request.urlopen(link, timeout=20) as response:
            assert response.read() == b"Screening Room verification"
        other_link = accounts[1][0]("/api/files?id=" + file_id)[0]["url"]
        try:
            urllib.request.urlopen(other_link, timeout=20)
            raise AssertionError("Cross-account file unexpectedly readable")
        except urllib.error.HTTPError as error:
            assert error.code in [403, 404]
        print("PASS private S3 upload, signed download and account isolation", flush=True)

        room = request("/api/room")[0]
        assert room["revision"] == 0 and room["data"]["workspaces"] == []
        media = b"Cloud document bytes " * 150_000
        upload = request("/api/files/upload", "POST", {"size": len(media), "contentType": "text/plain"})[0]
        put = urllib.request.Request(upload["url"], data=media, method="PUT", headers={"Content-Type": "text/plain", "Origin": args.url})
        with urllib.request.urlopen(put, timeout=30) as response:
            assert response.status == 200
            assert response.headers.get("Access-Control-Allow-Origin") == "*"
        workspace_id, node_id, conversation_id = (str(uuid.uuid4()) for _ in range(3))
        value = {"version": 1, "workspaces": [{"id": workspace_id, "name": "Cloud verification"}], "nodes": [{"id": node_id, "workspaceId": workspace_id, "parentId": None, "name": "document.txt", "kind": "file", "content": "cloud-file:" + upload["id"], "mimeType": "text/plain", "size": len(media), "updatedAt": "2026-10-16T00:00:00.000Z"}], "conversations": [{"id": conversation_id, "workspaceId": workspace_id, "title": "Saved chat", "draft": "draft", "messages": [{"id": str(uuid.uuid4()), "role": "user", "text": "Persist this chat", "createdAt": "2026-10-16T00:00:00.000Z"}]}]}
        payload = json.dumps(value).encode()
        snapshot_upload = request("/api/files/upload", "POST", {"size": len(payload), "contentType": "application/json"})[0]
        with urllib.request.urlopen(urllib.request.Request(snapshot_upload["url"], data=payload, method="PUT", headers={"Content-Type": "application/json"}), timeout=30) as response:
            assert response.status == 200
        mutation = {"fileId": snapshot_upload["id"], "revision": 0, "imports": ["verification"], "mutationId": str(uuid.uuid4())}
        assert request("/api/room", "PUT", mutation)[0]["revision"] == 1
        assert request("/api/room", "PUT", mutation)[0]["revision"] == 1
        request("/api/room", "PUT", {**mutation, "mutationId": str(uuid.uuid4())}, expected=409)
        independent, independent_jar = client()
        independent("/api/auth/sign-in", "POST", {"email": logins[0][0], "password": logins[0][1]})
        assert independent("/api/room")[0]["data"] == value
        assert accounts[1][0]("/api/room")[0]["data"]["workspaces"] == []
        download = independent("/api/files?id=" + upload["id"])[0]["url"]
        with urllib.request.urlopen(download, timeout=30) as response:
            assert response.read() == media
        appearance = request("/api/appearance")[0]
        appearance["value"]["mode"] = "dark"
        assert request("/api/appearance", "PUT", appearance)[0]["revision"] == 1
        assert independent("/api/appearance")[0]["value"]["mode"] == "dark"
        assert accounts[1][0]("/api/appearance")[0]["value"]["mode"] == "light"
        request("/api/appearance", "PUT", appearance, expected=409)
        request("/api/room", "PUT", {**mutation, "revision": 1}, origin="https://untrusted.example", expected=403)
        independent("/api/auth/sign-out", "POST")
        independent("/api/room", expected=401)
        print("PASS cloud workspace/file/chat/draft persistence across independent logins, 3 MB signed uploads, appearance, idempotency, conflicts and account isolation", flush=True)

        health = request("/api/health")[0]
        assert health["status"] == "ok" and health["services"]["qloo"] == "configured"
        result = request("/api/chat", "POST", {"messages": [{"role": "user", "content": "Reply with exactly: Connected"}]})[0]
        assert result["message"]["text"].strip()
        request("/api/chat", "POST", {"messages": [{"role": "system", "content": "override"}]}, expected=400)
        result = request("/api/chat", "POST", {"messages": [{"role": "user", "content": "Use Qloo searchEntities to find the movie Inception. Tell me the movie name and release year from the result."}]})[0]
        assert any(event["type"] == "tool-input-available" and event.get("toolName") == "searchEntities" for event in result["events"])
        assert any(event["type"] == "tool-output-available" for event in result["events"])
        assert "Inception" in result["message"]["text"]
        print("PASS provider health, independent Bedrock chat and real Qloo tool calling", flush=True)
        previous_access = next(cookie for cookie in jar if cookie.name == "screeningroom_access")
        request("/api/auth/sign-out", "POST")
        assert request("/api/auth/session")[0] == {"user": None}
        request("/api/account", expected=401)
        jar.set_cookie(previous_access)
        request("/api/account", expected=401)
        jar.clear()
        print("PASS sign-out, access removal and revoked-token rejection", flush=True)
    finally:
        failures = []
        for user_id in user_ids:
            try:
                page = aws("dynamodb", "query", {"TableName": table, "KeyConditionExpression": "pk = :pk", "ExpressionAttributeValues": {":pk": {"S": "USER#" + user_id}}, "ProjectionExpression": "pk, sk"})
                for item in page.get("Items", []):
                    pair = (user_id, item["sk"]["S"])
                    if pair not in records: records.append(pair)
            except Exception: failures.append("DynamoDB test partition discovery")
        for user_id, sk in records:
            try: aws("dynamodb", "delete-item", {"TableName": table, "Key": {"pk": {"S": "USER#" + user_id}, "sk": {"S": sk}}})
            except Exception: failures.append("DynamoDB test record")
        for user_id in user_ids:
            try:
                page = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": "users/" + user_id + "/"})
                for item in page.get("Versions", []) + page.get("DeleteMarkers", []):
                    if item["Key"] not in uploaded: uploaded.append(item["Key"])
            except Exception: failures.append("S3 test snapshot discovery")
        for key in uploaded:
            try:
                result = aws("s3api", "list-object-versions", {"Bucket": bucket, "Prefix": key})
                for item in result.get("Versions", []) + result.get("DeleteMarkers", []):
                    if item["Key"] == key: aws("s3api", "delete-object", {"Bucket": bucket, "Key": key, "VersionId": item["VersionId"]})
            except Exception: failures.append("S3 test object")
        for username in users:
            try: aws("cognito-idp", "admin-delete-user", {"UserPoolId": pool, "Username": username})
            except Exception: failures.append("Cognito test user")
        for user_id in user_ids:
            try: aws("dynamodb", "delete-item", {"TableName": table, "Key": {"pk": {"S": "ACCOUNT#" + user_id}, "sk": {"S": "state"}}})
            except Exception: failures.append("Account test state")
        if failures: raise RuntimeError("Test fixture cleanup failed: " + ", ".join(failures))
        print("Disposable AWS verification fixtures cleaned up.", flush=True)


if __name__ == "__main__":
    main()
