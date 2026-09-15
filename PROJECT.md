# Bank Supervision Department Training Management Portal

## Cursor Build Specification

> **Purpose:** Build a production-ready internal web application that replaces the manual training-entry workflow currently maintained in the `2025.xlsx` workbook.
>
> **Stack:** React + TypeScript frontend, Node.js + Express + TypeScript backend, Microsoft SQL Server database.
>
> **Important:** The Excel workbook is a **business reference**, not a UI/database blueprint. Do **not** recreate every workbook sheet, formula, helper list, or column. Store only the data the application actually needs.

---

# 1. Core Business Rule

The current workbook contains these training columns:

| Current workbook field | App responsibility |
|---|---|
| Name of the Officer | **System** – comes from logged-in user account |
| Name of the Training Program | **Admin master data** |
| Local / Foreign | **Admin master data** |
| Physical / Online | **User participation form** |
| Type of Training | **Admin master data** |
| Participating the Training as | **User participation form** |
| Duration – From | **User participation form** |
| Duration – To | **User participation form** |
| Institution | **Admin master data** |
| Venue | **Admin master data** |
| Status of Completion | **User participation form**, editable/reviewable by Admin |

## Yellow-column rule

The yellow fields in the existing workbook are:

1. Name of Training Program
2. Local / Foreign
3. Type of Training
4. Institution
5. Venue

These are **NOT free-text fields that users type for every submission**.

They belong to a centrally managed **Training Program** record created by Admin.

Example:

```text
Admin creates Training Program
---------------------------------
Name: Advanced Banking Supervision Programme
Local / Foreign: Foreign
Type of Training: Foreign Training
Institution: SEACEN
Venue: Kuala Lumpur, Malaysia
```

Then a user selects that program:

```text
Training Program: Advanced Banking Supervision Programme

Automatically shown as read-only:
Local / Foreign: Foreign
Type: Foreign Training
Institution: SEACEN
Venue: Kuala Lumpur, Malaysia
```

The user only supplies participation-specific information.

---

# 2. Main User Types

There are two roles only for version 1:

```text
USER
ADMIN
```

Do not add unnecessary roles unless required later.

## USER

A normal Bank employee/officer.

Can:

- Register using Full Name + Bank ID + password
- Log in
- View own dashboard
- View available training programs
- Submit a participation record
- View own training history
- Edit a record only while it is Draft or Returned
- Resubmit a Returned record
- Update completion status when appropriate
- Change own password

Cannot:

- Create/edit/delete training programs
- See other users' private training history
- Access Admin dashboard
- Modify centrally controlled training details

## ADMIN

Can:

- Log in to Admin area
- Approve/reject/disable user registrations
- Create/edit/archive training programs
- Create and maintain dropdown/master data
- View all participation records
- Edit/correct records where necessary
- Return records to user for correction
- Approve records
- View dashboards and analytics
- Search/filter/export data
- Manage users
- View audit history

---

# 3. Authentication and Registration

## Registration page

Fields:

```text
Full Name *
Bank ID *
Password *
Confirm Password *
```

Optional future field:

```text
Official Email
```

### Rules

- `bankId` must be unique.
- Bank ID is the permanent business identifier for a user.
- Password must be hashed with `bcrypt` or `argon2`; never store plain text passwords.
- New self-registered accounts should start as `PENDING`.
- Admin must activate the account before normal use.
- Admin-created users may be created directly as `ACTIVE`.
- Admin accounts must never be available through public registration.

User statuses:

```text
PENDING
ACTIVE
DISABLED
REJECTED
```

Use one login page unless there is a compelling UI reason for separate Admin login.
After login, redirect by role:

```text
USER  -> /app
ADMIN -> /admin
```

Use secure authentication with HttpOnly cookies.
Do not store auth tokens in localStorage.

---

# 4. Public / Landing Page

Route:

```text
/
```

Clean internal-government/banking style.

Page should include:

- Department/system name
- Short purpose statement
- `Login` button
- `Register` button
- No dashboard data exposed publicly

Suggested title:

```text
Bank Supervision Department
Training Management Portal
```

---

# 5. User Dashboard

Route:

```text
/app
```

## Header

Show:

```text
Welcome, <Full Name>
Bank ID: <Bank ID>
```

Actions:

```text
Add Training Record
My Training
Profile
Logout
```

## KPI cards

