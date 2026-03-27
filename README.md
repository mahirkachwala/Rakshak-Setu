# Raksha Setu Ecosystem

This workspace contains the complete Raksha Setu vaccination ecosystem:

1. The parent and child vaccination app
2. The doctor and admin dashboard
3. Shared booking, certificate, and appointment workflow logic
4. Local JSON-backed mock APIs and development data
5. Multilingual assistant, voice, and chatbot experiences

The current local setup runs on:

- Parent app: `http://127.0.0.1:3000/`
- Doctor dashboard: `http://127.0.0.1:3001/`

## Product Overview

Raksha Setu is designed as a connected routine immunization platform for Indian families and healthcare providers.

For packaging and deployment planning, see [RAKSHA_SETU_PWA_APK_DEPLOYMENT_GUIDE.md](./RAKSHA_SETU_PWA_APK_DEPLOYMENT_GUIDE.md).

The parent app helps caregivers:

- Create and manage the family profile
- Track vaccine schedules for each child
- Discover nearby government hospitals and vaccination centres
- Book appointments
- View live appointment status updates
- Download appointment, reschedule, cancellation, and vaccination certificates
- Use a multilingual assistant for guidance and booking help

The doctor dashboard helps providers:

- View all incoming bookings
- Check in children on arrival
- Vaccinate and complete the appointment
- Reschedule or cancel appointments
- Add doctor remarks and vaccination details
- Trigger certificate and PDF generation
- Keep both the provider portal and parent app synchronized

## Repository Structure

`/swasthya app/app/artifacts/swasthya-setu`

- Parent-facing React and Vite application
- Frontend routes, onboarding, assistant UI, centres map, schedule, settings, ABHA flow
- Local mock API used during development

`/Medi-Admin-Hub/Medi-Admin-Hub/artifacts/admin-portal`

- Doctor and admin dashboard
- Appointment management, dashboard, provider workflows, PDF actions

`/shared`

- Shared appointment workflow logic used by both applications
- Common status handling and booking synchronization rules

`/data`

- Repo-local JSON database files used by the mock APIs
- Includes users, children, vaccines, vaccine records, centres, bookings, slots, messages, and conversations

## Main User App Features

### 1. Onboarding and Family Creation

The app begins with a language-first onboarding experience.

Flow:

1. User selects the app language
2. Tutorial and onboarding screens follow the chosen language
3. Parent profile is collected
4. Child profile is collected
5. If DOB is in the past, birth-dose vaccine questions can be asked
6. Profile is stored in the shared JSON-backed data layer

Implemented capabilities:

- Language selection before data collection
- Voice-guided onboarding prompts using Swasthya Sewa
- Parent and child data persistence
- Child and parent names stay synchronized instead of showing stale defaults

### 2. Multilingual Experience

The app supports multiple Indian languages across major guided flows.

Coverage includes:

- Onboarding
- Chatbot UI
- Voice prompts on interactive forms
- Centres guidance
- Schedule support text
- Assistant prompt flow

Current behavior:

- The chatbot now enforces English fallback when the app language is English
- Chatbot voice playback is tuned separately from the rest of the app
- Floating assistant and full assistant page use the same core chat engine

### 3. Swasthya Sewa Voice Assistant

Swasthya Sewa is the assistant persona used across the app.

Assistant capabilities include:

- Speaking instructions on input-heavy screens
- Auto-listening after prompts on supported guided flows
- Replaying prompts with `Listen again`
- Accepting voice replies in the chatbot
- Stopping previous speech when the user changes routes

Voice stack:

- Browser speech recognition for mic input
- Browser speech synthesis and local TTS fallback support
- Optional premium TTS integration path
- Chatbot speech rate tuned to `1.25x`

### 4. Chatbot

The chatbot is available in two modes.

Mode 1: Full assistant page

- Opened from the bottom navigation `Assistant` tab
- Uses the full page route at `/assistant`

Mode 2: Floating compact assistant

- Available from the floating assistant launcher on non-assistant screens
- Opens in a compact half-screen style panel instead of a full-screen drawer

Chatbot layout includes:

- Top-right Swasthya Sewa vector avatar
- Conversation area in the middle
- Bottom text composer
- `Listen again` button
- `Answer by voice` button

Chatbot intelligence:

- Gemini-backed healthcare and app-context responses
- App-aware prompts for schedule, centres, booking, and emergency help
- English fallback when English is the active app language
- Context-aware responses using selected child, bookings, centres, and app state

### 5. Centres and Hospital Discovery

The centres page supports nationwide hospital discovery using a large public health-facility dataset.

Capabilities:

- Full India government facility dataset loaded into the app
- Search by name, district, state, and pincode
- Nearest-centre discovery from current location
- Map and list views
- Government hospital and public facility coverage

### 6. Vaccine Schedule

The schedule module shows child-specific vaccine progress.

Capabilities:

- Due vaccines
- Upcoming vaccines
- Missed vaccines
- Completed vaccines
- Certificate downloads for completed records

### 7. Appointment Booking

Appointments can be started from:

- The centres page
- Schedule suggestions
- Chatbot booking flow

Booking behavior:

