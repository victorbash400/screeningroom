# screeningroom

Next.js application with an independent AWS development backend. UI workspaces,
files and conversations currently remain in browser storage; the cloud endpoints
are ready for an explicit migration rather than silently replacing local data.

Import accepts files, folders, and HTTP(S) links. Larger files use IndexedDB blob
storage; workspace metadata and conversations remain in localStorage. Audio/video
use compact playback controls, PDFs use PDF.js, and YouTube links embed the provider
player. Preview includes Open with for the browser or download. Remote media must
support browser playback; remote PDFs must permit cross-origin requests. Other
links open through their original website. Native desktop integrations are omitted.

## Development

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000.

## AWS development foundation

Region: `us-east-1`. Stack: `screeningroom-dev-foundation`.
The stack uses the existing AWS account, with resources dedicated to Screening Room:

- `ScreeningRoom-dev`: on-demand DynamoDB table with encryption, point-in-time recovery,
  a TTL field for future expiring data, deletion protection, and `pk`/`sk` keys.
- `screeningroom-dev-290074911463-us-east-1`: private, encrypted, versioned S3 bucket.
  Public access is blocked and the bucket policy requires TLS.
- A separate Cognito user pool and app client: email confirmation, password reset,
  12-character passwords with uppercase/lowercase/number, one-hour access tokens,
  seven-day refresh tokens, and token revocation.
- `ScreeningRoom-Development`: a separate Bedrock Mantle project, using `zai.glm-5`
  like Better Side. Tokens are minted on demand from Screening Room's credentials.
- `screeningroom-dev-runtime`: dedicated IAM user with access only to this table,
  this bucket's `users/` objects, and this Bedrock project. No infrastructure/admin permissions.

The declaration is `infra/screeningroom.json`. Data resources use `Retain` on
deletion/replacement, and the live stack has termination protection.
The first deployment rolled back because AWS's public Bedrock guide used attributes
that differed from the live resource registry. Retained resources were imported into
the foundation stack before adding the remaining resources. The original
`screeningroom-dev` stack is a failed deployment record, not a second database.

`.env.local` contains server credentials and connection settings, is ignored by Git,
and has owner-only permissions. Nothing belongs in `NEXT_PUBLIC_*`.
To configure a local checkout from the live stack using an authorized provisioning profile:

```sh
python3 scripts/configure-aws.py --profile operator-provisioning
```

The script refuses to rotate or overwrite an existing runtime key it cannot recover.
It preserves unrelated environment variables. Runtime credentials must never use the
provisioning/root profile or Better Side's credentials.

Required environment keys:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_DEFAULT_REGION
DYNAMODB_TABLE_NAME
S3_BUCKET_NAME
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
BEDROCK_PROJECT_ID
BEDROCK_MODEL_ID
BEDROCK_BASE_URL
APP_ORIGIN
```

`APP_ORIGIN` is the exact browser origin, initially `http://localhost:3000`.
Use the matching hostname and port. Change it for a different local port or deployment.
Mutating routes reject missing or different `Origin` headers; no permissive CORS.

## Backend contract

All routes are Next.js route handlers. Errors return `{ "error": "..." }` with an
appropriate HTTP status. Responses are not cached. Except for auth entry routes,
endpoints require the HttpOnly Cognito cookie. The server verifies the JWT's
signature, issuer, token use and app client, and asks Cognito to reject revoked tokens.
Passwords and tokens are never stored in browser localStorage or DynamoDB.

| Route | Request | Response |
| --- | --- | --- |
| `GET /api/auth/session` | — | `{user:null}` or `{user:{id,email,name,emailVerified}}` |
| `POST /api/auth/sign-up` | `{email,password,name}` | `{confirmationRequired:boolean}` |
| `POST /api/auth/confirm` | `{email,code}` | `{confirmed:true}` |
| `POST /api/auth/resend` | `{email}` | `{sent:true}` |
| `POST /api/auth/sign-in` | `{email,password}` | `{user}` and HttpOnly cookies |
| `POST /api/auth/refresh` | refresh cookie | `{user}` and refreshed access cookie |
| `POST /api/auth/sign-out` | session cookies | `{ok:true}`, revokes refresh token and clears cookies |
| `POST /api/auth/password/reset` | `{email}` | `{sent:true}` |
| `POST /api/auth/password/confirm` | `{email,code,password}` | `{ok:true}` |
| `GET /api/account` | — | `{user}` |
| `PATCH /api/account` | `{name}` | `{user}` |
| `DELETE /api/account` | `{email}` matching the signed-in account, case-insensitive | `{deleted:true}` only after owner storage/records/identity cleanup, clears cookies |
| `GET /api/notifications` | optional `?cursor=...` | `{notifications:[{id,title,createdAt,readAt,trashedAt}],cursor}` including trash |
| `PATCH /api/notifications` | `{id}` marks read; `{id,trashed:true}` trashes; `{id,trashed:false}` restores | `{notification}` |
| `GET /api/records?kind=workspace` | kind: `workspace`, `project`, `conversation`; optional cursor | `{records,cursor}` |
| `PUT /api/records` | `{id,kind,value,expectedVersion}` | `{record}` |
| `DELETE /api/records` | `{id,kind,version}` | `{ok:true}` |
| `POST /api/files` | raw file bytes and supported `Content-Type`, maximum 2 MB | `{file:{id,size,contentType}}` |
| `GET /api/files?id=UUID` | — | `{url,expiresIn:60}` for an attachment download |
| `POST /api/chat` | `{messages:[{role:"user"\|"assistant",content:string}]}` | `{message:{role:"assistant",text}}` |
| `GET /api/health` | — | `{status,services:{database,storage,auth,bedrock}}` |

