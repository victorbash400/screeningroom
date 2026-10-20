# screeningroom

Next.js application with an independent AWS backend. Account workspaces, folders,
file cards, document versions, comments, activity, chats and drafts persist through
`/api/room`. Appearance persists through `/api/appearance`. Cognito authenticates
server requests using HttpOnly cookies; no browser-stored login tokens are used.

Import accepts files, folders, and HTTP(S) links. Uploaded bytes go to private S3
objects through short-lived signed URLs, including small and empty files. Audio/video
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

## Deployment

The public application runs on Vercel:

- https://screeningroom.nairobilaboratories.com
- https://screeningroom-psi.vercel.app

Project: `victor-bashs-projects/screeningroom`. Next.js route handlers deploy
with the frontend and call the dedicated AWS backend using server-only Production
Secrets. No AWS, Bedrock, Qloo or demo credentials use a public environment prefix.
The separate Vercel Marketplace development table is not used by this deployment.

Production uses Node.js 24 and Fluid Compute. `vercel.json` requests `iad1`,
next to the AWS resources. The chat function explicitly traces its Linux FFmpeg,
FFprobe and checksum-verified yt-dlp binaries; dynamic executable selection must
not cause the whole repository to be bundled. Browser security headers disallow
framing and object embedding, prevent MIME sniffing, and limit referrer disclosure.

The custom domain uses a CNAME managed in Spaceship. Keep the existing apex,
`www`, and verification records unchanged. Use the recommended target returned by
`vercel domains verify` when changing this record.

Production intentionally leaves `APP_ORIGIN` unset so mutations must match the
actual request URL's origin on either assigned hostname. Local development keeps
its explicit origin in `.env.local`. Both paths reject cross-origin and missing
Origin headers. Deployment previews retain Vercel authentication protection;
the assigned public domains use the application's Cognito sign-in.

```sh
pnpm typecheck
pnpm dlx vercel@latest project inspect --non-interactive
pnpm dlx vercel@latest deploy --prod --scope victor-bashs-projects
pnpm dlx vercel@latest domains verify screeningroom.nairobilaboratories.com --project screeningroom --scope victor-bashs-projects
```

Confirm the linked team/project before deploying. Production secrets are managed
in Vercel; do not upload `.env.local` or pull production secrets over local settings.

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
Use the matching hostname and port for an explicitly configured origin. When unset,
the request URL origin is required instead, supporting the assigned deployment aliases.
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
| `POST /api/files/upload` | `{size,contentType}` | `{id,url}` for a direct signed S3 upload |
| `GET /api/room` | — | `{data,revision,imports,mutationId}` |
| `PUT /api/room` | `{fileId,revision,imports,mutationId}` | `{revision}` after snapshot validation and conditional commit |
| `GET /api/appearance` | — | `{value,revision}` |
| `PUT /api/appearance` | `{value,revision}` | `{value,revision}` |
| `GET /api/files?id=UUID` | — | `{url,expiresIn:60}` for an attachment download |
| `POST /api/chat` | `{agent?,messages:[{role:"user"\|"assistant",content:string}]}` | AI SDK UI message event stream with text and tool progress |
| `GET /api/health` | — | `{status,services:{database,storage,auth,bedrock}}` |

Session returns 401 if a refresh cookie remains after the access cookie expires;
the client may perform one refresh and retry. A genuinely anonymous session returns
`{user:null}`. Cookies are HttpOnly, SameSite=Lax, and Secure in production.
The client restores the account once at startup. Returning to the window or
changing tab visibility does not trigger session requests. Sign-in and sign-out
sync through explicit BroadcastChannel events; profile updates sync in place
without closing the workspace. Workspace and appearance data sync through storage
events. Local workspace writes read the latest saved state before applying edits.

