"""Write development runtime credentials after the AWS foundation stack is ready."""
import argparse
import json
import os
import subprocess
from pathlib import Path


def aws(profile, region, *args):
    result = subprocess.run(["aws", *args, "--profile", profile, "--region", region, "--output", "json"], capture_output=True, text=True, check=True)
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", required=True)
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--stack", default="screeningroom-dev-foundation")
    args = parser.parse_args()
    stack = aws(args.profile, args.region, "cloudformation", "describe-stacks", "--stack-name", args.stack)["Stacks"][0]
    if stack["StackStatus"] not in ["CREATE_COMPLETE", "UPDATE_COMPLETE", "IMPORT_COMPLETE"]:
        raise SystemExit("Stack is not ready: " + stack["StackStatus"])
    output = {item["OutputKey"]: item["OutputValue"] for item in stack["Outputs"]}
    if output["RuntimeUserName"] != "screeningroom-dev-runtime":
        raise SystemExit("Unexpected runtime identity.")
    target = Path(__file__).resolve().parents[1] / ".env.local"
    old = target.read_text() if target.exists() else ""
    existing = dict(line.partition("=")[::2] for line in old.splitlines() if line and not line.startswith("#") and "=" in line)
    keys = aws(args.profile, args.region, "iam", "list-access-keys", "--user-name", output["RuntimeUserName"])["AccessKeyMetadata"]
    match = next((item for item in keys if item["AccessKeyId"] == existing.get("AWS_ACCESS_KEY_ID")), None)
    if match:
        if match["Status"] != "Active" or not existing.get("AWS_SECRET_ACCESS_KEY"):
            raise SystemExit("Existing runtime key is inactive or incomplete.")
        key = {"AccessKeyId": existing["AWS_ACCESS_KEY_ID"], "SecretAccessKey": existing["AWS_SECRET_ACCESS_KEY"]}
    else:
        if keys:
            raise SystemExit("Runtime already has a key. Restore its local secret before configuring; no key was replaced.")
        key = aws(args.profile, args.region, "iam", "create-access-key", "--user-name", output["RuntimeUserName"])["AccessKey"]
    values = {
        "AWS_ACCESS_KEY_ID": key["AccessKeyId"], "AWS_SECRET_ACCESS_KEY": key["SecretAccessKey"],
        "AWS_REGION": args.region, "AWS_DEFAULT_REGION": args.region,
        "DYNAMODB_TABLE_NAME": output["TableName"], "S3_BUCKET_NAME": output["BucketName"],
        "COGNITO_USER_POOL_ID": output["UserPoolId"], "COGNITO_CLIENT_ID": output["UserPoolClientId"],
        "BEDROCK_PROJECT_ID": output["BedrockProjectId"], "BEDROCK_MODEL_ID": "zai.glm-5",
        "BEDROCK_BASE_URL": "https://bedrock-mantle." + args.region + ".api.aws/v1",
        "APP_ORIGIN": existing.get("APP_ORIGIN", "http://localhost:3000"),
    }
    removed = set(values) | {"AWS_PROFILE", "AWS_SESSION_TOKEN"}
    preserved = [line for line in old.splitlines() if line.partition("=")[0] not in removed]
    content = "\n".join(preserved + [name + "=" + value for name, value in values.items()]) + "\n"
    temporary = target.with_suffix(".local.tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as file:
        file.write(content)
    temporary.chmod(0o600)
    temporary.replace(target)
    print("Configured Screening Room runtime in .env.local (0600). Secret values withheld.")


if __name__ == "__main__":
    main()
