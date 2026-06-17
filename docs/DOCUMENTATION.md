# NIVLE E-Kadi — Comprehensive Application Documentation

**Version:** 0.1.1  
**Last updated:** June 2026  
**Repository:** [thesyntrixi/nivle-e-kadi](https://github.com/thesyntrixi/nivle-e-kadi)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Features](#3-features)
4. [External Services](#4-external-services)
5. [Environment Variables](#5-environment-variables)
6. [Deployment](#6-deployment)
7. [Business Logic Decisions](#7-business-logic-decisions)
8. [Known Limitations & Future Improvements](#8-known-limitations--future-improvements)

---

## 1. Project Overview

### What is NIVLE E-Kadi?

**NIVLE E-Kadi** is a digital invitation management platform built for the Tanzanian events market. It allows NIVLE (a digital invitations business) to:

- Manage **clients** (event organizers) and their **events** (weddings, birthdays, conferences, corporate events, etc.)
- Import and manage **guest lists** with phone numbers
- Send personalized **SMS** and **WhatsApp** invitations with custom card images
- Track **RSVP** responses via WhatsApp quick-reply buttons
- Run **check-in** at event venues using QR codes (admin or dedicated staff accounts)
- Send **thank-you / marketing messages** (Tuma Shukrani) after events
- Generate and email **PDF check-in reports**

The admin panel is used internally by NIVLE staff to operate the service on behalf of clients. Guests interact via WhatsApp/SMS invitations, a public invite page, and QR codes scanned at the venue.

### Business Context

Tanzanian events (especially weddings) often involve hundreds of guests. Physical cards are expensive and slow to distribute. NIVLE E-Kadi replaces that workflow with:

1. Digital card images (often personalized per guest or per couple name)
2. WhatsApp as the primary channel (high penetration in Tanzania)
3. SMS as a fallback channel
4. QR-based check-in instead of paper guest books

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, custom design system (`components/ui/`) |
| **Database** | PostgreSQL (hosted on **Neon**; previously Render) |
| **ORM / DB access** | Raw SQL via `pg` connection pool (`lib/db.ts`) |
| **Hosting** | Vercel (serverless API routes + static/SSR pages) |
| **File storage** | Vercel Blob (guest card images, uploads) |
| **SMS** | NextSms (`messaging-service.co.tz`) |
| **WhatsApp** | Meta WhatsApp Cloud API (Graph API v21.0) |
| **Email** | Resend (check-in PDF reports) |
| **PDF generation** | jsPDF + jspdf-autotable (server-side) |
| **QR scanning** | html5-qrcode (browser camera) |
| **QR generation** | `qrcode` / `qrcode.react` |
| **Auth** | Custom bcrypt + HTTP-only cookie (`auth_token`) |

### Live URLs

| URL | Purpose |
|-----|---------|
| **https://admin.nivle-ekadi.com** | Admin dashboard (production) |
| **https://nivle-ekadi.com** | Public-facing domain (guest invite pages, marketing) |
| `https://admin.nivle-ekadi.com/invite/{code}` | Public guest invitation + QR display |
| `https://admin.nivle-ekadi.com/api/webhooks/whatsapp` | Meta WhatsApp webhook endpoint |

> **Note:** `NEXT_PUBLIC_APP_URL` must be set to the correct public base URL so QR codes and invite links resolve correctly.

---

## 2. Architecture

### Folder Structure

```
K:\nivle-e-kadi\
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login (no sidebar)
│   │   └── login/page.tsx
│   ├── (dashboard)/              # Protected admin UI (sidebar layout)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── clients/              # Client CRUD
│   │   ├── events/               # Event CRUD
│   │   ├── cards/                # Card template management
│   │   ├── guests/               # Guest lists per event
│   │   ├── messages/             # Messages panel + per-guest chat
│   │   ├── reports/              # Analytics dashboard
│   │   ├── checkin/              # Admin QR check-in scanner
│   │   ├── check-in-staff/       # Staff check-in (role-restricted)
│   │   ├── settings/             # Profile, password, staff management
│   │   └── layout.tsx            # Dashboard shell + sidebar
│   ├── invite/[code]/            # Public guest invitation page
│   └── api/                      # Backend API routes (see below)
│
├── components/
│   ├── dashboard/                # Sidebar, nav, tables, ChatWindow
│   ├── checkin/                  # StaffEventScanner
│   ├── events/                   # TumaShukraniButton, SendInvitationsButton
│   ├── forms/                    # AddGuestManualForm, etc.
│   ├── settings/                 # Profile, Security, Staff sections
│   └── ui/                       # Button, Card, Input, Alert, Spinner
│
├── lib/
│   ├── database/
│   │   ├── schema.sql            # Canonical PostgreSQL schema
│   │   ├── types.ts              # TypeScript types for all entities
│   │   └── queries.ts            # Reusable SQL query functions
│   ├── services/
│   │   ├── sms.ts                # NextSms integration
│   │   ├── whatsapp.ts           # Meta WhatsApp Cloud API
│   │   ├── email.ts              # Resend (check-in reports)
│   │   ├── shukrani.ts           # Thank-you message builders
│   │   └── checkin-report-pdf.ts # PDF report generation
│   ├── utils/
│   │   ├── phone.ts              # Tanzania phone normalization
│   │   └── swahili-datetime.ts   # Swahili date/time formatting
│   ├── auth.ts                   # bcrypt login helpers
│   ├── token.ts                  # Cookie token encode/decode
│   ├── staff-auth.ts             # Role-based API guards
│   ├── db.ts                     # PostgreSQL connection pool
│   └── guest-qr.ts               # Public QR URL helpers
│
├── scripts/                      # Database migration scripts (npm run db:*)
├── docs/                         # Project documentation
├── public/                       # Static assets (logo, etc.)
└── middleware.ts                 # Route protection by role
```

### Database Schema

PostgreSQL database: `nivle_e_kadi`. All tables use UUID primary keys and `TIMESTAMPTZ` timestamps.

#### Entity Relationship Overview

```
users
  └── clients (user_id)
        └── events (client_id)
              ├── guests (event_id)
              │     └── messages (guest_id, event_id)
              ├── card_templates (event_id)
              └── reports (event_id)

users (role = check-in-staff)
  └── staff_events (staff_id → event_id)
```

#### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | VARCHAR(255) | Unique login email |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `name` | TEXT | Display name (profile) |
| `phone` | TEXT | Contact phone (profile) |
| `role` | VARCHAR(20) | `admin` or `check-in-staff` |
| `is_active` | BOOLEAN | Account enabled |
| `created_at`, `updated_at` | TIMESTAMPTZ | Audit timestamps |

#### `clients`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID → users | Owning admin account |
| `name` | VARCHAR(255) | Client / organizer name |
| `phone` | VARCHAR(20) | Client phone |
| `email` | VARCHAR(255) | Optional |
| `company_name` | VARCHAR(255) | Optional business name |
| `is_active` | BOOLEAN | Soft-delete flag |

#### `events`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `client_id` | UUID → clients | Parent client |
| `name` | VARCHAR(255) | Event title |
| `family_name` | TEXT | Host/couple name (weddings) — used in WhatsApp template {{2}} |
| `type` | VARCHAR(50) | `Wedding`, `Birthday`, `Conference`, `Corporate`, `Other` |
| `date` | DATE | Event date |
| `time` | TIME | Event time |
| `venue` | VARCHAR(255) | Location name |
| `location_link` | VARCHAR(500) | Google Maps URL |
| `card_template_url` | VARCHAR(500) | Legacy/default card URL |
| `status` | VARCHAR(50) | `Draft`, `Active`, `Completed` |
| `guest_count` | INT | Cached guest count |

#### `guests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `event_id` | UUID → events | Parent event |
| `name` | VARCHAR(255) | Guest name (as entered — may be a couple) |
| `phone` | VARCHAR(20) | Normalized to `255XXXXXXXXX` on add/import |
| `email` | VARCHAR(255) | Optional |
| `invitation_code` | VARCHAR(20) | Unique code (e.g. `WED-00001`) — used in QR/URLs |
| `qr_code_url` | VARCHAR(500) | Optional stored QR image |
| `personalized_card_url` | VARCHAR(500) | Per-guest card image URL (Vercel Blob) |
| `sent_at` | TIMESTAMPTZ | When invitation was sent |
| `status` | VARCHAR(50) | `Pending`, `Sent`, `Delivered`, `Opened`, `Failed` |
| `checked_in` | BOOLEAN | Venue check-in flag |
| `checked_in_at` | TIMESTAMPTZ | Check-in timestamp |
| `rsvp_status` | VARCHAR(20) | `pending`, `attending`, `not_attending` |
| `rsvp_at` | TIMESTAMPTZ | When RSVP was recorded |
| `guest_type` | VARCHAR(10) | `single` or `double` |

#### `messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `guest_id` | UUID → guests | Related guest |
| `event_id` | UUID → events | Related event |
| `message_type` | VARCHAR(50) | `WhatsApp` or `SMS` |
| `direction` | VARCHAR(10) | `outbound` or `inbound` |
| `content` | TEXT | Message body |
| `status` | VARCHAR(50) | `Pending`, `Sent`, `Delivered`, `Failed` |
| `external_message_id` | VARCHAR(255) | Provider message ID |
| `sent_at` | TIMESTAMPTZ | Send/delivery time |

#### `card_templates`

Stores uploaded card design files per event (PNG/JPG/PDF metadata).

#### `reports`

Legacy/snapshot report records per event (sent/delivered/opened counts).

#### `staff_events`

Junction table assigning `check-in-staff` users to specific events.

#### Views

- **`event_stats`** — per-event guest and delivery statistics
- **`client_overview`** — per-client event and guest aggregates

### Authentication System

NIVLE E-Kadi uses a **custom authentication** system (not NextAuth sessions in production flow):

1. **Login** (`POST /api/auth/login`): email + password verified with bcrypt against `users` table.
2. **Token**: A base64-encoded JSON payload (`userId`, `role`, `iat`, `exp`) stored in HTTP-only cookie `auth_token` (24-hour expiry).
3. **Middleware** (`middleware.ts`): Runs on all routes except static assets. Checks cookie, enforces role-based access.
4. **Roles**:
   - **`admin`**: Full access to dashboard, all APIs except staff-only endpoints.
   - **`check-in-staff`**: Only `/check-in-staff` pages and `/api/staff/*` + `/api/auth/me`.

**Public paths** (no auth required):
- `/login`, `/api/auth/login`, `/api/auth/logout`
- `/invite/*` (public guest pages)
- `/api/webhooks/whatsapp` (Meta webhook)
- `/api/public/qr/*` (public QR endpoint)

**API authorization patterns:**
- Admin routes: `verifyToken()` → check `userId` → verify resource ownership via `clients.user_id`
- Staff routes: `requireAuth()` + `requireStaff()` + `isStaffAssignedToEvent()`
- Check-in report/stats: `requireAdmin()` only

---

## 3. Features

### Guest Management

**What it does:**
- Add guests manually (name, phone, optional email, Single/Double type)
- Bulk import from Excel/CSV (`POST /api/guests/bulk-import`)
- View/edit/delete guests per event (`/guests/[eventId]`)
- Each guest gets a unique `invitation_code` (prefix by event type: WED, BDA, CON, etc.)
- Phone numbers normalized to Tanzania format `255XXXXXXXXX` on save

**Single vs Double guest types — WHY:**

In Tanzanian events (especially weddings), invitations are often addressed to:
- **Single** — one named person (1 seat)
- **Double** — a couple or two people under one name (2 seats)

This affects:
- Message wording (singular vs plural Swahili: *umekaribishwa* vs *mmekaribishwa*)
- Display labels on invitations and check-in screens
- Batch sending (Single and Double guests are sent in separate batches because card images and message tone may differ)

**Pages:** `/guests`, `/guests/[eventId]`  
**APIs:** `GET/POST /api/guests`, `GET/PUT/DELETE /api/guests/[id]`, `POST /api/guests/bulk-import`

---

### Events Management

**What it does:**
- Create events under a client with name, type, date, time, venue, map link
- `family_name` field for wedding host/couple names (shown in WhatsApp invitation)
- Event status workflow: Draft → Active → Completed
- Event detail page includes guest table actions and Tuma Shukrani button

**Pages:** `/events`, `/events/new`, `/events/[id]`  
**APIs:** `GET/POST /api/events`, `GET/PUT/DELETE /api/events/[id]`

---

### Bulk Import

**What it does:**
- Upload Excel (`.xlsx`) or CSV with guest name + phone columns
- Validates and normalizes phone numbers; skips invalid rows with error report
- Detects duplicates within file and against existing event guests
- Auto-generates unique invitation codes

**WHY:** Wedding guest lists often arrive as Excel from clients. Manual entry for 300+ guests is impractical.

**API:** `POST /api/guests/bulk-import`

---

### Messages Panel + ChatWindow + Inbound Messages

**What it does:**
- **`/messages`**: Lists all guests with recent message activity; filter by event
- **`/messages/[guestId]`**: Per-guest chat view using `ChatWindow` component
- Shows outbound SMS/WhatsApp history with delivery status icons
- Admin can send ad-hoc SMS or WhatsApp text replies from the chat UI
- **Inbound WhatsApp messages** are captured by the webhook and stored in `messages` with `direction = 'inbound'`

**WHY ChatWindow:**
Guests reply on WhatsApp with questions ("Nani anahudhuria?", "Dress code?"). NIVLE needs a simple inbox to read and respond without opening Meta Business Manager.

**Inbound flow:**
1. Guest sends WhatsApp text → Meta webhook `POST /api/webhooks/whatsapp`
2. System matches phone via `getGuestByPhone()` (last 9 digits)
3. Inserts row into `messages` table

**APIs:** `GET /api/messages`, `GET /api/messages/[id]`, `POST /api/messages/send`

---

### Tuma kwa Mtu Mmoja (Send Single)

**What it does:**
- Send invitation to **one guest** at a time from the guests table
- Requires uploading a **personalized card image** per guest (multipart form or `card_image_url`)
- Sends both SMS and WhatsApp invitation template
- Also sends `nivle_qr_checkin` WhatsApp template with guest's QR code image
- Stores `personalized_card_url` on the guest record

**WHY per-guest card upload (not bulk):**

Wedding cards are often personalized — guest name printed on the card image. Each card is unique (designed in Canva/Photoshop per guest or per couple). Bulk send (`Tuma Mialiko`) uses one shared card image for all guests of the same type; single send allows the premium personalized workflow.

**API:** `POST /api/guests/send-single`

---

### Tuma Mialiko (Bulk Send / Send Batch)

**What it does:**
- Sends invitations to pending guests in **batches** (default 10, max 25 per request)
- Separates by `guest_type` (single batch vs double batch)
- Uses one **event-level card image** from `card_templates` / `getEventCardImageUrl()`
- Sends SMS + WhatsApp `nivle_event_invitation` for each guest
- 400ms delay between guests to avoid rate limits
- Frontend polls `GET /api/guests/send-batch?event_id=` for remaining counts and loops until done

**WHY batched:**
Vercel serverless functions have a **~10–60 second timeout**. Sending 300 guests sequentially would exceed this. Batching lets the UI call the API repeatedly, sending 10–25 guests per invocation.

**API:** `GET/POST /api/guests/send-batch`

---

### Tuma Shukrani (Thank You + Marketing)

**What it does:**
- After an event, send thank-you messages to guests who were checked in (or all sent guests — per query logic)
- Channel choice: **SMS only** or **WhatsApp only** (not both simultaneously in UI)
- SMS: short message with NIVLE marketing CTA and phone number (fits 160 chars)
- WhatsApp: `nivle_shukrani` template

**WHY:**
Post-event follow-up converts attendees into future clients. The message thanks them and advertises NIVLE's digital invitation services.

**UI:** `TumaShukraniButton` on events table and event detail page  
**API:** `GET/POST /api/guests/send-shukrani`

---

### RSVP Webhook

**What it does:**
- `nivle_event_invitation` WhatsApp template includes quick-reply buttons:
  - **"Nitakuwepo ✅"** → `rsvp_status = attending`
  - **"Sitakuwepo ❌"** → `rsvp_status = not_attending`
- Webhook listens for `interactive.button_reply` events
- Updates `guests.rsvp_status` and `guests.rsvp_at`

**WHY lock after first response:**

```typescript
if (currentRsvp !== 'pending') {
  // ignore duplicate — first response wins
  continue;
}
```

Guests may tap buttons multiple times or change their mind via accidental taps. Locking after the first RSVP prevents data flip-flopping and reflects a clear commitment. To change RSVP, admin must update manually in the database or a future admin UI.

**API:** `GET/POST /api/webhooks/whatsapp`

---

### Check-in System

#### Admin Check-in (`/checkin`)

- Select event from dropdown
- Live counter: **"Wamefika: {checked_in}/{total}"**
- QR scanner (phone camera via `html5-qrcode`) + manual code entry
- On scan: `POST /api/guests/checkin` with invitation code
- Shows success / already-checked-in / invalid states
- **Tuma Report** button: generates PDF and emails to `nivle.ekadi@gmail.com`

#### Staff Check-in (`/check-in-staff`)

- Staff logs in with `check-in-staff` role account
- Sees only events assigned via Staff Management
- Per-event scanner (`StaffEventScanner` component)
- Same live counter format
- Check-in scoped to assigned event: `POST /api/staff/check-in`

**WHY two roles:**
Event venue staff (ushers) need check-in access without seeing client data, messages, or financials. Admin retains full control; staff gets a minimal scanner UI.

**APIs:**
- `POST /api/guests/checkin` (admin — any event)
- `POST /api/staff/check-in` (staff — assigned event only)
- `GET /api/staff/check-in/[eventId]/stats`
- `GET /api/checkin/stats?event_id=` (admin counter)
- `POST /api/checkin/report` (admin PDF email)

---

### Check-in Report (PDF → Email)

**What it does:**
1. Admin clicks **Tuma Report** on check-in page
2. `POST /api/checkin/report` fetches all guests + check-in data
3. Generates PDF with:
   - Header (event name, date, generated timestamp)
   - Summary (total, attended, absent, attendance %)
   - Table **WALIOFIKA** (checked-in guests, sorted by check-in time)
   - Table **HAWAKUJA** (not checked-in, sorted alphabetically)
   - Footer branding
4. Emails PDF via Resend to `nivle.ekadi@gmail.com`

**Libraries:** `jspdf`, `jspdf-autotable`  
**Service:** `lib/services/checkin-report-pdf.ts`, `lib/services/email.ts`

---

### Settings Page

**Route:** `/settings` (tabs via `?tab=`)

| Tab | Features |
|-----|----------|
| **Profile** | Update name, email, phone (`POST /api/auth/update-profile`) |
| **Security** | Change password (`POST /api/auth/change-password`) |
| **Staff Management** | Create check-in staff accounts, assign events, deactivate staff |

**APIs:** `/api/auth/me`, `/api/staff/*`

---

### Cards Management

**What it does:**
- Upload card template images per event (`/cards`, `POST /api/cards/upload`)
- Card images stored in Vercel Blob
- Used as WhatsApp template header image for bulk send
- Per-guest personalized cards uploaded at send-single time

---

### Reports Dashboard

**Route:** `/reports`  
Analytics charts for message delivery, guest stats across events.  
**APIs:** `/api/reports/stats`, `/api/reports/guests`, `/api/reports/messages`

---

### Public Guest Invite Page

**Route:** `/invite/[code]` (no login required)

Shows guest name, event details, guest type badge, and scannable QR code linking back to the invite URL. Used when guests open their link directly or for staff to verify invitation.

---

### WhatsApp Templates

All templates must be **approved in Meta Business Manager** before production use.

| Template Name | Language | Category | When Used | Variables |
|---------------|----------|----------|-----------|-----------|
| **`hello_world`** | en_US | Utility | Connection testing (`/api/whatsapp/test`) | None |
| **`nivle_event_invitation`** | sw | Marketing | SMS+WhatsApp invitation send (single & batch) | Header: IMAGE (card URL). Body: {{1}} guest display name (with Single/Double label), {{2}} host/family name, {{3}} Swahili date/time, {{4}} venue, {{5}} location link. Buttons: Nitakuwepo / Sitakuwepo |
| **`nivle_qr_checkin`** | sw | Utility | After single send — sends QR code image for venue check-in | Header: IMAGE (QR URL). Body: {{1}} guest display name |
| **`nivle_shukrani`** | sw | Marketing | Tuma Shukrani post-event | Body: {{1}} guest display name, {{2}} event name |

#### WHY separate invitation vs QR templates

- **`nivle_event_invitation`**: Beautiful card image + event details + RSVP buttons — the main invitation experience.
- **`nivle_qr_checkin`**: Separate message with scannable QR code for venue entry. Sent after invitation so guests have a dedicated check-in artifact without cluttering the invitation message.

#### WHY `family_name` for weddings vs `event.name` for other events

Wedding invitations in Swahili reference the couple/family ("Harusi ya Kelvin na Edina"), not just "Kelvin's Wedding Event". The `family_name` field lets the template show culturally appropriate host naming. Other event types fall back to `event.name`.

---

## 4. External Services

### Meta WhatsApp Cloud API

- **API version:** v21.0
- **Endpoint:** `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
- **Auth:** Bearer token (`WHATSAPP_ACCESS_TOKEN`)
- **Outbound:** Template messages (invitations, QR, shukrani) and free-form text (Messages panel, within 24h window)
- **Inbound:** Webhook at `/api/webhooks/whatsapp`

**Webhook setup (Meta Developer Console):**
1. Callback URL: `https://admin.nivle-ekadi.com/api/webhooks/whatsapp`
2. Verify token: value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Subscribe to `messages` field
4. App must have WhatsApp Business Account linked

### NextSms

- **Provider:** messaging-service.co.tz
- **Endpoint:** `POST https://messaging-service.co.tz/api/sms/v1/text/single`
- **Auth:** Basic Auth (username:password base64)
- **Sender ID:** `NivleDesign`
- **Phone format:** `255XXXXXXXXX` (no `+` in API body)
- **Message limit:** 160 characters (truncated in code)

### Vercel Blob

- **Package:** `@vercel/blob`
- **Used for:** Guest card image uploads (`guest-cards/{guestId}/...`), card templates
- **Access:** Public URLs stored in database
- **Configured via:** Vercel project storage integration (automatic on Vercel deploy)

### Neon PostgreSQL

- **Connection:** `DATABASE_URL` environment variable
- **SSL:** Required in production (`rejectUnauthorized: false`)
- **Pool:** `pg.Pool` in `lib/db.ts`
- **Migrations:** Manual via `npm run db:*` scripts (not auto-run on deploy)

### Resend (Email)

- **Package:** `resend`
- **Used for:** Check-in PDF report delivery only
- **From:** `NIVLE E-Kadi <kelvin@nivle-ekadi.com>` (verified domain)
- **To:** `nivle.ekadi@gmail.com`
- **Requires:** Domain verification in Resend dashboard for `nivle-ekadi.com`

### Cloudflare (Domain & Email Routing)

While not configured in application code, production infrastructure uses Cloudflare for:

- **DNS** for `nivle-ekadi.com` and `admin.nivle-ekadi.com`
- **Email routing** — forwarding `@nivle-ekadi.com` addresses (e.g. `kelvin@nivle-ekadi.com`) to Gmail inboxes
- **SSL/TLS** termination and CDN in front of Vercel

Resend requires DNS records (SPF, DKIM) on the domain — typically added in Cloudflare DNS panel.

---

## 5. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Neon). Example: `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTSMS_USERNAME` | **Yes** (for SMS) | NextSms account username/email |
| `NEXTSMS_PASSWORD` | **Yes** (for SMS) | NextSms account password |
| `WHATSAPP_ACCESS_TOKEN` | **Yes** (for WhatsApp) | Meta permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | **Yes** (for WhatsApp) | Meta phone number ID (not the phone number itself) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | **Yes** (for webhook) | Random secret string for Meta webhook verification |
| `RESEND_API_KEY` | **Yes** (for reports) | Resend API key (`re_...`) |
| `RESEND_FROM_EMAIL` | Recommended | Sender address. Default: `NIVLE E-Kadi <kelvin@nivle-ekadi.com>` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public base URL for QR codes and invite links. Production: `https://admin.nivle-ekadi.com` or `https://nivle-ekadi.com` |
| `NODE_ENV` | Auto | `development` or `production` — controls secure cookie flag |
| `ADMIN_EMAIL` | Init only | Used by `npm run db:init` to seed first admin user |
| `ADMIN_PASSWORD` | Init only | Used by `npm run db:init` to seed first admin password |

### Optional / Legacy

| Variable | Description |
|----------|-------------|
| `AFRICAS_TALKING_API_KEY` | Legacy/unused — Africa's Talking was replaced by NextSms |
| `AFRICAS_TALKING_USERNAME` | Legacy/unused |

### Local development

Create `.env.local` at project root with all required variables. Never commit this file.

### Vercel production

Add all required variables in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed). Redeploy after changes.

---

## 6. Deployment

### Auto-Deploy (GitHub → Vercel)

1. Code is pushed to `main` on GitHub (`thesyntrixi/nivle-e-kadi`)
2. Vercel detects the push via GitHub integration
3. Vercel runs `npm run build` (Next.js production build)
4. On success, new deployment goes live at `admin.nivle-ekadi.com`
5. Serverless API routes and static assets are distributed globally

**Manual deploy:** Vercel dashboard → Deployments → Redeploy (needed after env var changes).

### Database Migrations

Migrations are **manual** — they do not run automatically on deploy.

```powershell
# From project root K:\nivle-e-kadi
# Ensure DATABASE_URL is set in .env.local

npm run db:init                  # Initial schema + admin seed
npm run db:add-checkin           # checked_in, checked_in_at columns
npm run db:add-staff             # staff role + staff_events table
npm run db:add-rsvp              # rsvp_status, rsvp_at columns
npm run db:add-guest-type        # guest_type column
npm run db:add-message-direction # direction column on messages
npm run db:add-family-name       # family_name on events
npm run db:add-user-profile      # name, phone on users
```

**Production migration workflow:**
1. Set `DATABASE_URL` to Neon production connection string locally (or run from CI)
2. Run the needed `npm run db:*` script once
3. Verify in Neon console that schema changed
4. Deploy application code

### Build verification before push

```powershell
npm run build
git add .
git commit -m "your message"
git push origin main
```

---

## 7. Business Logic Decisions

### WHY Single/Double guest types

Tanzanian wedding invitations commonly cover one or two people per card. The type drives:
- Swahili grammar in SMS/WhatsApp (singular/plural verb forms)
- Visual labels at check-in ("👤 Single" vs "👥 Double")
- Separate batch sending (different card designs per type)

### WHY batched sending

| Constraint | Impact |
|------------|--------|
| Vercel serverless timeout | Cannot send 500 guests in one HTTP request |
| WhatsApp rate limits | Meta throttles burst sending |
| NextSms throughput | Provider may reject rapid-fire requests |

**Solution:** Send 10–25 guests per API call with 400ms inter-guest delay; frontend loops until `remaining = 0`.

### WHY RSVP locks after first response

Prevents duplicate webhook deliveries and accidental button re-taps from corrupting attendance data. First response is treated as final intent.

### WHY per-guest card upload (send-single) vs shared card (send-batch)

| Mode | Card | Use case |
|------|------|----------|
| **Send single** | Unique image per guest | Premium weddings — name on card |
| **Send batch** | One image per event/type | Standard events — same card for all |

Personalizing 300 images externally (Canva batch) is a business workflow; the app accepts the finished per-guest image at send time.

### WHY multiple WhatsApp templates (not one mega-message)

Meta templates are approved per structure. Splitting into:
- **Invitation** (card + details + RSVP)
- **QR check-in** (scannable entry pass)
- **Shukrani** (post-event marketing)

…allows each message to be short, purposeful, and independently approved/updated.

### Phone normalization

All phones stored as `255XXXXXXXXX` (12 digits). Accepts `076XXXXXXXX`, `255...`, or `+255...` on input. SMS API gets digits-only; WhatsApp API gets digits-only; internal validation uses `lib/utils/phone.ts`.

---

## 8. Known Limitations & Future Improvements

### WhatsApp 24-hour messaging window

Free-form text messages (`sendWhatsApp()` in Messages panel) only deliver if the guest messaged within the last 24 hours. Outside this window, only **approved templates** can initiate contact. This is a Meta policy, not an app bug.

### Meta messaging limits

New WhatsApp Business accounts start with low daily limits (e.g. **250 business-initiated conversations/day**). Limits increase with quality rating and volume. Bulk sends must respect this — current batching helps but does not eliminate the cap.

### Template approval dependency

All custom templates (`nivle_event_invitation`, `nivle_qr_checkin`, `nivle_shukrani`) must be **Approved** in Meta Business Manager. Pending or rejected templates cause silent WhatsApp send failures.

### SMS delivery verification

NextSms success is determined by HTTP 200 response. The app may mark SMS as "Sent" even if carrier delivery fails. `external_message_id` falling back to local `nivle-{timestamp}` reference indicates the provider did not return a confirmed message ID.

### Send-single partial success

If SMS succeeds but WhatsApp fails (or vice versa), the guest may still be marked `Sent`. Consider per-channel status tracking in a future version.

### Auth token security

Current token is base64 JSON (not signed JWT). Sufficient for internal admin tool but could be upgraded to signed tokens for stronger tamper resistance.

### No automated migrations on deploy

Schema changes require manual `npm run db:*` execution. Risk of code/DB drift if migrations are forgotten.

### Suggested future improvements

- [ ] Per-channel delivery status on guests (SMS sent / WA sent separately)
- [ ] Admin UI to override locked RSVP
- [ ] WhatsApp template status health check on dashboard
- [ ] Automated DB migrations in CI/CD
- [ ] Delivery webhooks from NextSms for SMS status
- [ ] Multi-tenant client login (clients view their own events)
- [ ] Swahili PDF fonts for better report typography
- [ ] Real-time check-in counter via WebSocket/SSE (currently poll-on-scan)

---

## API Route Reference (Quick Index)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Public | Logout |
| GET | `/api/auth/me` | Any | Current user |
| POST | `/api/auth/update-profile` | Admin | Update profile |
| POST | `/api/auth/change-password` | Admin | Change password |
| GET/POST | `/api/clients` | Admin | List/create clients |
| GET/PUT/DELETE | `/api/clients/[id]` | Admin | Client CRUD |
| GET/POST | `/api/events` | Admin | List/create events |
| GET/PUT/DELETE | `/api/events/[id]` | Admin | Event CRUD |
| GET/POST | `/api/guests` | Admin | List/create guests |
| GET/PUT/DELETE | `/api/guests/[id]` | Admin | Guest CRUD |
| POST | `/api/guests/bulk-import` | Admin | Excel/CSV import |
| POST | `/api/guests/send-single` | Admin | Single guest invite |
| GET/POST | `/api/guests/send-batch` | Admin | Batch invite |
| GET/POST | `/api/guests/send-shukrani` | Admin | Thank-you batch |
| POST | `/api/guests/checkin` | Admin | QR check-in |
| GET | `/api/guests/[id]/qr` | Admin | Guest QR data |
| GET | `/api/checkin/stats` | Admin | Live check-in counter |
| POST | `/api/checkin/report` | Admin | PDF report email |
| GET/POST | `/api/messages` | Admin | Message list |
| POST | `/api/messages/send` | Admin | Send ad-hoc message |
| GET | `/api/staff/check-in/[eventId]/stats` | Staff | Staff counter |
| POST | `/api/staff/check-in` | Staff | Staff check-in |
| GET/POST | `/api/webhooks/whatsapp` | Public | Meta webhook |
| GET | `/api/public/qr/[code]` | Public | Public QR |

---

## Support & Contacts

| Item | Value |
|------|-------|
| **Business email** | nivle.ekadi@gmail.com |
| **Verified sender** | kelvin@nivle-ekadi.com |
| **Support phone** | 0767987878 |
| **Admin URL** | https://admin.nivle-ekadi.com |
| **GitHub** | https://github.com/thesyntrixi/nivle-e-kadi |

---

*This document describes the NIVLE E-Kadi application as of version 0.1.1. For development conventions, see also `docs/PROJECT_STRUCTURE_RULES.md` and `docs/AUTH_SYSTEM_CURSOR_PROMPT.md`.*