Protected requests, including streaming chat, share one authenticated transport.
A 401 triggers one shared refresh and one retry of the original request. Network
failures preserve the last verified account; rejected or revoked credentials still
require sign-in. Session requests can also be retried explicitly through the
existing error popup. There are no scheduled session checks or polling loops.
Sign-in for an unconfirmed email returns HTTP 403 with
`{error:"Confirm your email before signing in.",code:"EMAIL_UNCONFIRMED"}`.
The client can reopen confirmation using this code without parsing error text.
The live Cognito pool uses `CONFIRM_WITH_CODE`, default Cognito email delivery,
and no custom-message/custom-sender Lambda. AWS's ConfirmSignUp documentation
shows six-digit confirmation codes, but the pool configuration exposes no
code-length field and this project has not verified a delivered email code.
Keep that distinction when implementing a segmented input.
AWS SDK requests allow 10 seconds to connect and 15 seconds overall. The local
system resolver intermittently stalled before socket connection and returned
synthesized IPv6 DNS64 answers for AWS. `app/server/aws-dns.ts` uses bounded IPv4
DNS resolution, shares in-flight lookups, and caches answers for their DNS TTL
(capped at 60 seconds). SDK clients and JWT signing-key downloads share this
resolver. Each SDK client has its own connection pool. No authentication requests
are automatically retried. Authentication failures log the operation name and
elapsed time without tokens, credentials, or account data.
failures remain visible; no substitute data or success responses are returned.

Records use `pk=USER#<Cognito sub>` and `sk=<kind>#<UUID>`. Queries use partition keys,
never table scans. The server derives ownership from the session, never a supplied
user ID. Writes require optimistic versions: 0 creates, the current version updates;
conflicts return 409. Pagination cursors are validated against the owner and kind.
JSON bodies are capped at 64 KB. Files belong in S3 rather than DynamoDB.
Notification creation is server-only; no sample notifications are returned.
Trash is reversible and preserves read state. Existing records without `trashedAt`
return `trashedAt:null`. Notification records remain available through the API;
notification navigation and startup requests are disabled.

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
restrictions and abuse/spend limits, and use separate production resources.
This remains a development deployment, not a production launch.

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

`POST /api/auth/demo` returns the dedicated shared demo account’s `DEMO_ACCOUNT_EMAIL` and `DEMO_ACCOUNT_PASSWORD` to fill the sign-in fields, matching Garden. It does not authenticate or set session cookies; users submit Sign in themselves. Only this intentionally shared demo account is exposed by that action. The values belong in ignored environment configuration and must be configured separately for each deployment. The route rejects cross-origin requests, disables caching, and fails explicitly when the account is not configured.

The backend is authoritative. Browser persistence is read only for migration:
account-scoped `screeningroom.v1.account.<user.id>` data is imported once per source
hash after a successful cloud load. Existing localStorage and IndexedDB originals
are retained. Unassigned legacy `screeningroom.v1` data is imported only through
**Settings → Workspaces → Import browser data**, so it is not silently assigned to
whichever account logs in first. Conflicting copies are reported and never overwrite
cloud items. Run migration in the browser and origin where the files were uploaded.
Account switching remounts the workspace; signing out waits for pending room saves.

DynamoDB holds the account-owned revision and immutable S3 snapshot pointer. Each
snapshot contains workspace structure, file references, history, chats, drafts and
activity; file bytes live in separate S3 objects. This matches the current access
pattern of loading the account workspace together, avoids DynamoDB's item size limit,
and commits a complete workspace atomically with a conditional revision write.
Snapshots and file bytes upload directly to S3; the commit API receives only a
file reference and revision. There is no application file-size or conversation-count
cap. S3 enforces its own upload constraints. Older snapshots and
unreferenced uploads are retained until account deletion; add a reference-aware
retention job before larger-scale use rather than expiring live objects blindly.
Appearance is a separate versioned DynamoDB record. There are no browser persistence
writes for application data and no offline-success fallback.

Changes queue in memory until acknowledged by the server. Failed writes stay visible
in the existing error popup; Retry merges independent changes and refuses conflicting
edits to the same item. Pending changes prevent an ordinary tab close without a
browser warning. Changes confirmed in one tab notify other tabs via BroadcastChannel.
Other devices load current data on opening or an explicit refresh; no polling or
cross-device realtime subscription is installed.

## Checks

```sh
pnpm typecheck
pnpm build
node --experimental-transform-types --test tests/room-sync.test.mjs tests/cloud-files.test.mjs tests/import-files.test.mjs
```

## Production

```sh
pnpm build
pnpm start
```


