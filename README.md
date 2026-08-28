# SPIT Institutional Asset Management System

A centralized physical asset governance, inventory tracking, and audit verification platform engineered for Sardar Patel Institute of Technology (S.P.I.T.), Mumbai.

---

## Overview

The SPIT Asset Management System provides institutional-grade tracking and lifecycle governance for physical hardware, laboratory equipment, computing infrastructure, and furniture across the campus. The platform enforces strict Role-Based Access Control (RBAC), multi-tier change request approval workflows, audit trails, and automated compliance reporting for accreditation bodies such as NAAC and NBA.

---

## System Architecture and Technology Stack

- **Application Framework**: Next.js 16 (React 19, App Router, Server Components, Turbopack)
- **Programming Language**: TypeScript 5 (Strict Mode)
- **Database & Authentication**: Supabase (PostgreSQL 15, Row Level Security, pg_trgm Extensions)
- **Styling & Design System**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons
- **AI Engine**: Google Gemini 3.6 Flash via Server-Side Retrieval-Augmented Generation (RAG)
- **Data Processing**: SheetJS (Excel Parser), PapaParse (CSV Processing), KaTeX (Mathematical Formulas)

---

## Core Features

### 1. Hierarchical Infrastructure Mapping
- Multi-tier relational structure: Campus -> Buildings -> Vertical Floors -> Departmental Rooms -> Assets.
- Full institutional mapping encompassing 9 vertical levels (Ground through 8th Floor), 125 rooms/laboratories, and 2,660+ registered physical assets.
- Real-time floor capacity and density calculations based on total campus asset volume.

### 2. Role-Based Access Control and Governance
- **Viewer**: Read-only catalog exploration, advanced filter search, and data export.
- **Asset Manager**: Propose asset creation, maintenance requests, inter-departmental transfers, and disposals.
- **Approver / Administrator**: Authorize or reject change requests, oversee user permissions, perform bulk data migrations, and manage institutional stocktakes.
- **Enforced Two-Person Rule**: Approvers cannot authorize self-submitted requests, ensuring strict organizational compliance.

### 3. Change Request and Approval Workflow
- Lifecycle states: Pending, Approved, Rejected, Cancelled.
- Atomic PostgreSQL transactions: Approving a transfer instantly updates the asset record, creates an immutable audit trail entry, and logs the movement ledger.
- Dedicated Approval Center with live pending badges and status filtering.

### 4. Physical Stocktake and Accreditation Audit Mode
- Digital stocktaking interface for annual physical verification across departments and laboratories.
- Real-time status reconciliation: Present, Damaged, Missing, or Misplaced.
- Automated generation of printable NAAC/NBA Stock Verification Certificates complete with summary statistics, discrepancy registers, and institutional sign-off sections.

### 5. Institutional AI Assistant
- Server-side RAG pipeline powered by Google Gemini 3.6 Flash.
- Executes dynamic database queries to answer inventory lookups, equipment comparisons, and utilization statistics.
- Supports GitHub-flavored Markdown tables and LaTeX mathematical formulations for density metrics.

### 6. Dual-Visibility Asset Comments and Historical Ledger
- **Public Discussion**: General maintenance notes and operational commentary accessible to all authenticated staff.
- **Restricted Administrative Notes**: Confidential governance and procurement remarks restricted exclusively to Approvers via PostgreSQL Row Level Security (RLS) policies.
- Immutable event stream logging all creation, update, relocation, maintenance, and retirement events.

### 7. Global Search and Command Palette
- Keyboard-triggered Command Palette (`Cmd+K` / `Ctrl+K`) for rapid navigation.
- High-performance fuzzy search across asset tags, serial numbers, room codes, categories, and custodians utilizing PostgreSQL `pg_trgm` GIN indexes.

### 8. Bulk Ingestion and Uncapped CSV Exports
- Excel spreadsheet parser supporting bulk asset registration, automatic category and room resolution, and dry-run validation.
- Uncapped server-side CSV export generator supporting selective multi-row exports and filtered datasets.

---

## Database Schema and Security Architecture

The underlying PostgreSQL database implements 10 relational tables protected by strict Row Level Security (RLS) policies:

- `institutions`: Root organization record.
- `buildings`: Campus facilities and geographical addresses.
- `floors`: Vertical level ordering and floor designations.
- `rooms`: Laboratory, classroom, office, and storage definitions with room types.
- `asset_categories`: Hierarchical categorization codes (Computing, Lab Equipment, Networking, AV, Furniture).
- `assets`: Primary catalog with tags, serial numbers, specifications, operational status, and room linkages.
- `asset_movements`: Permanent movement log for transfers between rooms and custodians.
- `change_requests`: Pre-approval modification requests with JSONB diff payloads.
- `asset_comments`: Dual-visibility commentary system (Public vs Admin-only).
- `asset_history`: Immutable global audit trail recording performer IDs, timestamps, and action types.

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

### 5. Production Build
```bash
npm run build
npm start
```

---

## Role Permissions Matrix

| Capability | Viewer | Asset Manager | Approver / Admin |
| :--- | :---: | :---: | :---: |
| Browse Inventory & Locations | Yes | Yes | Yes |
| Perform Global Search (Cmd+K) | Yes | Yes | Yes |
| Export CSV Register | Yes | Yes | Yes |
| Post Public Comments | Yes | Yes | Yes |
| View Admin-Only Comments | No | No | Yes |
| Submit Change & Transfer Requests | No | Yes | Yes |
| Authorize / Reject Change Requests | No | No | Yes |
| Conduct Annual Stocktake & Audits | No | No | Yes |
| Generate NAAC/NBA Certificates | No | No | Yes |
| Bulk Excel Data Ingestion | No | No | Yes |
| User Directory & Role Management | No | No | Yes |

---

## Institutional License

Proprietary Software — Internal Institutional Infrastructure for Sardar Patel Institute of Technology (S.P.I.T.), Munshi Nagar, Andheri West, Mumbai, Maharashtra 400058.
