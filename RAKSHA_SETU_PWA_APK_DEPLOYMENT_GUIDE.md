# Raksha Setu PWA and APK Deployment Guide

Updated: March 27, 2026

## 1. What the two provided docs are about

`C:\Users\Mahir Kachwala\Downloads\MIDDLEWARE_DEPLOYMENT_GUIDE.md`

- This is a deployment strategy document for a different middleware-based project.
- Its main idea is correct and useful: keep one stable backend API contract, and let apps talk only to that contract.
- It recommends starting with local SQLite, then moving to PostgreSQL in production.
- It also explains that localhost-only development is not enough for real multi-device use.

`C:\Users\Mahir Kachwala\Downloads\OTHER_LAPTOP_APP_INTEGRATION_README.md`

- This is a handoff/integration document for another laptop team.
- It shows the exact API base URL, expected endpoints, example fetch code, and example response shape for that other project.
- It is not the API contract for Raksha Setu, but it is a good model for how Raksha Setu should expose a stable app-facing backend.

## 2. What is true in the current Raksha Setu repo

Current app locations:

- Parent app: `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\swasthya app\app\artifacts\swasthya-setu`
- Doctor portal: `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\Medi-Admin-Hub\Medi-Admin-Hub\artifacts\admin-portal`
- Shared logic: `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\shared`
- Current JSON data: `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\data\users.json`, `children.json`, `vaccines.json`, `vaccine_records.json`, `centers.json`, `bookings.json`, `slots.json`, `messages.json`, `conversations.json`

Important reality:

- The parent app is a Vite React app.
- The parent app currently uses `dev/mockApi.ts` as a Vite plugin.
- That means the `/api/*` routes are available in development through Vite, not as a standalone production backend yet.
- The parent app is not yet a full PWA because there is currently no web manifest, service worker, or PWA plugin setup in the app.
- The repo is now self-contained for development because the JSON seed data lives in `/data`, with fallback support for the older Downloads-based layout.

Result:

- You can build the web frontends today.
- You cannot treat the current frontend alone as a complete production APK solution yet.
- For a reliable mobile APK with a live backend website, you need a real backend service running continuously.

## 3. Current recommended architecture for production

Use this structure:

```text
Raksha-Setu/
  apps/
    raksha-setu-web/
    raksha-setu-doctor-portal/
  services/
    raksha-setu-api/
  shared/
  storage/
    db/
    uploads/
  docs/
```

Mapping from the current repo:

- `apps/raksha-setu-web`
  - move contents from `swasthya app/app/artifacts/swasthya-setu`
- `apps/raksha-setu-doctor-portal`
  - move contents from `Medi-Admin-Hub/Medi-Admin-Hub/artifacts/admin-portal`
- `services/raksha-setu-api`
  - extract the current logic from `dev/mockApi.ts`
  - move JSON access, Gemini calling, voice API routes, booking sync, vaccine schedule logic, and doctor workflow APIs here
- `shared`
  - keep the reusable appointment workflow and shared types here

## 4. What you need before APK generation

You need these four layers:

1. Real backend API
2. Hosted parent web app
3. Hosted doctor portal
4. PWA setup on the parent app

### 4.1 Real backend API

Move the current dev-only API behavior out of:

- `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\swasthya app\app\artifacts\swasthya-setu\dev\mockApi.ts`

into a real backend service such as:

- Node.js + Express
- Node.js + Fastify

That backend should own:

- users
- children
- vaccines
- vaccine records
- bookings
- conversations
- messages
- centres lookup
- certificates/PDF generation
- Gemini assistant routes
- multilingual TTS/STT helper routes
- doctor workflow actions

### 4.2 Database

For quick deployment:

- SQLite is okay for one-machine demo use

For real shared production use:

- PostgreSQL is strongly recommended

Reason:

- parent app and doctor portal need shared live data
- appointments and vaccine completion status must stay consistent
- certificates, reschedules, and cancellations need reliable persistence

### 4.3 Frontend hosting

Host separately:

- Parent app on one domain/subdomain
- Doctor portal on one domain/subdomain
- Backend API on one domain/subdomain

Example:

- `https://app.rakshasetu.in`
- `https://doctor.rakshasetu.in`
- `https://api.rakshasetu.in`

### 4.4 PWA setup

To make the parent app a true PWA, add:

- `manifest.webmanifest`
- service worker
- offline asset caching strategy
- installable icons
- browser registration for the service worker