### Agent chats

`app/agents` contains the individual chat, locations, performance, similar, and compare
instructions. Its small registry creates an AI SDK
`ToolLoopAgent` using the existing Bedrock Mantle `BEDROCK_MODEL_ID` (`zai.glm-5`,
the same text model as Better Side). The loop is limited to five model steps,
with no automatic retries or background queue.

`app/tools` contains two read-only Qloo tools: `searchEntities` resolves names to
entity IDs, and `tasteInsights` requests recommendations using those IDs. Configure
`QLOO_HACKATHON_API_SERVER_URL` and `QLOO_HACKATHON_API_KEY` in the server environment.
The key is never returned to the browser. Requests use a 15-second tool timeout;
the chat route has a 50-second generation deadline. Qloo affinity is not measured
conversion, box-office performance, venue availability, or legal clearance.

Every chat channel uses the same composer and reference picker. Text-file mentions
send the file text; folder mentions send immediate child names.
Other file types send metadata only. References are user-provided context, not
instructions or tool permissions. There is no PDF, image, or audio analysis yet.
Conversation context is sent without application-imposed message-count or text
truncation. Provider context limits surface as errors rather than silently dropping
messages. Saved conversation history is independent of provider context limits.
Replies retain ordered text/tool blocks from the SDK stream through backend
storage and replay. Tool calls stay between the text that precedes and follows
them, using a stable terminal icon and event-driven running/error/stopped states.
React Markdown with GFM renders tables, links and lists. Older saved replies keep
their legacy text/tool representation because their original ordering was not
stored. Cancellation settles pending tools without inventing a successful result. Conversation history, replies and drafts save through the same
account-owned backend as the workspace. In-flight generation remains interruptible;
this does not add durable agent execution after the client disconnects.

Run `node --experimental-strip-types --test tests/agent-chat.test.mjs` for chat
history, storage-role validation, streaming, and error handling checks.

Run `node --conditions=react-server --experimental-strip-types --test tests/qloo-tools.test.mjs`
for Qloo request construction, schema validation, and explicit provider failures.


### Startup recovery

If the initial session lookup fails, the app shows a centered 404-style recovery
surface with Retry and a Sign in link to `/login`. Background failures keep an
already verified workspace mounted and use the existing popup. Unknown URLs return
an actual HTTP 404 using the same layout. `/login` opens the existing sign-in form;
an authenticated user continues to the workspace. Startup connection failures
remain API 503/504 errors; the 404-style client layout does not relabel them as
missing routes. While the initial session loads, the centered app mark remains visible.

DNS regression tests: `node --conditions=react-server --experimental-transform-types --test tests/aws-dns.test.mjs`.
Recovery rendering tests: `node --experimental-transform-types --test tests/session-screen.test.mjs`.


### Media delivery and cache

Video and audio mount their player shell immediately and show a spinner until the
first frame is available. Seeking and stalled playback use native media events to
show buffering; completion and errors stop the indicator. Startup uses the app
mark with a spinner beneath it, following Garden's layout.

Private S3 assets stream through `/asset-worker.js` in 1 MiB byte ranges. The worker
keeps disposable chunks in account-scoped Cache Storage, reuses overlapping reads,
and refreshes signed URLs on demand. Opening a large video no longer requires a
complete Blob download. File selection, hover and focus warm the first and final
chunks (including MP4 footer metadata). Speculative requests run serially and skip
superseded selections; data-saver mode disables them. Explicit downloads still
retrieve the complete file. Uploads reuse their original Blob immediately and seed
the same cache after S3 acknowledges the write.

Sign-out clears the media cache; account changes cannot read another account's
cached URLs. AWS remains authoritative. Browser storage can be evicted, and HTTPS
(or localhost) is required for service workers. If workers are unavailable, the
player uses a fresh signed S3 URL and native HTTP ranges. Cache quota errors evict
an older chunk; playback continues even if caching is unavailable. No upload-size
or saved-chat-count limit is added by this cache.

