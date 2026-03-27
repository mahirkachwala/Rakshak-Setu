# Swasthya Setu

## Overview

Swasthya Setu is a comprehensive Indian child vaccination and health management web app, rebuilt from Flutter to React. It helps parents track their children's vaccination schedules, book appointments, find nearby health centers, and get AI-powered health guidance.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/swasthya-setu), mobile-first design
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **State management**: Zustand
- **Animations**: Framer Motion
- **i18n**: Custom i18n with 12 Indian languages (English, Hindi, Marathi, Malayalam, Telugu, Kannada, Odia, Punjabi, Bengali, Assamese, Gujarati, Tamil)

## Features (All 20 from spec)

1. User & Account System (parent profile, phone, language)
2. Family Management (add/edit/delete children, switch between children)
3. Home Dashboard ("What to do today", child status indicators)
4. Smart Vaccine Scheduler (auto-generated 0-5 year schedule from DOB)
5. Vaccine Details (name, age, mandatory/optional, description, side effects)
6. Vaccine Booking System (select vaccine → center → date/time → confirm)
7. Nearby Health Centers (auto-detect/pincode, type, cost, navigate)
8. Emergency System (floating button, call 108, rabies/tetanus redirect)
9. AI Health Assistant (chat, symptom guidance, quick suggestions)
10. Health Guidance (cards with fever/doctor visit/vaccine importance)
11. Health Records (vaccination history per child)
12. Multilingual Support (English/Hindi/Marathi full translation)
13. Offline Support indicator (banner when offline)
14. Smart Reminders (in-app alerts for due/missed vaccines)
15. Settings (language, profile, notifications, help)
16. Data & Privacy (local storage consent noted)
17. Digital Vaccine Record (view history, download placeholder)
18. Smart Center Recommendation (nearest, free, available)
19. Simple User Flow ("What should I do today" engine)
20. Navigation (bottom tab bar: Home, Schedule, Centers, Assistant, More)

## AI Assistant System (Gemini-Powered)

### Architecture
- **Backend**: `POST /api/assistant/query` route in Express API server
- **AI**: Google Gemini 2.5 Flash via Replit AI Integrations (no user API key required)
- **STT**: Browser Web Speech API (works in Chrome/Edge for Hindi and regional langs)
- **TTS**: Browser SpeechSynthesis API with language-aware voice selection

### Pipeline
1. User speaks or types a query
2. Frontend sends `{ message, childId, lat, lng, language }` to `/api/assistant/query`
3. Backend detects intent via keyword matching + Gemini
4. Child's vaccine schedule injected into Gemini context (if childId provided)
5. Nearest centers from DB injected as context (if lat/lng provided)
6. Gemini returns structured JSON: `{ intent, message, type, suggestions }`
7. Backend enriches with `action_data` based on intent
8. Frontend renders intent-specific action cards + speaks the response

### Intent Types
- `BOOK_APPOINTMENT` → shows center card + slots + BookingModal trigger
- `FIND_CENTER` → shows nearest 3 centers list + map link
- `VACCINE_SCHEDULE` → shows inline vaccine status cards + schedule link
- `CHILD_FEVER` → warning bubble with home care guidance
- `EMERGENCY` → big red 108 call button
- `GENERAL` → standard chat bubble

### Key Files
- `artifacts/api-server/src/routes/assistant.ts` — main backend route
- `artifacts/swasthya-setu/src/pages/Assistant.tsx` — frontend with voice + intent cards
- `lib/integrations-gemini-ai/` — Gemini SDK integration
- `AI_INTEGRATIONS_GEMINI_BASE_URL` + `AI_INTEGRATIONS_GEMINI_API_KEY` — env vars (auto-set)

