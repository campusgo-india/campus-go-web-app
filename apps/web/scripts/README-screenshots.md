# Marketing screenshots

The topic pages (`/`, `/product`, `/readiness`, `/mobile`, `/insights`) show
hand-built SVG mockups inside a browser / phone frame
(`HeroDashboard`, `PhoneMockup` in `components/site-sections.tsx`). Replace them
with **real product captures** by dropping PNGs into
`apps/web/public/screenshots/` — they get wired into the existing frames.

## Rules

- **Demo / seed data only.** Never a capture of the production database — it
  holds real students' names, emails and CGPAs, which must not appear on a
  public marketing site. Blur or use fake data if capturing from a real tenant.
- **No Platform / Super-Admin screens.** Student, Placement Officer and College
  Admin only.
- PNG, no browser chrome needed (the site draws its own frame).

## What to share

### Desktop — Placement Officer & College Admin  (≈ 1440 × 900, light theme)

| File | Route | Shows |
|---|---|---|
| `officer-placement.png` | `/placement` | Placement Progress funnel (UG/PG), Active Drives, students requiring attention |
| `officer-pipeline.png` | `/jobs/<id>/pipeline` | recruitment funnel round-by-round for a job in progress |
| `officer-analytics.png` | `/analytics` | placement funnel + package stats |
| `officer-training.png` | `/training/dashboard` | readiness distribution / placement-ready headcount |
| `officer-jobs.png` | `/jobs` | lifecycle badges (Published / Closed / In progress / Completed) + Eligible column |
| `admin-students.png` | `/students` | cohort list, details-complete, filters |

### Mobile — Student app  (≈ 390 × 844)

| File | Route | Shows |
|---|---|---|
| `student-home.png` | `/me` | greeting, readiness card, quick actions, applications |
| `student-employability.png` | `/me/training` | readiness ring, roadmap, tier badge |
| `student-applications.png` | `/me/applications` | application tracker with round stages |
| `student-jobs.png` | `/me/jobs` | job feed with lifecycle badges |
| `student-profile.png` | `/me/profile` | profile + completion ring |

A subset is fine — even 2 desktop + 2 mobile lifts the site a lot. Filenames
don't have to match exactly; just say which is which when you share them.

## Wiring (done once files land)

In `components/site-sections.tsx`, swap the SVG body of `HeroDashboard` /
`PhoneMockup` (or add a `Shot` helper) for
`<img src="/screenshots/<name>.png" alt="…" className="w-full" />` inside the
existing `BrowserFrame` / `PhoneFrame`.
