# Marketing screenshots

Referenced by `<Shot>` / `<PhoneShot>` in `components/site-sections.tsx` and the
marketing pages. PII-safe demo data only — never a capture of the production
database.

## Desktop (1536×1024, JPEG q95)

JPEG rather than PNG: these render up to ~969 CSS px (the `DeviceCombo` on `/`),
so the 1536px source is kept for retina, and q95 re-encoding cuts ~78% of the
weight with no visible loss. Regenerate with
`sips -s format jpeg -s formatOptions 95 <in>.png --out <name>.jpg`.

| File | Image | Used on |
|---|---|---|
| `officer-dashboard.jpg` | Placement Officer dashboard (St Francis College demo) | `/`, `/product`, `/insights`, `/mobile` |
| `complexity-to-clarity.jpg` | "From Placement Complexity to Placement Clarity" infographic | `/product` |

## Student app (mobile, 540×1200)

| File | Screen | Used on |
|---|---|---|
| `student-home.png` | Home — readiness banner + applications | `/mobile` gallery |
| `student-employability.png` | My Employability — readiness / tier / roadmap | `/`, `/readiness`, `/mobile` |
| `student-jobs.png` | Jobs — Open / Applied / Closed | `/mobile` gallery |
| `student-applications.png` | Application timeline — round by round | `/mobile` gallery |
| `student-tracker.png` | Placement Tracker — funnel | `/mobile` gallery |
| `student-notifications.png` | Notifications feed | `/mobile` gallery |