Show only the logged-in user's statistics:

```text
Total Training Records
Draft
Pending Review
Approved
Completed
Local
Foreign
```

## Recent records table

Columns:

```text
Training Program
Local / Foreign
Physical / Online
From
To
Completion Status
Workflow Status
Actions
```

Do not expose unnecessary database IDs.

---

# 6. User Training Participation Form

Route:

```text
/app/training/new
```

The user is **not creating a Training Program** here.
They are recording their participation in an Admin-created program.

## System-provided identity

Show read-only:

```text
Officer Name
Bank ID
```

These values must come from the authenticated user.
Never accept Officer Name or Bank ID from the request body as authoritative data.

## Step 1 – Select Training Program

Required field:

```text
Training Program *
```

Searchable dropdown/autocomplete.
Only show active training programs.

Once selected, display this Admin-controlled information as read-only:

```text
Local / Foreign
Type of Training
Institution
Venue
```

These values are inherited from the selected program.
Do not duplicate them as user-editable text boxes.

## Step 2 – Participation Details

User enters:

```text
Physical / Online *
Participating the Training as *
From Date *
To Date *
Status of Completion *
Optional Remarks
```

### Physical / Online

Allowed values:

```text
Physical
Online
Hybrid
```

`Hybrid` is an application improvement. If management wants exact workbook compatibility only, it can be disabled from Admin settings.

### Participating the Training as

Admin-managed dropdown.
Initial values from the current workbook:

```text
Participant
Resource Person
Panelist
```

Admin can add more later.

### Dates

Rules:

- `fromDate` required
- `toDate` required
- `toDate >= fromDate`

### Status of Completion

Initial values:

```text
Planned
Ongoing
Completed
Not Completed
Cancelled
```

These may be managed by Admin.

## Form actions

```text
Save Draft
Submit
Cancel
```

---

# 7. Participation Workflow

Use a separate workflow status from completion status.

`completionStatus` answers:

> Did the officer complete the training?

`workflowStatus` answers:

> What is the administrative state of this submission?

Workflow values:

```text
DRAFT
SUBMITTED
RETURNED
APPROVED
REJECTED
```

Transitions:

```text
DRAFT -> SUBMITTED
SUBMITTED -> APPROVED
SUBMITTED -> RETURNED
SUBMITTED -> REJECTED
RETURNED -> SUBMITTED
```

Rules:

- User can edit `DRAFT`.
- User can edit `RETURNED`.
- User cannot directly modify an `APPROVED` record.
- Admin can correct an Approved record, but every change must be audited.
- Returned records require an Admin return note.
- Rejected records require an Admin reason.

---

# 8. Admin Dashboard

Route:

```text
/admin
```

The Admin home page must be a **real management dashboard**, not just a table.

## Top KPI cards

At minimum:

```text
Total Active Users
Pending User Registrations
Total Training Programs
Total Participation Records
Pending Reviews
Approved Records
Completed Trainings
Completion Rate
Local Trainings
Foreign Trainings
Physical Trainings
Online Trainings
```

## Filters

Dashboard-wide filters:

```text
Year
Date range
Officer
Bank ID
Training Program
Local / Foreign
Physical / Online
Training Type
Institution
Participation Role
Completion Status
Workflow Status
```

Filters must affect charts and summary cards where applicable.

## Core charts

Implement with Recharts.

### Chart 1 – Training participation by month

- Line or bar chart
- X: Month
- Y: participation count

### Chart 2 – Local vs Foreign

- Donut chart

### Chart 3 – Physical vs Online

- Donut or bar chart

### Chart 4 – Participation role

Examples:

```text
Participant
Resource Person
Panelist
```

### Chart 5 – Completion status

- Completed
- Ongoing
- Not Completed
- etc.

### Chart 6 – Training type distribution

Use Admin-defined Training Types.

### Chart 7 – Top training institutions

Bar chart, top 10.

### Chart 8 – Officers with highest number of training participations

Bar chart, top 10.

## Summary compatible with current workbook logic

The existing workbook summarizes officer participation using combinations of:

- Participant vs Resource Person
- Local vs Foreign
- Physical vs Online

The new dashboard must be able to generate the same information dynamically.

Admin should have an `Officer Summary` report with columns similar to:

