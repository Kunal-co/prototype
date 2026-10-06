# Cyber Threat Detection (frontend + backend + model contract)
Static frontend + Express API + SQLite (libSQL). The ML model is **not** included; it plugs in through the contract below.

## Run locally
```
cd backend && npm install && npm start     # http://localhost:3000 (serves frontend too)
```
Login: `admin` / `admin123` (override with `ADMIN_USERNAME` / `ADMIN_PASSWORD`). Default `MODEL_MODE=mock` returns canned contract-shaped results so the UI works before the model exists; the dashboard "Analyze a network flow" form picks the scenario. DB file: `data/events.db` (created on first run).

## Conventions
- Status: `normal | attack | possible_zero_day` (UI: "Possible Zero-Day / Unknown Anomaly"; `no_data` appears only in dashboard `currentStatus`)
- Severity: `low | high | critical` (`none` only in dashboard `currentStatus` when no events)
- `attackType`: free string from the model, `null` unless status is `attack`. Never hardcoded.
- Auth: `Authorization: Bearer <token>` from `/api/login` (all endpoints except login).
- Errors: `{ "success": false, "error": { "code": string, "message": string } }` (login failure uses `{success:false,user:null,message}`).

## API
| | Endpoint | Auth |
|---|---|---|
| POST | `/api/login` | no |
| GET | `/api/dashboard` | yes |
| GET | `/api/activity` | yes |
| POST | `/api/analyze` | yes |
| GET | `/api/events?limit=50&mine=false` | yes |

**POST /api/login** body `{username: string*, password: string*}` -> `{success, user:{id,username}, token, message|null}`. Errors: 401.
**GET /api/dashboard** -> `{success, stats:{totalEvents,normalTraffic,attacks,anomalies}, currentStatus:{status,severity}}` (status from the latest 20 events, worst wins). Errors: 401, 500.
**GET /api/activity** -> `{success, events:[{id,timestamp,sourceIp|null,destinationIp|null,status,severity,attackType|null,confidence|null,reason}]}` (latest 50). Errors: 401, 500.
**GET /api/events** query `limit` (number, optional, max 500), `mine` (boolean, optional) -> `{success, events:[DetectionEvent]}`. Errors: 401, 500.
**POST /api/analyze** body: `features*` (object name -> finite number, any names/count), `sourceIp` (string, optional), `destinationIp` (string, optional), `mockScenario` (`normal|attack|anomaly`, optional, mock mode only). Returns **DetectionResponse**. Errors: 400 `INVALID_FEATURES`/`INVALID_FEATURE_VALUE`, 401, 502 `MODEL_UNAVAILABLE`/`MODEL_ERROR`/`MODEL_BAD_RESPONSE`, 503 `MODEL_NOT_CONFIGURED`.

## Model contract (for the ML developer)
The backend POSTs JSON to `MODEL_URL`.
**ModelRequest** `{ "features": { "<name>": number, ... } }` (names/count defined by the ML developer; backend does not check them).
**ModelResponse**
```
{ success: true,
  xgboost: { prediction: number, label: "normal"|"attack", attackType: string|null, probability: number|null },
  isolationForest: { prediction: number, label: "normal"|"anomaly", anomalyScore: number|null } }
```
The backend decides using `label` only.

## DetectionResponse (backend -> frontend)
```
{ success: true,
  detection: { status, severity, confidence: number|null, reason, attackType: string|null },
  modelResults: { xgboost, isolationForest },
  timestamp: ISO string }
```
Rules: xgboost `attack` -> `attack`/`high` (confidence = probability); else isolationForest `anomaly` -> `possible_zero_day`/`critical` (confidence null); else `normal`/`low`.

## DetectionEvent (table `events`)
`id, timestamp, userId, sourceIp, destinationIp, status, severity, attackType, confidence, reason, anomalyScore`. Internal functions in `db.js`: `saveEvent, getEvents, getUserEvents, getDashboardStats`.

---
# Deploying to Vercel
## Vercel limitations and how this design handles them
1. **SQLite file cannot persist on Vercel** (read-only, ephemeral filesystem). `db.js` uses `@libsql/client`: a local `data/events.db` in development, and **Turso** (hosted SQLite, same SQL) in production. Turso is the only non-Vercel service required; it exists solely because Vercel has no persistent SQLite.
2. **No always-on server.** `api/index.js` exports the Express app as one serverless function; `vercel.json` rewrites `/api/*` to it. `app.listen` runs only locally.
3. **Python model.** Vercel can host Python functions, but XGBoost + scikit-learn may exceed the 250 MB function size limit. Keep the model as a **separate Vercel project** (Python function, e.g. `api/predict.py`) implementing the contract above; if it exceeds limits, you will need a different host for the model only. The backend reaches it via `MODEL_URL`. Model cold starts count toward the 10 s timeout in `detector.js`.
4. **Sessions** are stateless signed tokens, so they work across function instances.

## Steps
1. Push the repo to GitHub. Create a Turso DB: `turso db create cyber-threat`, then `turso db show --url` and `turso db tokens create cyber-threat`.
2. Vercel -> New Project -> import the repo. Framework: **Other**; root directory: repo root; no build command. `vercel.json` sets the output directory to `frontend` and the `/api` rewrite. Root `package.json` supplies the function dependencies.
3. Set environment variables (Production, and Preview if needed):

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Required. Database |
| `JWT_SECRET` | Required. Long random string |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Required in practice. Seeded login (default is insecure) |
| `MODEL_MODE` | `mock` (default) or `http` |
| `MODEL_URL`, `MODEL_API_KEY` | Required when `MODEL_MODE=http` |
| `CORS_ORIGINS` | Comma-separated origins; only if the frontend is on a different domain |

4. Deploy. Test: `curl -X POST https://<app>.vercel.app/api/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"..."}'`.

## API URL and CORS
- **Same project (recommended):** frontend and `/api` share one domain, so the frontend calls relative `/api/...`; no CORS config needed (`CORS_ORIGINS` empty).
- **Separate projects:** deploy the repo twice or the frontend alone, set `<meta name="api-base" content="https://your-backend.vercel.app">` in `login.html` and `dashboard.html`, and set `CORS_ORIGINS=https://your-frontend.vercel.app` on the backend.

## Connecting the model later
Deploy the model project, then set `MODEL_MODE=http`, `MODEL_URL=https://<model>.vercel.app/api/predict`, `MODEL_API_KEY` (have the model check the bearer token), and redeploy. No backend code changes.