Chat waiting uses a small pulsing dot until text or an active tool call arrives.
Qloo calls have running, completed, stopped and failed presentation based on SDK
stream events. Terminal states remove loading animations. Markdown rendering for
unchanged replies is memoized. Notifications are removed from navigation and no
longer load during sign-in. Connections lists Qloo API configuration alongside
Bedrock, authentication, database and storage.

Cache checks: `node --experimental-transform-types --test tests/asset-cache.test.mjs tests/agent-activity.test.mjs`.


### Settings interaction and proportions

Connections always renders its five service rows, even while status loads. Each
row owns its Check/Retry action and pending state. `GET /api/health` reads current
AWS status and provider configuration; `?service=auth|database|storage|bedrock|qloo`
checks only that service. Explicit Bedrock checks generate a short response and
explicit Qloo checks perform a search. Opening Settings does not automatically
invoke those paid/external provider probes. No polling is used.

Workspace disclosure rows expand their own statistics and Rename/Delete actions.
They toggle independently and identify their controlled section accessibly.
The existing boxes are preserved. Settings content grows from its existing
760px desktop width up to 1040px on wider screens. Chat uses 36% of available
workspace width with a 480px desktop minimum, and overlays the content when the
workspace is too narrow to keep both regions usable.

### Audience data and map widgets

Audience uses the existing Vercel AI SDK/Bedrock model. It receives the selected
location/radius/venue filters, visible map places, and validated results from
previous replies. Tools return structured widgets; no model-generated HTML,
text-to-JSON recovery, or file-analysis changes are introduced.

- Geographic discovery uses Qloo by default. For a dedicated venue catalogue,
  set `VENUE_DATA_PROVIDER=geoapify` and add `GEOAPIFY_API_KEY` server-side.
  Geoapify supplies cinema/theatre category searches by circle and proximity (live music/concert halls remain Qloo tools), caches results for
  one hour, and retains provider attribution. Configuration selects the source;
  failures do not silently switch providers. No public Nominatim integration is
  shipped because its service policy is unsuitable for this product's scale.
- Qloo supplies taste-ranked venues, genre-tag lookup, audience age/gender
  affinity indices, and geographic affinity cells. An index is not an audience
  percentage. Empty heatmap coverage is reported honestly; missing coverage is
  not a zero population. Independent queries' scores are not interchangeable.
- WorldPop's [Global2 API](https://api.worldpop.org/v2/) supplies dated modeled
  resident population and age/sex estimates for the selected circle. The default
  data year is 2025 and is shown in the widget. Calculations return a job; the
  user explicitly loads its result, or asks the agent to load that known job.
  There are no polling loops. A pending job is never presented as a count.

Venue lists and heatmaps update map layers from their validated tool output.
Venue clusters count returned venue records, not people. Clicking a venue opens
its detail card; changing the search origin is a separate action. Inline venue
links focus the matching returned record. Widgets and map scenes persist with
chat messages, including WorldPop results loaded after the original reply.

The agent asks one relevant question when media/venue intent is ambiguous and
asks before expanding a search with no results. Agreed area changes update the
composer location, radius control, and map together. Tool output parsing is
cached for completed stream calls, and full heatmap cells stay out of model
follow-up context while remaining available to the map.

### Media workflows

The interface has Chat and Audience. Chat supports general conversation and
media/audience questions directly. Audience handles local cultural fit, heatmaps
and venue planning. Retired channels remain compatible with saved conversations.
The toolbar stays right aligned and collapses labels on narrower workspace widths.

Select files/folders or name media in the message. Selected text, briefs, subtitles,
CSV and JSON are read from the authenticated user's S3-backed workspace. Folder
selection grants access to its descendants, not unrelated files. Newly changed
assets finish syncing before analysis; chat-only changes do not delay a file read.
Selected file chips open the existing media preview without closing the chat.
GLM-5 handles the conversation; dedicated Gemma 4 tools handle selected image,
video-frame and speech analysis. PDF binaries still need a text export.

- Chat can inspect selected work and use Qloo audience demographics and taste
  profiles to discuss who may enjoy it. It has no required workflow selection.
- Audience uses comparable works or genuine taste tags as interest signals in
  the selected map area. Geographic heatmaps and Qloo venue affinity are separate
  from ordinary geographic venue discovery. Media-to-tag matching is the model's
  interpretation; Qloo supplies the resulting cultural-affinity signal.