```text
Officer
Participant - Local - Physical
Participant - Local - Online
Participant - Foreign - Physical
Participant - Foreign - Online
Resource Person - Local - Physical
Resource Person - Local - Online
Resource Person - Foreign - Physical
Resource Person - Foreign - Online
Total
```

Do not hard-code only Participant/Resource Person internally; the data model must support other roles such as Panelist.

---

# 9. Admin – Training Programs

Route:

```text
/admin/training-programs
```

This is where the yellow workbook fields are managed.

## Program fields

```text
Name of Training Program *
Local / Foreign *
Type of Training *
Institution *
Venue *
Active / Archived
Optional Description
```

### Local / Foreign

Keep this controlled:

```text
LOCAL
FOREIGN
```

Do not allow spelling variations.

### Type of Training

Admin-managed master data.

Initial values from workbook reference include:

```text
CBS Training
Foreign Training
Virtual Training Program
Public Lecture
```

Do not assume this list is complete.
Admin must be able to add/edit/archive types.

### Institution

Use an Admin-managed Institution master list.

However, when creating a Program:

- searchable select existing institution
- allow Admin to create a new institution inline or via master-data page

### Venue

For v1, keep Venue as text on the Training Program.
Do not create an unnecessary `venues` table unless later required.

For online programs, Admin may enter:

```text
Online
Virtual
Microsoft Teams
Zoom
```

or another meaningful location/platform descriptor.

## Admin actions

```text
Add Program
Edit Program
Archive Program
Reactivate Program
View Participants
```

Do not hard-delete a Training Program that already has participation records.
Archive it instead.

---

# 10. Admin – User Management

Route:

```text
/admin/users
```

Table columns:

```text
Bank ID
Full Name
Role
Account Status
Training Count
Registered Date
Last Login
Actions
```

Actions:

```text
Approve
Reject
Disable
Reactivate
Edit Name
View Training History
Reset Password / trigger reset workflow
Promote to Admin (protected action)
```

Admin promotion must require confirmation.
Do not allow the last active Admin to disable or demote themselves.

---

# 11. Admin – Participation Records

Route:

```text
/admin/records
```

Use a server-side paginated/filterable table.

Columns:

```text
Officer
Bank ID
Training Program
Local / Foreign
Physical / Online
Participation Role
From
To
Completion Status
Workflow Status
Submitted At
Actions
```

Admin can:

```text
View
Edit
Approve
Return
Reject
Export filtered records
```

## Record detail view

Split into sections:

### Officer

```text
Full Name
Bank ID
```

### Training Program – read-only reference

```text
Program
Local / Foreign
Type
Institution
Venue
```

### Participation

```text
Physical / Online
Participating As
From
To
Completion Status
Remarks
```

### Administration

```text
Workflow Status
Return / Reject Reason
Submitted At
Approved At
Approved By
Last Updated
```

### Audit history

Chronological change history.

---

# 12. Admin – Master Data

Route:

```text
/admin/master-data
```

Manage only values that should genuinely be centrally controlled.

## Required master data

### Training Types

Fields:

```text
name
active
sortOrder
```

### Participation Roles

Fields:

```text
name
active
sortOrder
```

Initial examples:

```text
Participant
Resource Person
Panelist
```

### Institutions

Fields:

```text
name
active
```

### Completion Statuses

Fields:

```text
name
active
isFinal
sortOrder
```

Do not build a generic over-engineered key/value system for everything.
Use clear tables/types.

---

# 13. Reports and Export

Route:

```text
/admin/reports
```

Admin can create a report using filters.

## Required reports

### Training Register

One row per officer participation.

Output columns:

```text
No.
Name of the Officer
Bank ID
Name of the Training Program
Local / Foreign
Physical / Online
Type of Training
Participating the Training as
From
To
Institution
Venue
Status of Completion
```

This is the report that maps most closely to the current Excel register.

### Officer Summary

Provide the current workbook-style participation summary plus totals.

### Training Program Summary

```text
Program
Local/Foreign
Type
Institution
Participants
Completed
Completion Rate
```

### Institution Summary

```text
Institution
Programs
Participations
Completed
```

## Export

Required:

```text
Excel (.xlsx)
CSV
```

Optional later:

```text
PDF
```

Use `exceljs` for Excel generation.

The system does **not** need to recreate the workbook's helper sheets (`Names`, duplicate Names sheet, formulas, etc.).
Generate clean reports from database data.

---

# 14. Audit Log

Every important administrative or data change must be traceable.