Session returns 401 if a refresh cookie remains after the access cookie expires;
the client may perform one refresh and retry. A genuinely anonymous session returns
`{user:null}`. Cookies are HttpOnly, SameSite=Lax, and Secure in production.
No polling or implicit retry loops are implemented.
Sign-in for an unconfirmed email returns HTTP 403 with
`{error:"Confirm your email before signing in.",code:"EMAIL_UNCONFIRMED"}`.
The client can reopen confirmation using this code without parsing error text.
The live Cognito pool uses `CONFIRM_WITH_CODE`, default Cognito email delivery,
and no custom-message/custom-sender Lambda. AWS's ConfirmSignUp documentation
shows six-digit confirmation codes, but the pool configuration exposes no
code-length field and this project has not verified a delivered email code.
Keep that distinction when implementing a segmented input.
AWS SDK requests have bounded connect/request timeouts and use IPv4 connections
to avoid this development Mac's intermittent DNS64 routing failures. Provider
failures remain visible; no substitute data or success responses are returned.

Records use `pk=USER#<Cognito sub>` and `sk=<kind>#<UUID>`. Queries use partition keys,
never table scans. The server derives ownership from the session, never a supplied
user ID. Writes require optimistic versions: 0 creates, the current version updates;
conflicts return 409. Pagination cursors are validated against the owner and kind.
JSON bodies are capped at 64 KB. Files belong in S3 rather than DynamoDB.
Notification creation is server-only; no sample notifications are returned.
Trash is reversible and preserves read state. Existing records without `trashedAt`
return `trashedAt:null`. UI All/Unread views exclude trash; the unread badge counts
only notifications with both `readAt:null` and `trashedAt:null`.

Account deletion performs its storage permission preflight before changing data.
The user approved `s3:ListBucketVersions` and `s3:DeleteObjectVersion` on this
dedicated bucket, restricted to its `users/*` data. The infrastructure policy adds
only those actions to the existing bucket/prefix statements. If those rights are
removed, the endpoint returns 503 with an actionable label before cleanup begins.
Existing `s3:DeleteObject` alone would leave historical content behind.

Deletion marks the account as deleting, blocks new app activity,
and serializes record writes against that state using DynamoDB transactions.
Uploads acquire a counter before writing to S3; deletion refuses to begin while
an upload is active. Cleanup drains only `users/<session-sub>/` versions and delete
markers, then the `USER#<session-sub>` partition, and finally deletes Cognito's
current user using that user's access token. Failures are explicit and may leave
partial cleanup; the identity remains usable for an explicit deletion retry until
the final Cognito step succeeds. No background retry or polling is introduced.
A minimal `ACCOUNT#<sub>` deletion tombstone remains outside the user-data
partition to prevent already-authorized requests from recreating deleted records.
Interrupted uploads that cannot release their counter require operator review;
the app does not clear those locks silently or report deletion success.

Chat is a minimal authenticated model connection. It does not yet read workspace
files, call tools, persist conversations, or run autonomous tasks. Health performs
real table/bucket checks; `auth`/`bedrock: configured` describes configuration,
not a paid inference on every health request.

## Verification

Structured auth error contracts can be checked without AWS calls or email delivery:

```sh
node --experimental-transform-types --conditions=react-server --test tests/auth-errors.test.mjs
```

Against an already-running development app:

```sh
python3 scripts/verify-backend.py --profile operator-provisioning
```

Account-deletion guards and real disposable-account cleanup can be checked with:

```sh
python3 scripts/verify-account-deletion.py --profile operator-provisioning --allow-delete
```

It creates two disposable accounts with distinct records and versioned S3 fixtures,
rejects a wrong confirmation email/client owner/Origin, exercises successful
deletion of only the disposable first account and verifies the second account's
data survives. It cleans its own fixtures with the provisioning CLI and never
targets real accounts. Without `--allow-delete`, the verifier expects storage
permissions to be absent and verifies that preflight failure preserves both owners.
The successful deletion path was verified live on 15 October 2026, including
active-upload rejection, resuming interrupted cleanup, write blocking during
deletion, removal of every owner file version/delete marker, and preservation of
the second account's identity and data. Only disposable test accounts were deleted.

This creates two disposable Cognito users without sending email, checks auth,
account updates, refresh/reload recovery, origin rejection, DynamoDB version
conflicts and user isolation, notifications, private S3 download isolation,
provider health and one live Bedrock chat, then deletes only its test fixtures.
It neither starts nor restarts the app. Email delivery, confirmation codes and
password reset delivery require a real mailbox and are separate manual checks.