- Age/gender affinity currently comes from a separate, non-geographic Qloo query.
  WorldPop supplies resident estimates, not taste data. The model chooses tools;
  the Audience instructions connect selected media to local cultural references, comparable/tag heatmaps and optional affinity-ranked venues.
- Legacy comparable-media and metric-comparison tools remain available to saved
  channel contracts; their validated results and charts still reopen normally.

Comparison tables and bar/line charts persist as validated tool results. Chart
numbers are derived from tool evidence, not supplied freely by the language model.
Follow-up chart requests can load prior evidence from the user's saved workspace.
Every widget retains source, units, and an expandable explanation of its basis.
The model is instructed to explain conclusions, supporting evidence and uncertainty,
without revealing internal deliberation or merely reprinting the widgets.

Checks: `tests/media-performance.test.mjs`, `tests/media-research.test.mjs`, and the
research render/toolbar checks in `tests/audience-widgets.test.mjs`.

### Selected-media understanding

`inspectImage` uses `google.gemma-4-26b-a4b` for descriptions and visible text.
`inspectVideo` samples compressed JPEG frames across the selected time range
(ten representative samples by default, including an early sample), with approximate frame positions. The original video is not
sent to the model. `transcribeMedia` uses `google.gemma-4-e2b` for audio or a video's
speech, decoded once to mono 16 kHz PCM and read as exact 30-second WAV windows.
The default covers the entire audio track; explicit start/end times select a range.
A video inspection includes the full transcript automatically when sound exists.
The original video is never sent to the model, and digital-silence chunks are
identified exactly without a model call; nonzero quiet audio is preserved. The agent must distinguish sampled visuals, transcript
coverage and observations from unprocessed media or performance predictions.

Media calls use the existing project credentials and Gemma 4's
`/openai/v1/chat/completions` Mantle route. Optional server settings
`BEDROCK_VISION_MODEL_ID` and `BEDROCK_AUDIO_MODEL_ID` select other compatible models.
The main chat model is unchanged. Vision uses low reasoning after comparing it
with no-reasoning image output; audio uses no reasoning. Provider reasoning is not
returned to chat.

FFmpeg and FFprobe are installed as platform-specific dependencies, traced into
the chat function's server bundle, and use signed owner-scoped S3 URLs. Inputs use
explicit demuxers and restricted protocols. Analysis streams an owned file once
to a temporary server file, shares it between visual and audio processing, then
removes it. Cache hits do not download the source. This avoids slow repeated remote
seeks and does not download the original into the browser or send it to the model.
Images shrink to at most 1024 pixels
per side without upscaling. Video frame payloads are batched below Gemma's documented
3.5 MB request ceiling. No browser media reupload, background polling or new AWS
service is required. `FFMPEG_PATH`/`FFPROBE_PATH` may explicitly override the bundled
binaries on a supported server.

Successful results are cached beneath the account's S3 prefix by immutable source
content, model, analysis parameters and cache format version. Changed media or
analysis settings cannot reuse stale results. File names, sources, time coverage,
text and uncertainty persist in validated chat widgets, using the existing preview
to open the original media. Cache/storage/provider failures remain visible.

Tool call clocks start when each call first appears in the stream and stop at its
result, error, or cancellation. Each call stores its own timestamps with the reply;
reopening a chat preserves completed durations. The live clock is local rendering,
not network polling. Existing general chats can continue; new work still starts by
choosing a workflow, and workflow cards only render before the first message.

Video inspection extracts up to twenty representative frames, four at a time, using one
decoder thread per frame against the prepared local source.
The immutable source/range/frame selection has a separate owner-scoped S3 frame
cache, so a new question reuses extracted frames without rereading the video.
Results include whether an audio track exists, sampled observations and the full
transcript with coverage. Visual-only requests can disable audio; the agent does
not repeat transcription when the video result already contains it. Missing audio
is reported as a property of the uploaded copy, not interpreted as model failure.

