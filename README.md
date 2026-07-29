# ComplainKendra

**AI-powered civic complaint reporting platform for Nepal.**

ComplainKendra ("Complaint Center") lets citizens report local civic issues — potholes, water leaks,
power outages, waste, fallen trees, and more — with a photo and a location pin, and gives municipal
ward officers a dedicated console to triage, assign, and resolve them. A Google Gemini-backed AI
pipeline auto-categorizes each report, scores its severity/priority, flags likely duplicates, and
routes it to the right department, while Socket.io keeps both the citizen and officer apps updated
in real time. The product ships as a single Expo (React Native + web) codebase talking to an
Express/MongoDB backend.

## Key Features

**For citizens**
- Guided 3-step report wizard: category & description → GPS/map location + up to 4 photos → AI
  preview (category, priority, rewritten description, duplicate warning) before submitting.
- Track own complaints, follow/upvote others, threaded comments, 1–5 star rating once resolved.
- Browse a public map/feed of nearby and ward-wide complaints (Leaflet + OpenStreetMap/Nominatim).
- Real-time push of status changes, AI results, comments, and notifications via Socket.io.
- Gamification: points, levels, and badges for reporting, getting upvoted, commenting, and rating.
- Bilingual UI (English/Nepali) and Google Sign-In alongside email/password auth.

**For ward officers**
- Dashboard with KPIs and an urgent queue (high/critical priority or high AI confidence).
- Filterable/sortable complaint queue, full detail view, assignment (supervisor/admin), manual
  priority/department overrides, internal notes vs. official public responses.
- Enforced status workflow: `pending → accepted → in_progress → resolved/rejected` (+ reopen).
- Analytics (resolution time, category/ward/priority/department breakdowns, officer performance),
  citizen user management (warn/ban), configurable escalation rules, session management.

**Platform**
- Dual AI provider: Google Gemini (multimodal — text + photo) with an automatic rule-based mock
  analyzer fallback (`AI_PROVIDER=mock` or when Gemini is unavailable/fails).
- Rule-based duplicate detection (category + location + description-overlap + recency) and a
  separate rule-based priority engine (keyword risk rules + duplicate pressure + AI severity).
- JWT access + refresh-token auth for two independent identity stores (citizens vs. officers),
  unified only at the token layer.

## Tech Stack

| Layer | Technology |
|---|---|
| App | Expo (React Native + `react-native-web`), React Navigation (native-stack + bottom-tabs) |
| State/Data | React Context (auth, realtime, language), Axios-based API client |
| Maps | Leaflet, OpenStreetMap tiles, Nominatim (search & reverse geocoding) |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB via Mongoose |
| Realtime | Socket.io (JWT-authenticated, room-scoped by user/ward/officer/complaint) |
| AI | Google Gemini (`@google/generative-ai`) with a mock analyzer fallback |
| Auth | JWT (access + refresh), bcrypt, Google OAuth (`@react-oauth/google`, `@react-native-google-signin`) |
| Uploads | Multer → local disk (`src/api/uploads`), Cloudinary SDK configured but not wired in |

## Folder Structure

