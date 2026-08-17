# 🔗 MatchmakIEEEng 🔗

MatchmakIEEEng is a team-matching and competition registration portal for **IEEE Student Branch IPB** members. The application allows students to discover active competitions, form/manage teams, request to join existing groups, and receive instant updates on team status changes.

---

## Key Features

*   **Secure Institutional Authentication**: Restricts registration and login to the university's official domain (`@apps.ipb.ac.id`).
*   **Realtime Team & Registration Syncing**: Uses Supabase Postgres Changes to instantly push notifications, team updates, and join request state modifications to connected clients.
*   **Team & Member Management**: Team leaders can manage their members, kick inactive members, delete teams, and update team notes/requirements.
*   **Competition Portal**: Browse ongoing/active competitions and register teams directly.
*   **Interactive Notification System**: Realtime notification system to manage incoming join requests, approvals, and system alerts.

---

## Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Database & Auth Provider**: Supabase (utilizing SSR helper client `@supabase/ssr` & Client JS Library)
*   **Styling**: Tailwind CSS v4 (with custom glowing layout auras and responsive design)
*   **Icons**: Lucide React

---

## Project Setup & Installation

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm/yarn/pnpm installed on your local environment.

### 2. Environment Configuration
Create a `.env.local` file in the root of the project with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

### 3. Install Dependencies
Run the following command to download project dependencies:
```bash
npm install
```

### 4. Running the Development Server
Run the local dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 5. Production Build
To build and check the production assets:
```bash
npm run build
npm run start
```

---

## Project Directory Structure

```text
├── app/                  # Next.js page routes (App Router)
│   ├── member-login/     # Domain-restricted login page
│   ├── reset-password/   # Secure reset-password handling
│   ├── layout.tsx        # App layout and wrapper
│   └── page.tsx          # Server component fetching initial teams and user state
├── components/           # Reusable UI component modules
│   └── matchmakieeeng/   # Core matchmaking, notification panels, and cards
├── utils/                # Utilities and Supabase SSR/middleware helper functions
├── types/                # TypeScript type definitions matching DB schema
└── public/               # Static assets (including official logo assets)
```
