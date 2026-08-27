# SPIT Asset Management Platform

A high-performance institutional physical asset tracking, governance, and audit system built for Sardar Patel Institute of Technology (S.P.I.T.).

![SPIT Asset Manager](SPIT_LOGO_DARK_MODE.png)

## ✨ Core Features

- **Institutional Catalog**: Hierarchical organization mapping Buildings, Floors, and Rooms to 2,660+ physical hardware and laboratory assets.
- **Role-Based Access Control (RBAC)**:
  - **Viewer**: Read-only directory access and asset search.
  - **Asset Manager**: Request asset additions, transfers (shifts), edits, and disposals.
  - **Approver / Admin**: Authorize or reject change requests, oversee system audits, and manage users.
- **Dual-Visibility Asset Comments**:
  - 🌐 **Public Comments**: Open discussion for all faculty and staff.
  - 🔒 **Admin-Only Notes**: Restricted strictly to Approvers and Administrators via Postgres Row Level Security (RLS).
- **Direct Table Actions & Multi-Select**:
  - Direct Shift / Transfer & Delete triggers on individual table rows.
  - Multi-select checkbox toolbar for batch shifts, batch disposals, and selective CSV exports.
- **Dark Mode & Institutional Branding**:
  - Full Tailwind v4 class-based dark theme with high contrast typography.
  - S.P.I.T. emblem watermark dynamically switching between light and dark modes.
- **Full Database CSV Exports**: Uncapped server-side CSV export engine supporting full catalog and granular filter downloads.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions, Turbopack)
- **Database & Auth**: Supabase (PostgreSQL 15, Row Level Security)
- **Styling**: Tailwind CSS v4, Lucide Icons, Radix UI
- **Language**: TypeScript 5

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Installation
```bash
cd app-src
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` inside `app-src/`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License
Internal Institutional Use — Sardar Patel Institute of Technology.