`Media analysis` structured server logs correlate each operation by request ID and
file ID. Stages record cache hits, track counts, extraction times and byte counts,
model input/output frame counts and indices, and transcript chunk coverage. Logs
exclude signed URLs, credentials, images, transcript text and provider reasoning.
S3 object transfers use the chat operation’s transfer budget and abort signal; authentication and
DynamoDB retain their short metadata timeouts.

### Geographic taste queries

Audience uses `getLocalTaste` with `signal.location` to discover local films,
artists, shows, books, podcasts or games. Point signals leave signal radius unset
for Qloo dynamic density discovery. Separate heatmap and venue calls retain the
user-selected search radius as `filter.location.radius`. Original songs and live
productions use explicit artist/comparable/tag proxies, not invented song/play IDs.

Live checks returned local movie and artist results. Restricting location-only
queries with `filter.results.entities` returned no rows for tested film IDs, so
that operation is deliberately not exposed as a direct fit score. Heatmaps assess
the geographic affinity of specific references instead. Do not compare relative
normalized values across independent queries as absolute market scores.

The floating Audience surface aligns with the chat panel and follows layout
resizing. Its map retains the previous 480px footprint where space permits;
the added height belongs to the venue carousel. Returned places form a horizontal, scroll-snapping carousel with previous/next controls below
the map; selecting a card focuses its map pin. Qloo venue affinity and surrounding
heatmap affinity remain separate evidence. No synthetic combined score is used.

YouTube links use the same sampled visuals and full speech transcription as uploads. Builds prepare a checksum-verified standalone yt-dlp executable from its official release, included in the chat function bundle. Local development can prepare the same binary with `node scripts/prepare-youtube.mjs` or use yt-dlp on PATH; `YTDLP_PATH` can select an existing executable. Restricted or unavailable videos fail explicitly; upload a copy or transcript when a source cannot be accessed.

### Product walkthrough

Info opens a six-chapter scripted example using the app’s toolbar, sidebar
search, composer, selection tree and Audience map/catalogue. Demo accounts reopen
it on each app start; unseen empty accounts open it once. Dismissal is saved per
account through `/api/onboarding`, with failures surfaced for retry.

Edit step copy and order in `app/lib/productTour.ts`, examples in
`app/components/onboarding/tourExample.ts`, and individual scenes under
`app/components/onboarding/`. Example API requests are isolated from real account
data; the map loads public map tiles, while example chats do not invoke a model.

### Country selection and linked media

New Audience conversations default to New York. The map can select a radius or
an entire country. Radius accepts any positive finite distance in kilometers;
the plus control expands the slider range. Country mode frames and highlights
the selected boundary, and map clicks select another country. Boundaries are
bundled from [Natural Earth](https://www.naturalearthdata.com/), using public-domain
Admin 0 data at 110m with 50m small-country and US coastlines. They are generalized
map boundaries, not legal boundary determinations. Qloo receives the selected
Polygon/MultiPolygon with zero boundary buffer via POST; Geoapify uses country
codes, and WorldPop receives the same boundary geometry. Country local taste
uses Qloo's country locality signal rather than the country's label point.
The Live walkthrough demonstrates a 500 km radius and selecting Kenya.

Public YouTube and direct HTTPS video/audio download links use the existing
analysis tools and result widgets. Video defaults to ten representative frames,
including an early sample; explicit requests can select up to twenty. Four frame
decoders run concurrently. Video includes full speech transcription when an audio
track exists. `transcribeLinkedMedia` handles audio links and speech-only requests.
Direct-file fetching validates and pins public DNS addresses, checks every redirect,
rejects private hosts, and streams at most 512 MB to a temporary file. It never
passes an arbitrary remote URL to FFmpeg. Restricted pages and HTML links are
explicit errors; they are not substituted with metadata-only analysis. yt-dlp
uses the server's Node executable and a writable temporary cache directory.

Direct-file cache identities include the server's ETag or Last-Modified revision;
links without a revision are not reused across requests. Exact trailing digital
silence can be removed from inference payloads without dropping quiet samples or
changing reported chunk coverage. If speech analysis fails after visual analysis
succeeds, the existing tool row shows a failure and retains the observed frames.
The structured result includes `transcriptError`, omits the missing transcript,
and is not cached as a complete success. The agent must report that partial result
explicitly and cannot infer the missing speech or silently retry it.