1. User asks the chatbot to book an appointment
2. Chatbot asks for location
3. User shares city, pincode, district, or current location
4. App lists nearby government hospitals
5. User selects a hospital
6. App shows available slots
7. User selects a slot
8. Booking modal opens with the hospital and slot prefilled
9. User manually taps the final booking button

This preserves user confirmation at the final booking step while still making the assistant useful.

### 8. PDFs and Certificates

The parent app can surface downloadable documents generated through the synchronized appointment workflow.

Supported outputs:

- Appointment slip PDF
- Reschedule slip PDF
- Cancellation slip PDF
- Vaccination certificate

## Doctor Dashboard Features

The doctor dashboard is the provider-facing operational console.

### Dashboard

- Appointment overview
- Operational entry point for doctor workflows
- Graph-heavy top-page content was simplified to focus on actions

### Appointment Workflow

Doctors can:

- Review new bookings
- Check in the child
- Mark vaccination as completed
- Reschedule an appointment
- Cancel an appointment
- Add remarks
- Record provider-side updates that immediately reflect in the parent app

### Resulting Parent-App Sync

When the doctor updates an appointment:

- The status changes in the parent app
- Related certificate or PDF actions become available
- Updated date and slot values are reflected if rescheduled
- Cancellation and reschedule slips are generated with remarks

## Shared Appointment Lifecycle

Appointment statuses and transitions are centrally coordinated through shared logic.

Typical lifecycle:

1. `booked`
2. `checked_in`
3. `vaccinated` or `completed`
4. Optional alternate path: `rescheduled`
5. Optional alternate path: `cancelled`

Outcome rules:

- Completed vaccination enables certificate download
- Reschedule generates reschedule PDF and updates future booking details
- Cancellation generates cancellation PDF
- Doctor remarks persist with the record

## Process Flows

### Parent Journey

1. Open app
2. Select language
3. Complete tutorial
4. Create parent and child profile
5. Review vaccine schedule
6. Discover nearest hospital
7. Book appointment
8. Attend visit
9. Track live appointment updates
10. Download relevant slips or vaccination certificate

### Doctor Journey

1. Open doctor dashboard
2. Review incoming appointment
3. Check in child on arrival
4. Vaccinate or update status
5. Reschedule or cancel if needed
6. Add remarks
7. Trigger downstream certificate or slip availability in parent app

### Chatbot Booking Journey

1. User says `Book appointment`
2. Bot asks for location
3. User shares location or uses current location
4. Bot shows nearest hospitals
5. User chooses hospital
6. Bot shows slot options
7. User chooses slot
8. Booking modal opens prefilled
9. User manually confirms booking

## Data Model and Local Development Storage

The current development environment uses local JSON data files that mirror the logical schema.

Core entities:

- Users
- Children
- Vaccines
- Vaccine records
- Centres
- Bookings
- Conversations
- Messages

The local mock API maps these files into app-ready endpoints so both parent app and doctor portal can work without a separate hosted backend during development.

## Integration Details

### Parent App + Doctor Portal Sync

Both applications read and write through a shared appointment workflow layer.

That means:

- Booking in the app appears in the doctor portal
- Doctor updates appear back in the app
- Status changes do not need duplicate manual entry
- Certificates and slips use consistent appointment data

### Assistant Integration

The assistant uses:

- Shared chat panel UI
- Shared voice guide component
- App-aware API response generation
- Gemini-backed response generation for broader healthcare and app questions

## Key UX Differences Between the Two Apps

### Parent App

Focus:

- Caregiver guidance
- Child profile creation
- Vaccine awareness
- Appointment booking
- Voice help
- Certificates and status visibility

Interaction style:

- Mobile-first
- Guided
- Voice-assisted
- Family-friendly

### Doctor Dashboard

Focus:

- Operational appointment handling
- Vaccination status control
- Check-in and completion workflow
- Reschedule and cancellation management
- Provider remarks and documentation

Interaction style:

- Task-driven
- Administrative
- High-density workflow controls

## Current Local Runtime

The current project is running locally through Vite development servers.

Ports:

- `3000` for parent app
- `3001` for doctor dashboard

Important note:

- The parent app in this workspace is a React web app
- It is no longer a Flutter web project in its current runnable state

## Development Notes

Current notable implementation points:

- The chatbot floating launcher now opens a compact panel
- The bottom navigation `Assistant` tab opens the full assistant page
- Chatbot voice speed is tuned to `1.25x`
- English app mode now forces English-safe bot text fallback if a response comes back in another script
- Booking is assistant-guided but still user-confirmed at the last step

## Recommended Next Enhancements

Potential next steps for product polish:

1. Complete full multilingual localization across every remaining static screen
2. Replace remaining browser-dependent speech input with a more robust multilingual STT pipeline
3. Add stronger role and centre filtering in the doctor portal
4. Add automated test coverage for booking sync and certificate generation
5. Move from JSON-backed development data to a real production database and auth system

## Summary

This workspace now functions as a connected vaccination platform with:

- A caregiver-facing multilingual vaccination app
- A doctor-facing appointment management portal
- Shared live booking and status synchronization
- Assistant-guided booking and support
- Certificate and PDF generation
- Local development data and APIs for end-to-end testing