Table:

```text
audit_logs
```

Record:

```text
id
actorUserId
action
entityType
entityId
beforeJson
afterJson
ipAddress
userAgent
createdAt
```

Examples:

```text
USER_REGISTERED
USER_APPROVED
USER_DISABLED
TRAINING_PROGRAM_CREATED
TRAINING_PROGRAM_UPDATED
TRAINING_PROGRAM_ARCHIVED
PARTICIPATION_SUBMITTED
PARTICIPATION_RETURNED
PARTICIPATION_APPROVED
PARTICIPATION_UPDATED
```

Admin dashboard should have:

```text
/admin/audit
```

with search and filters.

---

# 15. Database Design

Use Microsoft SQL Server.
Use Prisma ORM unless a blocking SQL Server limitation is encountered.

## User

```text
id                UUID / string
bankId            string UNIQUE
fullName          string
passwordHash      string
role              USER | ADMIN
status            PENDING | ACTIVE | DISABLED | REJECTED
lastLoginAt       datetime nullable
createdAt         datetime
updatedAt         datetime
```

## TrainingType

```text
id
name UNIQUE
active
sortOrder
createdAt
updatedAt
```

## Institution

```text
id
name UNIQUE
active
createdAt
updatedAt
```

## ParticipationRole

```text
id
name UNIQUE
active
sortOrder
createdAt
updatedAt
```

## CompletionStatus

```text
id
name UNIQUE
active
isFinal
sortOrder
createdAt
updatedAt
```

## TrainingProgram

```text
id
name
locationScope      LOCAL | FOREIGN
trainingTypeId
institutionId
venue
description nullable
active
createdById
createdAt
updatedAt
```

## TrainingParticipation

```text
id
userId
trainingProgramId
deliveryMode       PHYSICAL | ONLINE | HYBRID
participationRoleId
fromDate
toDate
completionStatusId
remarks nullable
workflowStatus     DRAFT | SUBMITTED | RETURNED | APPROVED | REJECTED
adminComment nullable
submittedAt nullable
approvedAt nullable
approvedById nullable
createdAt
updatedAt
```

## AuditLog

As described above.

## Important relational rule

Do **not** duplicate these TrainingProgram values on TrainingParticipation:

```text
program name
local/foreign
training type
institution
venue
```

They should normally come through the relation to `TrainingProgram`.

### Historical integrity

Because Admin may later edit a Training Program, implement one of these approaches:

**Preferred v1 approach:** prevent material changes to a program once it has submitted/approved participation records; Admin creates a new program/version when the change represents a different event.

This keeps historical records accurate without adding unnecessary snapshot columns.

---

# 16. API Design

Base:

```text
/api
```

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/change-password
```

## User

```text
GET  /api/user/dashboard
GET  /api/user/participations
GET  /api/user/participations/:id
POST /api/user/participations
PUT  /api/user/participations/:id
POST /api/user/participations/:id/submit
GET  /api/user/training-programs
GET  /api/user/training-programs/:id
```

## Admin dashboard

```text
GET /api/admin/dashboard/summary
GET /api/admin/dashboard/monthly
GET /api/admin/dashboard/distributions
GET /api/admin/dashboard/top-institutions
GET /api/admin/dashboard/top-officers
```

The exact number of endpoints may be consolidated if cleanly designed.

## Admin users

```text
GET   /api/admin/users
GET   /api/admin/users/:id
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/approve
POST  /api/admin/users/:id/reject
POST  /api/admin/users/:id/disable
POST  /api/admin/users/:id/reactivate
```

## Admin training programs

```text
GET    /api/admin/training-programs
POST   /api/admin/training-programs
GET    /api/admin/training-programs/:id
PUT    /api/admin/training-programs/:id
DELETE /api/admin/training-programs/:id   -> archive, not hard delete
```

## Admin participations

```text
GET  /api/admin/participations
GET  /api/admin/participations/:id
PUT  /api/admin/participations/:id
POST /api/admin/participations/:id/approve
POST /api/admin/participations/:id/return
POST /api/admin/participations/:id/reject
```

## Master data

CRUD routes for:

```text
training-types
institutions
participation-roles
completion-statuses
```

Use archive/deactivate semantics when referenced by historical records.

## Reports

```text
GET /api/admin/reports/training-register
GET /api/admin/reports/officer-summary
GET /api/admin/reports/program-summary
GET /api/admin/reports/institution-summary
GET /api/admin/exports/training-register.xlsx
GET /api/admin/exports/training-register.csv
```

---

# 17. Frontend Stack

Use:

```text
React
TypeScript
Vite
React Router
Tailwind CSS
shadcn/ui or a similarly clean component layer
TanStack Query
React Hook Form
Zod
Recharts
Lucide icons
```

Do not introduce Redux unless the actual implementation requires it.
TanStack Query + small auth/context state is enough.

## UI principles

- Professional internal banking/government application
- Desktop-first but responsive
- Clean spacing
- High readability
- Accessible labels
- Keyboard-friendly forms
- Tables must have loading, empty and error states
- Confirmation modal for destructive/security-sensitive actions
- Toasts for success/failure
- No excessive animations
- No glassmorphism/gimmicky UI

---

# 18. Frontend Routes

## Public

```text
/
/login
/register
```

## User

```text
/app
/app/training
/app/training/new
/app/training/:id
/app/profile
```

## Admin

```text
/admin
/admin/users
/admin/training-programs
/admin/records
/admin/master-data
/admin/reports
/admin/audit
/admin/settings
```

Protect all routes by role on both frontend and backend.
Frontend route protection is for UX only; backend authorization is mandatory.

---

# 19. Suggested Repository Structure

Use a monorepo-style structure:

```text
training-management-portal/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── trainingPrograms/
│   │   │   ├── participations/
│   │   │   ├── users/
│   │   │   ├── reports/
│   │   │   └── masterData/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── main.tsx
│   └── ...
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── types/
│   │   └── app.ts
│   └── ...
│
├── .env.example
├── README.md
└── PROJECT.md
```

Keep business logic out of Express route files.

---

# 20. Backend Architecture Rules

Use layers:

```text
Route
 -> Controller
 -> Service
 -> Repository / Prisma
```

Validation:

```text
Zod schemas
```

Global error handling required.

Return a consistent API error shape, e.g.:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
```

Successful list APIs should support pagination:

```text
page
pageSize
sortBy
sortDirection
search
filters...
```

---

# 21. Security Requirements

Minimum production requirements:

- Password hashing
- HttpOnly authentication cookie
- Secure cookie in production
- SameSite protection
- CORS restricted to configured frontend origin
- Helmet
- Request rate limiting for auth endpoints
- Zod input validation
- Role-based authorization middleware
- SQL injection protection through parameterized ORM queries
- No password hashes in API responses
- No secrets committed to git
- Environment validation on server startup
- Audit Admin actions
- Sanitize/validate report filter inputs
- Do not trust client-provided user IDs for user-owned records

If the application is deployed behind an internal proxy, configure trusted proxy settings correctly.

---

# 22. SQL Server Configuration

`.env.example` should include:

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL="sqlserver://localhost:1433;database=TrainingPortal;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=true"
JWT_SECRET=CHANGE_ME_WITH_A_LONG_RANDOM_VALUE
COOKIE_NAME=training_portal_session
```

If using a session table instead of JWT, document the change clearly.

SQL Server Management Studio is only the management UI; the application connects to the SQL Server Database Engine.

---

# 23. Seed Data

Create a seed script.

Seed:

## One Admin

Use environment variables where possible:

```text
ADMIN_BANK_ID
ADMIN_NAME
ADMIN_PASSWORD
```

Do not hard-code a permanent production password.

## Local / Foreign

Enum; no seed table required.

## Delivery Mode

Enum:

```text
PHYSICAL
ONLINE
HYBRID
```

## Participation Roles

```text
Participant
Resource Person
Panelist
```

## Training Types

Initial reference values:

```text
CBS Training
Foreign Training
Virtual Training Program
Public Lecture
```

## Completion Statuses

```text
Planned
Ongoing
Completed
Not Completed
Cancelled
```

---

# 24. Important Data/UX Decisions

## Do not ask the user to re-enter identity

No user form field for:

```text
Officer Name
Bank ID
```

Use session identity.

## Do not ask the user to re-enter yellow program data

After Program selection, display:

```text
Local/Foreign
Type
Institution
Venue
```

as read-only.

## Avoid duplicate free-text categories

Do not allow a user to type:

```text
participant
Participant
PARTICIPANT
```

Use controlled IDs/master data.

## Preserve history

Do not hard-delete referenced master data.
Use `active=false` / archive.

## Current Excel workbook

Do not reproduce:

```text
Summary formulas
Names helper worksheet
Names (1)
Sheet1
Excel dropdown-helper implementation
```

The database and application replace these mechanisms.

---

# 25. Admin Dashboard UX Layout

Suggested desktop layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ Top Bar: Training Management Portal     Admin Name   Logout   │
├──────────────┬────────────────────────────────────────────────┤
│ Dashboard    │ KPI  KPI  KPI  KPI                            │
│ Users        │                                               │
│ Programs     │ Monthly Participation      Local vs Foreign   │
│ Records      │ [chart]                    [donut]             │
│ Master Data  │                                               │
│ Reports      │ Physical vs Online         Completion Status  │
│ Audit        │ [chart]                    [chart]             │
│ Settings     │                                               │
│              │ Top Institutions          Top Officers        │
│              │ [bar]                     [bar]               │
│              │                                               │
│              │ Pending Reviews / Recent Activity             │
└──────────────┴────────────────────────────────────────────────┘
```