```
ComplaintHub/
├── App.tsx                        # App entry: providers (language, auth, realtime) → navigator
├── app/                            # Frontend (Expo / React Native + web)
│   ├── (tabs)/                     # Unused leftover Expo template folder (empty)
│   ├── components/                 # ErrorBoundary, NetworkStatusBanner, StartupSplashScreen
│   ├── constants/                  # colors.ts, theme.ts (citizen + officer design tokens)
│   ├── i18n/                       # LanguageContext/LanguageSync + translations/ (en + ne, per screen)
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Picks Auth / User / Officer navigator based on auth + role
│   └── features/
│       ├── auth/                   # Login, register, OTP, forgot/reset password
│       │   ├── screens/  context/  services/  navigation/  providers/  components/  types/
│       ├── complaints/              # Report wizard, complaint detail, my complaints, rating
│       │   ├── screens/  services/  navigation/  types/
│       ├── map/                     # InteractiveMap, geolocation/search/reverse-geocode/ward-lookup
│       │   ├── components/  config/  services/  utils/
│       ├── officer/                 # Officer console: dashboard, queue, detail, analytics, users
│       │   ├── screens/  components/  services/  navigation/  types/
│       ├── realtime/                # Socket.io client context + useRealtimeInvalidation hook
│       │   ├── context/  hooks/
│       ├── user/                    # Citizen app shell: home, browse, notifications, profile, settings
│       │   ├── screens/  components/  services/  navigation/  types/  utils/  data/
│       └── devtools/                # In-app manual API console (dev/QA tool, not end-user facing)
│           ├── screens/  hooks/  services/  data/  types/  components/
├── src/
│   ├── api/                         # Backend (Express + MongoDB)
│   │   ├── server.ts                # Bootstrap: middleware, route mounting, Socket.io, DB connect
│   │   ├── config/                  # env, database, gemini, cloudinary config
│   │   ├── controllers/             # auth, user, ward, complaint, comment, notification, officer, gamification
│   │   ├── services/                 # Business logic (see System Architecture below)
│   │   ├── models/                  # Mongoose schemas (User, Officer, Complaint, Comment, Notification, ...)
│   │   ├── repositories/            # Thin data-access helpers (complaint, user)
│   │   ├── routes/                   # Route definitions per resource, mounted under /api/v1 (+ aliases)
│   │   ├── middlewares/              # auth (JWT/role guards), error handler, rate-limit/sanitize
│   │   ├── sockets/realtime.ts       # Socket.io server: auth handshake, rooms, emitRealtimeEvent()
│   │   ├── seeds/seed.ts             # Dev data seeding (wards, demo citizen + officer accounts)
│   │   ├── data/wardSeedData.ts      # Static Nepal ward reference data
│   │   ├── types/                    # Shared TS types/DTOs/constants
│   │   ├── utils/                    # AppError, request parsing helpers, upload helpers
│   │   └── uploads/                  # Local disk storage for uploaded complaint photos
│   ├── features/                    # A few backend-adjacent client helpers (Google config, photo upload)
│   ├── lib/                          # api.ts (shared Axios client), requestCache.ts; ai.ts is unused/legacy
│   └── theme/typography.tsx
├── components/, constants/           # Legacy default Expo template files (StyledText, Colors, etc.)
├── assets/                           # Fonts, icons, splash images
├── docs/sprint-7-qa-checklist.md     # QA checklist for the current sprint
├── scripts/                          # PowerShell helpers for running Expo over LAN
└── tests/run-tests.ts                # Lightweight test runner (`npm test`)
```

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        Expo App (React Native + Web)                      │
│                                                                             │
│   AuthNavigator          UserNavigator (citizen)     OfficerNavigator      │
│   (login/register/       Home · Browse · Report ·    Dashboard · Queue ·   │
│    OTP/reset)             Track · Notifications ·      Complaint Detail ·  │
│                           Profile · Saved Issues       Analytics · Users   │
│                                                                             │
│   Shared: AuthContext (JWT + AsyncStorage) · RealtimeContext (socket.io    │
│   client) · LanguageContext (en/ne) · InteractiveMap (Leaflet/Nominatim)   │
└───────────────────────────┬───────────────────────────┬───────────────────┘
                            │ REST (Axios, JWT bearer)   │ WebSocket (JWT auth)
                            ▼                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      Express API  (src/api/server.ts)                     │
