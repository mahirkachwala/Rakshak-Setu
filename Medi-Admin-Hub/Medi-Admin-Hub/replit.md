# Swasthya Setu Admin Portal

## Overview

Full-stack Doctor/Admin Portal for Swasthya Setu — a healthcare vaccination management system. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/admin-portal)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **State management**: Zustand (auth state)
- **Data fetching**: React Query + generated hooks
- **Charts**: Recharts
- **Auth**: JWT-style token (base64) stored in localStorage

## Login Credentials (for development)

- **Doctor**: doctor@swasthyasetu.in / doctor123
- **Admin**: admin@swasthyasetu.in / admin123
- **Staff**: staff@swasthyasetu.in / staff123

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── admin-portal/        # React + Vite frontend (previewPath: /)
│   └── api-server/          # Express API server (previewPath: /api)
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/                 # Utility scripts (seed.ts)
└── ...
```

## Database Schema

- **users** — Doctors, staff, admins with roles
- **centers** — PHC/UPHC/CHC/Hospital centers
- **children** — Child patient records
- **appointments** — Vaccination appointments with full status workflow:
  - Statuses: `booked` → `checked_in` → `vaccinated` → `completed` (forward flow)
  - Terminal: `cancelled`, `rescheduled`, `no_show`, `missed`
  - Extra columns: `checkinTime`, `vaccinationTime`, `cancelReason`, `parentAppointmentId`
- **slots** — Available time slots per center
- **vaccination_records** — Completed vaccination history

## API Routes

- POST `/api/auth/login` — Login
- GET `/api/auth/me` — Current user
- GET `/api/dashboard/stats` — Dashboard statistics
- GET `/api/appointments` — List appointments (filterable)
- GET `/api/appointments/:id` — Single appointment
- PATCH `/api/appointments/:id/status` — Legacy status update
- POST `/api/appointments/:id/checkin` — Check in patient (booked → checked_in)
- POST `/api/appointments/:id/vaccinate` — Mark vaccinated (checked_in → vaccinated)
- POST `/api/appointments/:id/complete` — Complete record (vaccinated → completed)
- POST `/api/appointments/:id/cancel` — Cancel with reason
- POST `/api/appointments/:id/reschedule` — Reschedule (creates new appointment, marks old as rescheduled)
- GET `/api/patients` — Patient records
- GET/POST `/api/slots` — Slot management
- GET/POST/PUT `/api/centers` — Center management (Admin)
- GET `/api/vaccinations` — Vaccination records

## Frontend Pages

1. Login page
2. Dashboard (stats, upcoming appointments, chart)
3. Appointments — card layout with full vaccination workflow:
   - Status timeline visual (Booked → Checked In → Vaccinated → Completed)
   - Contextual action buttons per status
   - Action confirmation modals (secret code verify, batch number, cancel reason, reschedule date)
   - Detail view modal
4. Patients (list with vaccine progress)
5. Patient Detail (timeline view)
6. Slot Management (per center, date)
7. Centers (admin only)
8. Vaccinations (records)

## Design Theme

Based on the OneDoc-style healthcare dashboard reference:
- Primary: Blue (#3B82F6 / hsl 221 83% 53%)
- Background: Light slate (#F8FAFC)
- Cards: White with soft shadows
- Status badge colors: blue=booked, violet=checked_in, cyan=vaccinated, green=completed, red=cancelled/missed, orange=rescheduled

## Seeding

Run seed script: `pnpm --filter @workspace/scripts run seed`
