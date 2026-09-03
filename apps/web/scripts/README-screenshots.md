# Marketing screenshots

The topic pages (`/product`, `/readiness`, `/mobile`, `/insights`) currently
show stylized SVG mockups inside a browser / phone frame. Replace them with
real product captures when a local stack + demo data are available.

## What to capture

Drop the PNGs in `apps/web/public/screenshots/`. **No Platform/Super-Admin
screens.**

### College Admin & Placement Officer — desktop, 1440 × 900

| File | Route | Shows |
|---|---|---|
| `officer-placement.png` | `/placement` | Placement Progress funnel (UG/PG), Active Drives, "students requiring attention" |
| `officer-pipeline.png` | `/jobs/<id>/pipeline` | recruitment funnel round-by-round for a job in progress |
| `officer-analytics.png` | `/analytics` | placement funnel + package stats |
| `officer-training.png` | `/training/dashboard` | readiness distribution / Placement-ready headcount |
| `officer-jobs.png` | `/jobs` (list view) | lifecycle badges (Published / In progress / Completed) + Eligible column |
| `admin-students.png` | `/students` | cohort list, details-complete, filters |

### Student — mobile, 390 × 844, deviceScaleFactor 3

| File | Route | Shows |
|---|---|---|
| `student-home.png` | `/me` | greeting, readiness card, quick actions, applications |
| `student-employability.png` | `/me/training` | readiness ring, roadmap, tier badge |
| `student-applications.png` | `/me/applications` | application tracker with round stages |
| `student-jobs.png` | `/me/jobs` | job feed with lifecycle badges |
| `student-profile.png` | `/me/profile` | profile + completion ring |

## How (once you have Postgres)

```bash
# 1. Postgres (Docker, or Postgres.app, or a scratch Supabase schema — NOT prod)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name cg-pg postgres:16
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"

# 2. schema + demo data  (seed-marketing-demo.ts is TODO — see plan)
cd packages/database && npx prisma db push && npx tsx prisma/seed.ts

# 3. run the stack
(cd apps/api && JWT_ACCESS_SECRET=dev JWT_REFRESH_SECRET=dev npx nest start &)
(cd apps/web && API_PROXY_TARGET=http://localhost:4000 npx next dev &)

# 4. capture
cd apps/web && npx playwright install chromium && node scripts/shoot-marketing.mjs
```

Then in `components/site-sections.tsx` swap each `<OfficerDesktopMockup />` /
`<DashboardMockup />` / `<PhoneMockup />` for
`<img src="/screenshots/<name>.png" alt="…" />` inside its existing frame.
