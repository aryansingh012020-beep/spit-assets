# SPIT Asset Management System

A production-ready, modern web-based asset management system for **Sardar Patel Institute of Technology (SPIT)**, built to track, manage, and audit physical assets across buildings, floors, and rooms.

## Technology Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** + custom Radix UI components
- **Supabase** — PostgreSQL, Auth, Storage, Row Level Security
- **Deployment** — Vercel-ready

---

## Features

- 🏛 **Hierarchical location browser** — Building → Floor → Room → Asset
- 🔄 **Approval workflow** — All changes require explicit approval by an Approver
- 🔒 **Three roles** — Viewer, Asset Manager, Approver
- 📜 **Immutable history** — Every change is permanently logged
- 🔍 **Global search** — `pg_trgm`-indexed ILIKE search across all assets
- 📸 **Photo management** — Supabase Storage with signed URLs
- 📥 **Excel importer** — One-time migration from the existing register
- 🛡 **DB-enforced security** — RLS policies + SECURITY DEFINER functions
- ⌨ **Command palette** — `⌘K` / `Ctrl+K` global search

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- Git

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd app-src
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Keep this server-only, never expose to client
```

You can find these in your Supabase project under **Settings → API**.

### 3. Run database migrations

In the Supabase SQL Editor (or using the Supabase CLI), run each migration file in order:

```sql
-- Copy-paste each file into the SQL editor, in order:
supabase/migrations/001_schema.sql
supabase/migrations/002_indexes.sql
supabase/migrations/003_rls.sql
supabase/migrations/004_functions.sql
```

Or using Supabase CLI:
```bash
supabase db push
```

### 4. Set up Supabase Storage

In the Supabase dashboard, go to **Storage** and create a bucket:
- **Name**: `asset-photos`  
- **Public**: ❌ (private)
- **File size limit**: 8 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

### 5. Seed demo data

Run the seed script in the Supabase SQL Editor:

```sql
-- Copy-paste: supabase/seed.sql
```

This creates:
- Institution: Sardar Patel Institute of Technology (SPIT)
- Main Building with all floors (Ground → 8th)
- 6 sample rooms
- 10 asset categories
- 15 realistic sample assets

### 6. Create your first user

In Supabase Auth → Users, create a user manually, then update their role in the SQL Editor:

```sql
-- Make a user an approver (use their auth.users UUID)
UPDATE public.profiles 
SET role = 'approver', institution_id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'your-user-uuid-here';
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Excel Import (Migration)

To import the existing asset register from the Excel file:

```bash
# Place the Excel file at the project root or pass the path as argument
npm run import:excel
# or:
dotenv -e .env.local -- tsx scripts/import-excel.ts /path/to/asset_management_sheet.xlsx
```

The import script:
1. Reads all 39 sheets
2. Detects floor/room sections automatically
3. Expands quantity rows into individual assets (e.g. `Qty: 20, R-01 to R-20` → 20 rows)
4. Preserves original asset codes byte-for-byte
5. Flags ambiguous/missing tags to the `import_issues` table
6. Is **fully idempotent** — re-running skips already-imported codes
7. Prints a summary report

**After importing**, review flagged records at `/admin/import`.

---

## Running Tests

The test suite covers core approval workflow invariants:

```bash
# Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
npm run test:approvals
```

Tests verify:
- ✅ Asset manager cannot approve their own request (DB-enforced)
- ✅ Double-approval fails gracefully (request already approved)
- ✅ Rejected transfer does not mutate inventory
- ✅ Pending conflict blocks a second request for the same asset

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the three environment variables in Vercel project settings
4. Deploy

---

## Database Schema Overview

```
institutions
  └── buildings
        └── floors
              └── rooms
                    └── assets
                          ├── asset_photos
                          ├── asset_history    (immutable)
                          └── asset_movements  (denormalized transfers)

profiles (extends auth.users)
change_requests (pending workflow)
audit_logs (system-wide, immutable)
import_issues (flagged Excel rows)
```

### Search Indexing

Search is powered by **PostgreSQL `pg_trgm`** GIN indexes on:
- `assets.name` — `gin_trgm_ops`
- `assets.asset_tag` — `gin_trgm_ops`
- `assets.description` — `gin_trgm_ops`
- `rooms.name` / `rooms.room_number` — `gin_trgm_ops`

Queries use `ILIKE '%term%'` which the trgm index accelerates to near-constant time even for large datasets.

### Security Model

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `assets` | Any authenticated user | SECURITY DEFINER fn only | SECURITY DEFINER fn only | ❌ Never |
| `asset_history` | Any authenticated user | SECURITY DEFINER fn only | ❌ Never | ❌ Never |
| `audit_logs` | Approver only | SECURITY DEFINER fn only | ❌ Never | ❌ Never |
| `change_requests` | Own (manager) / All (approver) | asset_manager, approver | Approver, not own request | ❌ Never |

The "Asset Manager cannot approve own request" rule is enforced at the **database policy level** — it is not just a UI restriction.

---

## User Roles

| Role | Can Do |
|---|---|
| **Viewer** | Read-only access to all assets, history, photos |
| **Asset Manager** | Submit add/transfer/edit/delete requests |
| **Approver** | Review and approve/reject requests, manage users, view audit log |

---

## Asset Statuses

| Status | Description |
|---|---|
| `active` | Normal operational state |
| `under_maintenance` | Temporarily offline for repair |
| `missing` | Cannot be located |
| `damaged` | Non-functional, needs assessment |
| `transferred` | Moved (in-transit or awaiting confirmation) |
| `retired` | Decommissioned, kept for record |
| `disposed` | Permanently removed from service |

Assets are **never hard-deleted** — only status-transitioned.

---

## Asset Tag Format

**Existing assets**: Original Excel codes preserved verbatim (e.g. `SPIT/ASH/001/2024-25/S.B./01`)

**New assets** (no existing code):
```
SPIT/{CATEGORY_CODE}/{YYYY}/{SEQUENCE_5DIGITS}
e.g. SPIT/FURN/2026/00147
```
Sequence is a DB-managed atomic counter — no race conditions.

---

## Project Structure

```
app-src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # All protected pages
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   │   └── [assetId]/
│   │   ├── locations/
│   │   │   ├── buildings/
│   │   │   ├── floors/
│   │   │   └── rooms/
│   │   ├── approvals/
│   │   ├── transfers/
│   │   ├── history/
│   │   └── admin/
│   │       ├── import/
│   │       ├── users/
│   │       └── audit/
│   └── api/
│       └── search/
├── components/
│   ├── ui/                    # Badge, Button, Dialog, Toast, primitives
│   ├── sidebar.tsx
│   ├── command-palette.tsx
│   ├── dashboard-shell.tsx
│   └── status-badge.tsx
├── lib/
│   ├── supabase/              # client, server, middleware clients
│   ├── actions/               # Server actions
│   ├── types/                 # TypeScript types
│   └── utils.ts
├── scripts/
│   └── import-excel.ts        # One-time Excel migration
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_indexes.sql
│   │   ├── 003_rls.sql
│   │   └── 004_functions.sql
│   └── seed.sql
└── __tests__/
    └── approval-workflow.test.ts
```