Typical parent app additions:

- PWA plugin for Vite
- manifest with app name, icons, theme color, start URL, display mode
- service worker registration in the main app entry

## 5. Exact build and deployment process

### Step 1. Keep the current repo as your working source

Do not move it into Android Studio yet as the only source of truth.

First finish:

- backend extraction
- PWA setup
- production environment variables
- deployment

### Step 2. Create a real backend

Recommended new folder:

- `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\services\raksha-setu-api`

Move or reimplement from the current frontend dev API:

- data loading/writing
- booking endpoints
- doctor action endpoints
- certificate PDF generation
- assistant endpoints
- voice endpoints

### Step 3. Point both frontends to the real backend

The parent app and doctor portal should call:

- `https://api.your-domain.com/api/...`

and should stop depending on:

- Vite-only `mockApiPlugin()`

### Step 4. Deploy the backend first

Possible hosting:

- Render
- Railway
- Fly.io
- VPS with Docker
- Cloud VM with Nginx reverse proxy

### Step 5. Deploy the web frontends

Possible hosting:

- Vercel
- Netlify
- Cloudflare Pages
- Nginx on a VPS

### Step 6. Add PWA support

After the parent web app is running on HTTPS, add:

- install manifest
- service worker
- app icons
- offline shell behavior

### Step 7. Test mobile browser install

Before building an APK, verify:

- the app opens on Android Chrome
- install prompt works
- app launches full-screen
- API calls work over HTTPS
- location, mic, and notifications work

## 6. Two ways to create the Android APK

### Option A. Android Studio WebView APK

Use this if you want the fastest path.

How it works:

- Android app contains a WebView
- WebView loads your hosted parent app URL
- backend remains on the server

You will need:

- Android Studio project
- INTERNET permission
- microphone/location permissions if used
- WebView configured to open `https://app.rakshasetu.in`

Pros:

- easiest to ship quickly
- simple Android Studio workflow

Cons:

- not a true PWA APK
- weaker install experience than Trusted Web Activity

### Option B. PWA-based APK with Trusted Web Activity

Use this if you want a real PWA install experience.

How it works:

- parent app is deployed as a proper PWA
- Android APK wraps the hosted PWA
- app opens the web app in a Chrome-powered full-screen shell

You will need:

- HTTPS domain
- valid PWA manifest
- service worker
- digital asset links / domain verification

Pros:

- best fit for a real PWA
- closer to app-like install behavior

Cons:

- requires proper web deployment first
- stricter setup than a plain WebView app

## 7. If you want to use Google Android Studio directly

For Android Studio, the clean order is:

1. Finish and deploy backend.
2. Deploy the parent web app to HTTPS.
3. Convert the parent web app into a true PWA.
4. Decide:
   - WebView wrapper APK
   - or Trusted Web Activity APK
5. Open Android Studio and create the wrapper project only after the hosted web app is stable.

Do not copy only the current Vite parent app folder into Android Studio and expect the whole product to work offline, because:

- bookings
- doctor sync
- certificates
- chatbot
- voice services
- shared database state

all depend on a backend.

## 8. What can be compiled right now

Right now you can build:

- parent web app bundle
- doctor portal bundle

But for a real mobile deployment, you still need:

- backend extraction from `mockApi.ts`
- environment configuration
- production database choice
- PWA manifest/service worker work
- hosting

## 9. Practical recommendation for your case

If your goal is:

- mobile APK generated
- backend website running
- doctor portal and parent app both live

then do this exact path:

1. Keep this repo as the master source.
2. Extract a standalone `raksha-setu-api` backend.
3. Move the current JSON-based mock data layer to backend-owned persistence.
4. Later replace JSON/SQLite with PostgreSQL for real production.
5. Deploy:
   - backend
   - parent app
   - doctor portal
6. Add PWA support to the parent app.
7. Generate Android APK from the hosted parent app:
   - WebView if you want fast delivery
   - Trusted Web Activity if you want a proper PWA APK

## 10. What I would do next in this repo

Recommended implementation order:

1. Create `services/raksha-setu-api`.
2. Move all routes from `dev/mockApi.ts` into that backend.
3. Add environment-based API URL config to both frontends.
4. Add PWA support to the parent app.
5. Prepare production `.env` files.
6. Deploy backend and both frontends.
7. Then create the Android wrapper project.

If you follow that order, the APK will simply be a mobile shell for a working live Raksha Setu system instead of a fragile local-development build.