Make cards clickable where useful.
Example: clicking `Pending Reviews` opens filtered Records page.

---

# 26. User Dashboard UX Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ Training Portal                     Profile       Logout      │
├───────────────────────────────────────────────────────────────┤
│ Welcome, Officer Name                                          │
│ Bank ID: XXXXX                                                 │
│                                                               │
│ Total     Pending     Approved     Completed                   │
│                                                               │
│ [+ Add Training Record]                                       │
│                                                               │
│ My Recent Training                                            │
│ Program | Dates | Mode | Completion | Workflow | Action       │
└───────────────────────────────────────────────────────────────┘
```

---

# 27. Dashboard Calculation Definitions

Use consistent definitions.

```text
Total Participation Records
= count of records excluding DRAFT only where a submitted metric is intended
```

For admin total database records, explicitly label whether drafts are included.

```text
Pending Reviews
= workflowStatus = SUBMITTED
```

```text
Approved Records
= workflowStatus = APPROVED
```

```text
Completed Trainings
= completionStatus = Completed
```

```text
Completion Rate
= completed / records eligible for completion * 100
```

If eligibility is ambiguous, use:

```text
Completed / (Completed + Not Completed)
```

and document the definition in an info tooltip.
Do not silently mix Planned/Ongoing records into the denominator.

---

# 28. Validation Rules

## Registration

- Full Name: 2–150 chars
- Bank ID: 1–50 chars, trim, unique
- Password: minimum 8 chars for development; production policy can be strengthened

## Training Program

- Name required
- Local/Foreign required
- Training Type required
- Institution required
- Venue required

## Participation

- Program required
- Delivery mode required
- Participation role required
- From date required
- To date required
- To >= From
- Completion status required
- Remarks max length (e.g. 2,000 chars)

Prevent accidental duplicate submissions where the same user, same program and same date range already exist; warn the user and require explicit confirmation or Admin resolution.

---

# 29. Search Requirements

Admin global/table search should match:

```text
Officer Name
Bank ID
Training Program
Institution
Venue
```

Use case-insensitive contains behavior where practical.

User program selector should search:

```text
Program Name
Institution
```

---

# 30. Responsive Behaviour

Primary target: desktop/laptop internal usage.

Still support tablet/mobile:

- sidebar collapses
- charts stack vertically
- tables can horizontally scroll
- forms remain usable

Do not compromise desktop information density for mobile-first styling.

---

# 31. Testing Requirements

Backend:

- Auth registration/login
- Role protection
- User cannot fetch another user's record
- Admin authorization
- Program CRUD/archive
- Participation workflow transitions
- Validation of dates
- Dashboard aggregation
- Report filters

Frontend:

- Registration/login
- User participation form
- Admin program creation
- Admin approval workflow
- Filtered records page
- Dashboard loading/error/empty states

At minimum, create meaningful unit/integration tests for business-critical backend logic.

---

# 32. Implementation Order for Cursor

Implement in this order. Do not try to build everything simultaneously.

## Phase 1 – Project foundation

1. Create `client` and `server` TypeScript projects.
2. Configure ESLint/formatting.
3. Configure Tailwind/UI library.
4. Configure Express.
5. Configure environment validation.
6. Configure Prisma + SQL Server.
7. Create schema and migrations.
8. Add seed data.

## Phase 2 – Authentication

1. Registration
2. Login/logout
3. `GET /auth/me`
4. role/status middleware
5. protected frontend routes
6. Pending-account experience

## Phase 3 – Admin master data

1. Training Types
2. Institutions
3. Participation Roles
4. Completion Statuses

## Phase 4 – Admin Training Programs

Build the yellow-field Training Program management page.

## Phase 5 – User participation

1. Program browser/search
2. Add participation form
3. Read-only yellow data display
4. Draft/submit
5. My Training table

## Phase 6 – Admin records and workflow

1. All records table
2. Detail page
3. Approve
4. Return
5. Reject
6. Admin corrections
7. Audit logs

## Phase 7 – Dashboard

Build API aggregation first, then frontend charts.

## Phase 8 – Reports and Excel/CSV export

Implement register and officer summary.

## Phase 9 – hardening

1. Tests
2. security pass
3. accessibility pass
4. error states
5. pagination/performance
6. README/deployment docs

---

# 33. Definition of Done

The project is not complete until all of the following work:

- [ ] User can register with Full Name and unique Bank ID.
- [ ] Admin can approve a pending account.
- [ ] User can log in after approval.
- [ ] Admin can create Training Types and Institutions.
- [ ] Admin can create a Training Program containing all yellow workbook fields.
- [ ] User can select an Admin-created Training Program.
- [ ] Yellow program information appears automatically and cannot be changed by User.
- [ ] User can enter Physical/Online, Participation Role, From/To dates and Completion Status.
- [ ] User can save draft and submit.
- [ ] Admin sees submitted records.
- [ ] Admin can approve, return or reject.
- [ ] User can correct a returned record.
- [ ] User dashboard shows personal summary.
- [ ] Admin dashboard shows meaningful KPIs and charts.
- [ ] Admin can filter/search all records.
- [ ] Current workbook-style officer summary can be generated dynamically.
- [ ] Admin can export training register to Excel/CSV.
- [ ] Audit log records important actions.
- [ ] Backend authorization prevents cross-user/role access.
- [ ] SQL Server is the persistent database.
- [ ] `.env.example`, migration/seed instructions and README are complete.
- [ ] No workbook helper sheets or irrelevant columns have been recreated in the app.

---

# 34. Cursor Agent Rules

When implementing this project:

1. **Do not invent new business fields unless technically required.**
2. **Do not convert every Excel column/sheet into a database table.**
3. **Do not make yellow fields user-editable.** They belong to Admin-created Training Programs.
4. **Do not duplicate user Name/Bank ID in forms.** Use authenticated identity.
5. **Do not hard-code training categories in React components.** Load master data from API.
6. **Do not hard-delete referenced business data.** Archive/deactivate it.
7. **Do not calculate dashboard KPIs in the browser from a giant raw dataset.** Aggregate on the server/database.
8. **Do not expose Admin APIs to USER role.**
9. **Do not use localStorage for authentication tokens.**
10. **Do not leave placeholder/mock data once an API endpoint is implemented.**
11. **Do not mark the project complete with TODOs in critical user flows.**
12. **Run lint, type-check, tests and production builds before finalizing.**
13. **Keep UI professional, restrained and suitable for an internal banking environment.**
14. **Use the existing workbook terminology where it carries business meaning.**
15. **Ask for a business decision only when the specification truly cannot resolve it; otherwise implement the documented default.**

---

# 35. Optional Future Enhancements – Do Not Block V1

Do not implement these until the core application works:

```text
Official email verification
Password-reset email
SSO / Active Directory
Department/Division hierarchy
Training invitations/nomination workflow
Certificates/uploads
Training costs/budgets
Approval chains
Notifications
Calendar integration
PDF management reports
Historical Excel import
Power BI/Tableau integration
```

Design the code cleanly enough that these can be added later, but do not over-engineer V1 for them.

---

# 36. Final Product Goal

The application should replace this manual pattern:

```text
Officer information + repeated Excel typing + helper sheets + formula summary
```

with:

```text
Admin creates standardized Training Program
        ↓
User registers / logs in
        ↓
User selects Program
        ↓
Program's yellow fields load automatically
        ↓
User enters participation details
        ↓
Admin reviews / approves
        ↓
Database creates dashboards, summaries and exports automatically
```

The result should be simpler than the workbook for users, more controlled for Admin, and significantly better for reporting and management analytics.

