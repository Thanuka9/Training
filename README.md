# Bank Supervision Department — Training Management Portal

Internal web application that replaces the manual Excel training register (`2025.xlsx`) with a controlled workflow:

1. Admin creates a standardised **Training Program** (the former yellow workbook fields).
2. An officer registers with Full Name + Bank ID and is activated by Admin.
3. The officer selects a program; Local/Foreign, Type, Institution and Venue load automatically.
4. The officer enters participation details, then submits the record.
5. Admin reviews, returns, rejects or approves.
6. Dashboards, officer summaries and Excel/CSV exports are generated from the database.

## Stack

- Client: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts
- Server: Node.js, Express, TypeScript, Zod, Prisma
- Database: Microsoft SQL Server

## Prerequisites

- Node.js 22+
- Microsoft SQL Server (Database Engine). SQL Server Management Studio is only a management UI.
- A database named `TrainingPortal` (or another name reflected in `DATABASE_URL`)

## Setup

```bash
cd D:\Training
copy .env.example .env
copy .env.example server\.env
```

Edit `server\.env`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=TrainingPortal;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_SECRET=use-a-long-random-value
ADMIN_BANK_ID=ADMIN001
ADMIN_NAME=System Administrator
ADMIN_PASSWORD=ChangeMeNow123
TEST_USER_PASSWORD=Training9672
CLIENT_URL=http://localhost:5173
```

Install, generate the Prisma client, migrate and seed:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Create the empty `TrainingPortal` database in SQL Server first. Then either:

- `npm run db:migrate` (Prisma), or
- run `server/prisma/migrations/0_init/migration.sql` in SSMS and then `npx prisma migrate resolve --applied 0_init` from `server/`

SQL Server does not support native enums. Roles, workflow status, local/foreign and delivery mode are stored as constrained `NVARCHAR` values (`USER`/`ADMIN`, `LOCAL`/`FOREIGN`, `DRAFT`/`SUBMITTED`, and so on).

- API: http://localhost:4000
- App: http://localhost:5173

The Vite dev server proxies `/api` to the Express API so the HttpOnly session cookie stays first-party.

## Seeded accounts

| Role | Full Name | Bank ID | Password |
|---|---|---|---|
| Admin | System Administrator | `ADMIN001` | from `ADMIN_PASSWORD` (default `ChangeMeNow123`) |
| Test officer | Thanuka Ellepola | `9672` | from `TEST_USER_PASSWORD` (default `Training9672`) |

The test officer is created as `ACTIVE` so it can be used immediately after seed.

Self-registered officers start as `PENDING` and cannot log in until an Admin approves them.

## Main routes

| Route | Role |
|---|---|
| `/` `/login` `/register` | Public |
| `/app` | Officer dashboard |
| `/app/training/new` | Record participation |
| `/admin` | Admin dashboard |
| `/admin/training-programs` | Yellow-field programme master |
| `/admin/records` | Review workflow |
| `/admin/reports` | Register and officer summary |

## KPI definitions

- **Pending Reviews** = `workflowStatus = SUBMITTED`
- **Approved Records** = `workflowStatus = APPROVED`
- **Completed Trainings** = completion status named `Completed`
- **Completion Rate** = Completed / (Completed + Not Completed). Planned and Ongoing records are excluded from the denominator.

Admin total record cards distinguish **all database records including drafts** from **submitted records**.

## Security

- Passwords hashed with bcrypt
- Session JWT stored in an HttpOnly cookie (not localStorage)
- Helmet, CORS restricted to `CLIENT_URL`, auth rate limiting
- Role checks on every API route
- Officer identity always taken from the session, never from the request body
- Audit log for administrative and data changes
- Referenced master data is archived, not hard-deleted

If the API runs behind an internal reverse proxy, set `TRUST_PROXY=true`.

## Scripts

```bash
npm run dev          # API + Vite together
npm run build
npm run typecheck
npm run test         # backend unit tests
npm run lint
```

## Project layout

```text
client/    React SPA
server/    Express API, Prisma schema, seed
PROJECT.md Product specification
```

Do not recreate Excel helper sheets (`Names`, formulas, dropdown lists). The database and reports replace them.
