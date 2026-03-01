# TaskFlow Pro

A full-stack project & task management platform built with Next.js 14, integrated with Microsoft Entra ID (Azure AD) for enterprise authentication and Microsoft OneDrive for file collaboration.

**Live:** [https://it-assist-app.vercel.app](https://it-assist-app.vercel.app)

---

## Features

### Authentication & Multi-Tenancy
- **Microsoft Entra ID (Azure AD)** single sign-on — no local passwords
- Auto-provisioning of users and organizations on first login
- Role-based access control: Admin, Project Manager, Team Member, Viewer
- JWT-based sessions with 24-hour expiry

### Project Management
- Create, edit, and archive projects with status tracking (Planned, Active, Completed, On Hold)
- Project detail pages with progress metrics and team overview
- Assign project managers and team members
- Budget tracking and deadline management

### Task Management
- Drag-and-drop **Kanban board** (Todo → In Progress → Done)
- Task priorities (Low, Medium, High) with color-coded badges
- Assignee management and due date tracking
- Task comments and activity history
- Drag-to-reorder within columns

### File Management
- **OneDrive integration** — browse, upload, and link files directly
- File attachments on tasks and projects
- Thumbnail previews and file metadata

### Dashboard & Analytics
- Real-time dashboard with project/task summary cards
- Progress charts and team workload overview
- Recent activity feed

### Notifications
- In-app notification system (task assigned, deadline reminders, file uploads, comments, project updates)
- Unread badge count in navigation

### Audit Logs
- Full audit trail of user actions across the platform
- Filterable by user, action type, and date range

### Team Management
- Organization-scoped team directory
- Role assignment and management
- Member activity overview

### Settings
- Profile management (name, avatar)
- OneDrive connection status
- Theme toggle (light/dark mode via `next-themes`)

### Progressive Web App
- PWA-ready with service worker and web manifest
- Installable on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Auth** | NextAuth.js v4 + Azure AD Provider |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Prisma |
| **Styling** | Tailwind CSS + Radix UI primitives |
| **State** | Zustand |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @hello-pangea/dnd |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Deployment** | Vercel |
| **PWA** | @ducanh2912/next-pwa + Workbox |

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # REST API routes
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── audit-logs/       # Audit log API
│   │   ├── dashboard/        # Dashboard stats API
│   │   ├── notifications/    # Notification API
│   │   ├── onedrive/         # OneDrive proxy API
│   │   ├── projects/         # Projects CRUD + [id]
│   │   ├── tasks/            # Tasks CRUD + [id] + reorder
│   │   └── users/            # Users API
│   ├── dashboard/            # Protected dashboard pages
│   │   ├── audit-logs/
│   │   ├── files/
│   │   ├── notifications/
│   │   ├── projects/         # List, detail [id], new
│   │   ├── settings/
│   │   ├── tasks/
│   │   └── team/
│   └── login/                # Microsoft SSO login page
├── components/
│   ├── layout/               # Header, Sidebar
│   └── ui/                   # Reusable UI components (shadcn/ui)
├── lib/
│   ├── auth.ts               # NextAuth config (Azure AD)
│   ├── audit.ts              # Audit logging helper
│   ├── db.ts                 # Prisma client
│   ├── onedrive.ts           # Microsoft Graph / OneDrive helpers
│   ├── store.ts              # Zustand store
│   └── utils.ts              # Utility functions
├── types/
│   └── next-auth.d.ts        # NextAuth type extensions
└── middleware.ts              # Route protection
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech))
- Microsoft Entra ID (Azure AD) app registration

### 1. Clone & Install

```bash
git clone https://github.com/balatechn/it-assist-app.git
cd it-assist-app
npm install
```

### 2. Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@host/dbname"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key"

AZURE_AD_CLIENT_ID="your-azure-app-client-id"
AZURE_AD_CLIENT_SECRET="your-azure-app-client-secret"
AZURE_AD_TENANT_ID="your-azure-tenant-id"
```

### 3. Azure AD Setup

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Register a new application
3. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/azure-ad` (development)
   - `https://your-domain.vercel.app/api/auth/callback/azure-ad` (production)
4. Under **Authentication**, enable **ID tokens**
5. Under **API permissions**, add: `openid`, `profile`, `email`, `User.Read`, `offline_access`
6. Grant admin consent

### 4. Database Setup

```bash
npx prisma db push
npx prisma db seed    # Optional: seed demo data
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your Microsoft account.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add all environment variables (use `NEXTAUTH_URL` = your Vercel domain)
4. Deploy

> **Important:** When setting env vars via CLI on Windows, use Node.js to pipe values to avoid PowerShell appending `\r\n` to values.

---

## Database Schema

Key models: **Organization** → **User** → **Project** → **Task** → **TaskComment** / **File** / **Notification** / **AuditLog**

Roles: `ADMIN` · `PROJECT_MANAGER` · `TEAM_MEMBER` · `VIEWER`

---

## License

MIT
