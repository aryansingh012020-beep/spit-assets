# SPIT Institutional Asset Management System

A centralized physical asset governance, inventory tracking, and audit verification platform engineered for Sardar Patel Institute of Technology (S.P.I.T.), Mumbai.

**Live:** [asset-management-spit.vercel.app](https://asset-management-spit.vercel.app)

---

## Overview

The SPIT Asset Management System provides institutional-grade tracking and lifecycle governance for physical hardware, laboratory equipment, computing infrastructure, and furniture across the campus. The platform enforces strict Role-Based Access Control (RBAC), multi-tier change request approval workflows, audit trails, and automated compliance reporting for accreditation bodies such as NAAC and NBA.

---

## System Architecture and Technology Stack

- **Application Framework**: Next.js 16 (React 19, App Router, Server Components, Turbopack)
- **Programming Language**: TypeScript 5 (Strict Mode)
- **Database & Authentication**: Supabase (PostgreSQL 15, Row Level Security, pg_trgm Extensions)
- **Styling & Design System**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons
- **AI Engine**: Google Gemini Flash via Server-Side Retrieval-Augmented Generation (RAG)
- **Data Processing**: SheetJS (Excel Parser), PapaParse (CSV Processing), KaTeX (Mathematical Formulas)
- **Deployment**: Vercel (Edge Network, Serverless Functions)

---

## UI Architecture

### Slim Top Bar
A persistent header containing:
- **Global fuzzy search** across assets, rooms, and buildings (keyboard shortcut: `/`)
- **Admin pill toggles** (Users · Audit Log · Import) — visible to Approvers only, with active-state highlighting
- **Approvals bell** with live pending count badge
- **Dark mode toggle**
- **Mobile sidebar trigger**

### Collapsible Sidebar
- Sections: Overview · Assets · Operations · Locations
- Collapses to icon-only rail (state persisted in `localStorage`)
- Active route indicator with indigo left-border accent
- User profile + sign-out at the bottom

### Loading Skeletons
All 12 dashboard routes have instant `loading.tsx` skeleton screens — navigation feels immediate even before server data arrives.

---

## Core Features

### 1. Hierarchical Infrastructure Mapping
- Multi-tier relational structure: Campus → Buildings → Floors → Departmental Rooms → Assets
- Full institutional mapping encompassing 9 floors (Ground through 8th Floor), 125 rooms/laboratories, and 2,660+ registered physical assets
- Real-time floor capacity and density calculations based on total campus asset volume

### 2. Role-Based Access Control and Governance
- **Viewer**: Read-only catalog exploration, advanced filter search, and data export
- **Asset Manager**: Propose asset creation, maintenance requests, inter-departmental transfers, and disposals
- **Approver / Administrator**: Authorize or reject change requests, oversee user permissions, perform bulk data migrations, manage institutional stocktakes, and access admin controls from the top bar
- **Enforced Two-Person Rule**: Approvers cannot authorize self-submitted requests, ensuring strict organizational compliance

### 3. Change Request and Approval Workflow
- Lifecycle states: Pending, Approved, Rejected, Cancelled
- Atomic PostgreSQL transactions: Approving a transfer instantly updates the asset record, creates an immutable audit trail entry, and logs the movement ledger
- Dedicated Approval Center with live pending badges and status filtering

### 4. Physical Stocktake and Accreditation Audit Mode
- Digital stocktaking interface for annual physical verification across departments and laboratories
- Real-time status reconciliation: Present, Damaged, Missing, or Misplaced
- Automated generation of printable NAAC/NBA Stock Verification Certificates complete with summary statistics, discrepancy registers, and institutional sign-off sections

### 5. Institutional AI Assistant
- Floating drawer powered by Google Gemini Flash (server-side RAG pipeline)
- Executes dynamic database queries to answer inventory lookups, equipment comparisons, and utilization statistics
- Supports GitHub-flavored Markdown tables and LaTeX mathematical formulations for density metrics

### 6. Camera Photo Capture for Assets
- In-browser camera capture for asset photo documentation
- Photo upload triggers an approval workflow for asset managers; approvers can directly attach photos
- Photos displayed in asset detail view with gallery support

### 7. Room In-Charge Assignment
- Approvers can assign and update the in-charge staff member for any room
- Searchable staff picker from the active user directory
- In-charge displayed prominently on room detail cards

### 8. Room-Wise Excel Asset Ingestion
- Upload a room-scoped Excel sheet to bulk-register assets into a specific room
- Dry-run validation with per-row error reporting before commit
- Downloadable template pre-populated with current room categories

### 9. Dual-Visibility Asset Comments and Historical Ledger
- **Public Discussion**: General maintenance notes accessible to all authenticated staff
- **Restricted Administrative Notes**: Confidential governance remarks restricted to Approvers via PostgreSQL RLS policies
- Immutable event stream logging all creation, update, relocation, maintenance, and retirement events

### 10. Global Inventory Search
- High-performance fuzzy search across asset tags, serial numbers, room codes, categories, and custodians using PostgreSQL `pg_trgm` GIN indexes
- Instant results dropdown in the top bar with keyboard navigation (`/` to open, `Esc` to close)

### 11. Bulk Ingestion and Uncapped CSV Exports
- Excel spreadsheet parser for bulk asset registration with automatic category and room resolution and dry-run validation
- Uncapped server-side CSV export supporting selective multi-row and filtered dataset exports

---

## Performance Optimizations

| Optimization | Detail |
|---|---|
| Parallel DB queries | `Promise.all` in layout (profile + pending count) and dashboard (14 simultaneous queries) |
| ISR caching | `revalidate = 30` on dashboard; `revalidate = 60` on static pages (buildings, floors, categories, audit) |
| Loading skeletons | `loading.tsx` on all 12 routes — instant perceived navigation |
| Next.js `<Link>` prefetch | Sidebar links prefetch on hover automatically |

---

## Database Schema and Security Architecture

The underlying PostgreSQL database implements 10 relational tables protected by strict Row Level Security (RLS) policies:

- `institutions` — Root organization record
- `buildings` — Campus facilities and geographical addresses
- `floors` — Floor designations and level ordering
- `rooms` — Laboratory, classroom, office, and storage definitions with room types
- `asset_categories` — Hierarchical categorization codes (Computing, Lab Equipment, Networking, AV, Furniture)
- `assets` — Primary catalog with tags, serial numbers, specifications, operational status, and room linkages
- `asset_movements` — Permanent movement log for transfers between rooms and custodians
- `change_requests` — Pre-approval modification requests with JSONB diff payloads
- `asset_comments` — Dual-visibility commentary system (Public vs Admin-only)
- `asset_history` — Immutable global audit trail recording performer IDs, timestamps, and action types

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus global search |
| `Esc` | Close search / close modal |

---

## Installation and Deployment

### Prerequisites
- Node.js 18.18 or higher
- npm, pnpm, or yarn
- Active Supabase project instance

### 1. Repository Setup
```bash
git clone https://github.com/aryansingh012020-beep/spit-assets.git
cd spit-assets/app-src
npm install
```

### 2. Environment Configuration
Create a `.env.local` file inside the `app-src` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Database Migration
Execute the migration scripts in sequence within the Supabase SQL Editor:
1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_indexes.sql`
3. `supabase/migrations/003_rls.sql`
4. `supabase/migrations/004_functions.sql`

### 4. Running the Development Server
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

### 5. Production Deployment
```bash
npx vercel --prod
```
The `vercel.json` in `app-src/` automatically aliases the deployment to `asset-management-spit.vercel.app`.

---

## Role Permissions Matrix

| Capability | Viewer | Asset Manager | Approver / Admin |
| :--- | :---: | :---: | :---: |
| Browse Inventory & Locations | ✓ | ✓ | ✓ |
| Perform Inventory Search | ✓ | ✓ | ✓ |
| Export CSV Register | ✓ | ✓ | ✓ |
| Post Public Comments | ✓ | ✓ | ✓ |
| View Admin-Only Comments | — | — | ✓ |
| Submit Change & Transfer Requests | — | ✓ | ✓ |
| Authorize / Reject Change Requests | — | — | ✓ |
| Conduct Annual Stocktake & Audits | — | — | ✓ |
| Generate NAAC/NBA Certificates | — | — | ✓ |
| Bulk Excel Data Ingestion | — | — | ✓ |
| User Directory & Role Management | — | — | ✓ |
| Room In-Charge Assignment | — | — | ✓ |
| Camera Photo Capture | — | ✓ (pending approval) | ✓ (direct) |

---

## Institutional License

Proprietary Software — Internal Institutional Infrastructure for Sardar Patel Institute of Technology (S.P.I.T.), Munshi Nagar, Andheri West, Mumbai, Maharashtra 400058.