The complete backend verification passed against the running development app on
15 October 2026, including a live Bedrock response and rejection of a revoked
access token after sign-out. Typecheck, production build, and the seven local-data
tests also passed. This does not verify production hosting or email delivery.

## Vercel integration and later auth

The requested `vercel integration add aws/aws-dynamodb` completed after the user
accepted the AWS Marketplace terms. The new Vercel project is
`victor-bashs-projects/screeningroom` (`prj_2D3IAMpALyURKgvts2cN0uckhEIx`). No app was deployed.
The Marketplace resource is `store_Ow5zrXY2UpbBhfXH`, installation
`icfg_4R1QkRKwfN9KbkIF3KJ5SACy`, named `screeningroom`, and is connected to
**development only** with the `MARKETPLACE_` environment prefix.

**Two tables currently exist in distinct AWS account contexts.** The verified
application backend uses `ScreeningRoom-dev` in the existing AWS account, with
lowercase `pk`/`sk`. The Marketplace provisions a distinct managed resource with
uppercase `PK`/`SK` and an OIDC role in its own account context. It is installed and
connected for later Vercel integration, but it does not replace the live backend's
table. No application records were migrated to it. Do not mix its role/table
variables with the direct-AWS runtime credentials.

The Marketplace variables were pulled separately to ignored `.env.marketplace.local`
(0600); Next.js does not automatically load that filename. They are
`MARKETPLACE_AWS_ACCOUNT_ID`, `MARKETPLACE_AWS_REGION`, `MARKETPLACE_AWS_ROLE_ARN`,
`MARKETPLACE_AWS_RESOURCE_ARN`, `MARKETPLACE_DYNAMODB_TABLE_NAME`,
`MARKETPLACE_DYNAMODB_TABLE_PARTITION_KEY`, and `MARKETPLACE_DYNAMODB_TABLE_SORT_KEY`.
The Vercel link also added a temporary `VERCEL_OIDC_TOKEN` to local environment.
That token expires and is not used by the working direct-AWS backend.

Before merging/deploying, choose the intended table/account, reconcile the key
schema and IAM trust, migrate data explicitly, and connect the selected production
resource. Do not provision another table or overwrite `.env.local` with
`vercel env pull` blindly. Hosting variables for the direct-AWS backend have not
been synchronized to preview/production; those deployments are not configured yet.

For deployment, prefer an AWS IAM role trusted by Vercel OIDC with conditions limited
to the exact team/project/environment. Replace the development access key with
short-lived role credentials and retain this same resource-scoped runtime policy.
Configure preview and production isolation and the exact `APP_ORIGIN` deliberately.

Cognito is application auth and works behind a Vercel-hosted Next.js backend.
Vercel deployment protection is a separate control. If adding Sign in with Vercel
or a managed auth provider later, use a maintained OIDC/provider integration and
keep one session authority. Introduce a stable internal user ID plus an external
identity mapping before changing Cognito subjects; otherwise existing DynamoDB/S3
ownership would appear to change. Do not add a second competing cookie/login flow.

Before wider release: test real email confirmation/reset delivery, decide signup
restrictions and abuse/spend limits, use separate production resources, and migrate
browser data explicitly. This is a development foundation, not a completed cloud
workspace migration or production launch.

## UI integration notes

The separate UI work targets Garden reference commit
`9114cd35b90f22770afe95fe95ec6f43030501a6` in Next.js/React: sidebar/tree,
list/grid/columns, toolbar, node creation/context/move/text-editor dialogs,
chat grouping/history/composer, anchored account menu, settings sidebar,
and full-screen account form/artwork. That UI effort is in progress. Garden visual
parity is not established by backend verification or a successful build.

Screening Room intentionally uses workspaces instead of drive roots, the supplied
app icon, and Lucide Folder/FolderOpen for folders. Inbox, Invitations and native
traffic lights are omitted. Root plus opens the creation menu; each folder's
three-dot menu creates nested folders/files. Files have no creation controls.

The sign-in welcome uses animated SVG affinity wheels with local portrait and media tiles. Sign in rolls the artwork away and reveals the existing account form. Portrait layouts place the wheels above and below the controls; reduced-motion preferences stop continuous rotation.

`POST /api/auth/demo` signs into a dedicated confirmed Cognito account using server-only `DEMO_ACCOUNT_EMAIL` and `DEMO_ACCOUNT_PASSWORD`. The button uses the same HttpOnly session cookies as email/password sign-in. These values belong in ignored environment configuration and must be configured separately for each deployment. The route rejects cross-origin requests and fails explicitly when the account is not configured.

Per-account local data uses `screeningroom.v1.account.<user.id>`. The anonymous
legacy key is preserved separately. Account switching remounts the workspace.
Auth, profile, notifications and health use the real backend routes above;
workspace/file/chat persistence remains local until the explicit cloud merge.

## Checks

```sh
pnpm typecheck
pnpm build
```

## Production

```sh
pnpm build
pnpm start
```