### Important Notes
- Gemini automatically responds in the user's language (Hindi if query is Hindi, etc.)
- `@google/genai` is added as a DIRECT dependency of api-server (it's externalized from the esbuild bundle so must be installed separately)
- Falls back to keyword-based responses if Gemini fails

## New Features Added

### Centers Page — Interactive Map
- **651 health facilities** from real Indian government open datasets
  - Mumbai: 31 hospitals (Major & Peripheral) + 211 UPHCs from KML
  - Hyderabad: 388 health facilities (Area Hospitals, PHCs, CHCs, Basti Dawakhanas, Ayush) from KML
  - Chennai: 21 UHCs + 12 UPHCs from CSV (approximate coordinates)
- **Leaflet map** with MarkerClusterGroup, color-coded by facility type
- **Browser Geolocation API** to show nearest facilities sorted by distance
- Filter by city (Mumbai/Hyderabad/Chennai) and facility type
- Map/List view toggle, Navigate and View on Map CTAs
- Health facilities JSON: `public/health-facilities.json`

### Onboarding Tutorial (NEW)
- 3-slide tutorial shown only on first launch (stored in `localStorage`)
- Slide 1: "Never Miss a Vaccine" — vaccination tracking intro with NIS illustration
- Slide 2: "Find Centres Near You" — health center finder preview
- Slide 3: "Smart Health Assistant" — AI chat + ABHA intro
- Skip button, Back/Continue navigation, animated transitions
- `ONBOARDING_KEY = 'swasthya-setu-onboarded-v1'` in localStorage
- File: `artifacts/swasthya-setu/src/pages/Onboarding.tsx`

### Full Month Calendar on Home (NEW)
- Replaced 14-day date strip with complete month grid (Sun-Sat headers)
- Prev/Next month navigation
- Colored dots per day: green=completed, amber=due, red=missed, blue=upcoming
- Click any day to see vaccines scheduled for that date
- Upcoming vaccines list (sorted by date) with days-until badge
- Recent Completed section
- Cleaner non-gradient design (white cards with subtle borders)

### ABHA Integration — Full Flow + Real Data
- **Route**: `/abha` (accessible from Settings → ABHA card)
- Complete 5-step creation flow: Home → Method selection → Aadhaar/Mobile input → OTP verification → Success → Card view
- **Now uses real parent name** from `useGetUserProfile()` for ABHA card
- **Now uses real child DOB/gender** from `useListChildren()` for the card
- ABHA card + linked data **persisted in localStorage** (`swasthya-setu-abha-data`)
- Returning users see their ABHA card immediately without re-going through the flow
- "Reset / Clear ABHA data" button in card view
- Phone number pre-filled from parent profile
- ABHA ID and address generated from real parent name

### Settings Page Updated
- Prominent ABHA card linking to `/abha` with NHA/ABDM compliance badges
- Configurable notification reminder days
- Government schemes section (PM-JAY, RBSK, JSY, Mission Indradhanush)

## Structure

```
artifacts/swasthya-setu/   # React + Vite frontend
  src/
    pages/                 # Home, Schedule, Centers, Assistant, Emergency, Children, Settings, Guidance, ABHA
    components/            # Layout (bottom nav, header), UI components
    lib/                   # i18n, utils
    store.ts               # Zustand global state (active child, language)
  public/
    health-facilities.json # 651 parsed health facilities (Mumbai/Hyderabad/Chennai)
artifacts/api-server/      # Express 5 API
  src/routes/              # users, children, vaccines, centers, bookings, records, ai, dashboard
lib/db/src/schema/         # users, children, vaccines, vaccineRecords, centers, bookings
lib/api-spec/openapi.yaml  # OpenAPI contract
scripts/src/seed.ts        # Vaccine data and health centers seed
attached_assets/           # Source datasets (KML/CSV from government open data)
```

## Seeds

29 standard Indian vaccination schedule vaccines (birth → 5 years) and 6 health centers (Bengaluru sample data) are seeded via `pnpm --filter @workspace/scripts run seed`.

## API Endpoints

- `GET /api/dashboard/summary` - Family dashboard summary
- `GET/PUT /api/users/profile` - User profile
- `GET/POST /api/children` - Children list/create
- `GET/PUT/DELETE /api/children/:id` - Child CRUD
- `GET /api/children/:id/vaccine-schedule` - Child vaccine schedule
- `POST /api/children/:id/vaccines/:vaccineId/complete` - Mark vaccine done
- `GET /api/vaccines` - All vaccines
- `GET /api/centers?pincode=xxx` - Health centers
- `GET/POST /api/bookings` - Bookings
- `GET/DELETE /api/bookings/:id` - Booking management
- `GET /api/records/:childId` - Health records
- `POST /api/ai/chat` - AI health assistant