│  cors → helmet → rate-limit → morgan → json/urlencoded → sanitize         │
│                                                                             │
│  Routes  →  Controllers  →  Services  →  Mongoose Models  →  MongoDB       │
│  /auth /officer/auth  /users  /wards  /complaints  /comments               │
│  /notifications  /officer/*  /uploads  /gamification  /internal           │
│                                                                             │
│  Key services:                                                            │
│   • ai.service        → Gemini (multimodal) or rule-based mock fallback   │
│   • priority-engine    → keyword risk rules + duplicate pressure + AI      │
│   • duplicate-detection→ category + location + text-overlap + recency     │
│   • department-routing → static category → department map                │
│   • complaint / officer / comment / notification / points services       │
│                                                                             │
│  sockets/realtime.ts → Socket.io on the same HTTP server, JWT-authed,     │
│  rooms: user:<id> · ward:<id> · officers · complaint:<id>                 │
│  emitRealtimeEvent() fans out complaint/officer/notification events       │
└───────────────────────────┬───────────────────────────────┬───────────────┘
                            │                                 │
                            ▼                                 ▼
                     MongoDB (Mongoose)                 Google Gemini API
              Users · Officers · Complaints             (@google/generative-ai)
              Timelines · Comments · Notifications       — auto-categorize,
              Wards · RefreshTokens · Badges · Points     score severity/priority,
                                                           rewrite description
```

**How it fits together**
- **Two identity stores, one token shape.** Citizens (`User`) and officers (`Officer`) are separate
  Mongoose collections with separate login endpoints, but both receive the same JWT shape
  (`type: "citizen" | "officer"`, `role`, short-lived access token + opaque hashed refresh token).
  The app has a single Login screen that tries citizen login first and falls back to officer login;
  `AppNavigator` then routes to `UserNavigator` or `OfficerNavigator` based on the resulting role.
- **AI is asynchronous by default.** Submitting a complaint saves it immediately (with a first-pass
  rule-based priority/department) and returns right away; the real Gemini/mock analysis then runs
  in the background and updates the complaint moments later, emitting `complaint:ai_complete` over
  the socket. A separate synchronous `POST /complaints/analyze` endpoint lets the citizen preview AI
  results (category, priority, duplicate warning, rewritten description) inside the report wizard
  before they actually submit.
- **Realtime is an invalidation signal, not a data feed.** Socket.io tells a screen "something
  changed for you," and the screen refetches over REST — no full payloads are pushed and cached
  client-side. This keeps the client simple and the REST API as the single source of truth.
- **Maps use OpenStreetMap, not a native maps SDK.** Location picking, search, and reverse geocoding
  all go through Leaflet + Nominatim; "nearby complaints" are computed with in-app Haversine distance
  over MongoDB query results rather than a native geospatial (`2dsphere`) index.

## User Flows

### Citizen: reporting and following an issue

```
Register/Login (or Google Sign-In)
        │
        ▼
Home — dashboard: stats, quick categories, nearby complaints, notifications
        │
        ▼
Report (+ button) ── Step 1: category + title + description
        │             Step 2: location (GPS / map pin) + up to 4 photos
        │             Step 3: "Analyze with AI" preview → category, priority,
        │                      rewritten description, duplicate warning
        │                        ├─ duplicate found → Follow existing, or
        │                        └─ Continue as new → Submit Report
        ▼
Complaint created (complaintNo assigned, status = pending)
        │  → background AI analysis refines priority/department minutes later
        ▼
My Complaints / Complaint Detail — live status via realtime updates
        │
        ├─ Upvote / Follow other citizens' complaints (Browse / map feed)
        ├─ Comment on a complaint (own or others')
        └─ Once status = resolved → Rate Resolution (1–5 stars + comment)
        ▼
Points, levels, and badges accrue automatically (submit, resolution, upvotes received,
comments, ratings) → visible on Profile / Leaderboard
```

### Officer: triaging and resolving complaints

```
Officer Login (separate Officer identity, ward-scoped unless admin)
        │
        ▼
Officer Dashboard — KPIs + urgent queue (high/critical priority or high AI confidence)
        │
        ▼
Officer Queue — filter/sort by status, category, priority, ward, department, assignee
        │
        ▼
Complaint Detail
        ├─ Assign / reassign officer (supervisor/admin only)
        ├─ Override priority or department (locks out future auto-recalculation)
        ├─ Add internal notes (officer-only) vs. official public response (citizen-visible)
        └─ Workflow action: accept → start (in progress) → resolve / reject → (reopen)
                 each transition timelines an entry, notifies the citizen, and
                 broadcasts complaint:status_updated / complaint:resolved over sockets
        ▼
Officer Analytics — resolution time, category/ward/priority/department breakdowns,
        officer performance, AI category distribution, trend lines
        │
        └─ User Management — warn or ban citizens · Escalation Rules — configure SLA thresholds
```

## Run Locally

1. Install packages:

```bash
npm install
```

2. Create `.env` from `.env.example` and set:

```bash
MONGO_URI=mongodb://localhost:27017/complainkendra
JWT_SECRET=replace-with-a-long-secret
AI_PROVIDER=mock
PORT=5000
```

3. Seed development data:

```bash
npm run seed
```

Seed accounts:

- Citizen: `rahul.sharma@example.com` / `password123`
- Officer: `ward12.officer@example.com` / `officer123`

4. Start backend:

```bash
npm run server
```

5. Start Expo web UI:

```bash
npm run web
```

## API Base

Primary API base: `http://localhost:5000/api/v1`

Compatibility aliases are also available for older frontend calls:

- `/api/auth`
- `/api/wards`
- `/api/complaints`

## Main Endpoint Groups

- Citizen auth: `/api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/google`, `/forgot-password`, `/reset-password`, `/otp/send`, `/otp/verify`
- Officer auth: `/api/v1/officer/auth/login`, `/logout`, `/refresh`, `/sessions`
- Users: `/api/v1/users/me`, `/me/stats`, `/me/badges`, `/me/avatar`
- Wards: `/api/v1/wards`, `/cities`, `/lookup`
- Complaints: `/api/v1/complaints`, `/nearby`, `/analyze`, `/mine`, `/followed`, `/:id/timeline`, `/:id/upvote`, `/:id/follow`, `/:id/rate`
- Comments: `/api/v1/complaints/:complaint_id/comments`
- Notifications: `/api/v1/notifications`
- Officer console: `/api/v1/officer/dashboard`, `/complaints`, `/analytics`, `/alerts`, `/users`, `/escalation-rules`, `/settings`
- Gamification: `/api/v1/leaderboard`, `/badges`
- Uploads: `/api/v1/uploads/photos`, `/api/v1/uploads/avatar`
- Internal AI (unauthenticated, test-only): `/internal/ai/analyze`

Local uploads are served from `/uploads/...`. Real-time events are available through Socket.io on the backend server.
