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
- Database: Microsoft SQL Server in production; JSON file store (`server/data/store.json`) as a local fallback when SQL Server is not running

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

## Local testing without SQL Server

The app is finished for local use with a **JSON file store**. SQL Server is the only remaining production step.

If SQL Server is not installed or `localhost:1433` is unreachable, set:

```env
DATA_STORE=json
```

Development defaults to JSON when `DATA_STORE` is omitted. The API writes to `server/data/store.json` and seeds demo data on first start (and adds extra demo officers on later boots if missing).

- `json`: always use the file store (recommended until SQL is ready)
- `auto`: try SQL Server, fall back to JSON
- `sqlserver`: require SQL Server and fail if it is down

Check `/api/health` — it reports `"store": "json"` or `"store": "sqlserver"`.

### Demo accounts (JSON seed)

Login uses **Bank ID as the username** (there is no separate username field). The seeded **super admin** is controlled by `ADMIN_BANK_ID` (default `ADMIN001`) — do not remove it.

| Role | Bank ID | Password | Notes |
|---|---|---|---|
| Super admin | `ADMIN001` | `ChangeMeNow123` | From `ADMIN_BANK_ID` — only this account can create other admins |
| Officer | `9672` | `Training9672` | Thanuka Ellepola — has training |
| Officer | `1001`–`1005` | `Training9672` | Mix of attended / never attended |
| Pending | `2001` | `Training9672` | Cannot log in until approved |

Admins are **separate accounts**. Officers are never promoted to admin. Only the super admin can open **Admins** and create additional ADMIN logins. Officer rankings, never-attended lists, and Compare use USER accounts only.

**Historical import:** Admin → **Import** accepts the 2025 register CSV (`Bank No` = Bank ID; dates prefer **D/M/YYYY**). Rows without Bank No are skipped. Officers not yet registered are stored as `IMPORTED` (name may be blank). Login with an IMPORTED Bank ID shows a claim message — register with that Bank ID to attach history, then wait for admin approval. Officer KPIs / never-attended lists count **ACTIVE** USER accounts only.

### Where admin “adds things” for forms

- **Master Data** — dropdown values (types, institutions, roles, completion statuses)
- **Training Programs** — yellow workbook fields officers select
- Form **column names** stay fixed to the Excel register (by design)

## Seeded accounts

| Role | Full Name | Bank ID | Password |
|---|---|---|---|
| Super admin | System Administrator | `ADMIN001` (`ADMIN_BANK_ID`) | from `ADMIN_PASSWORD` (default `ChangeMeNow123`) |
| Test officer | Thanuka Ellepola | `9672` | from `TEST_USER_PASSWORD` (default `Training9672`) |

The test officer is created as `ACTIVE` so it can be used immediately after seed.

Self-registered officers start as `PENDING` and cannot log in until an Admin approves them.

## Main routes

| Route | Role |
|---|---|
| `/` `/login` `/register` | Public |
| `/app` | Officer dashboard |
| `/app/training/new` | Record participation |
| `/admin` | Department admin dashboard |
| `/admin/admins` | Super admin only — create/list admin accounts |
| `/admin/import` | Historical CSV upload (Bank No required; dates D/M/YYYY) |
| `/admin/analytics/compare` | Compare two officers (sidebar **Compare** only) |
| `/admin/users` | Officers (USER; IMPORTED = awaiting claim) |
| `/admin/training-programs` | Yellow-field programme master |
| `/admin/master-data` | Types, institutions, roles, completion statuses |
| `/admin/records` | Review workflow |
| `/admin/reports` | Register, officer activity, summaries, Excel/CSV downloads |
| `/admin/audit` | Audit log |
| `/admin/settings` | Department settings |

## KPI definitions

- **Pending Reviews** = `workflowStatus = SUBMITTED`
- **Approved Records** = `workflowStatus = APPROVED`
- **Completed Trainings** = completion status named `Completed`
- **Completion Rate** = Completed / (Completed + Not Completed). Planned and Ongoing records are excluded from the denominator.

Admin total record cards distinguish **all database records including drafts** from **submitted records**. **Officers with no training** counts **ACTIVE** USER accounts that have no submitted (non-draft) participation records (IMPORTED placeholders are excluded).

Admin reports can be downloaded as Excel and CSV: Training Register, Officer Activity, Officer Summary, Programme Summary, Institution Summary, Users, and the current Participation Records filter.

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

## Remaining work (production database only)

Everything else in the Definition of Done is implemented against the JSON store for local/demo use.

To switch to SQL Server later:

1. Install SQL Server and create database `TrainingPortal`
2. Put real credentials in `server/.env` `DATABASE_URL`
3. Set `DATA_STORE=sqlserver` (or `auto`)
4. Run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`
5. Confirm `/api/health` shows `"store": "sqlserver"`

