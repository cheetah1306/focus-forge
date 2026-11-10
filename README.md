# FOCUSFORGE — Study Operating System

FOCUSFORGE is a full-stack study productivity PWA for engineering students preparing for exams. It combines a
timestamp-accurate focus timer, a weekly timetable, a task planner tied to a real syllabus, an exam countdown, a
30-day preparation challenge, distraction accountability and analytics that are computed only from persisted records.

Nothing in the product invents data: every minute, streak and readiness percentage traces back to a row you created.

---

## 1. Status at a glance

| Area | State |
| --- | --- |
| Frontend (10 sections + auth/onboarding) | Complete, responsive, light/dark, PWA installable |
| Timer engine (timestamp-based, recovery, duplicate-proof) | Complete and browser-verified |
| Planner / timetable / subjects / exams / challenge / guardian | Complete and browser-verified |
| Analytics, achievements, CSV export | Complete and browser-verified |
| Supabase schema, RLS, triggers, storage policies | Complete in `supabase/migrations/0001_init.sql` |
| Supabase runtime (real auth, cloud sync, RLS enforcement) | **Requires external configuration** — needs your project URL + anon key |
| Deployment | Config committed (`vercel.json`, `netlify.toml`); **not deployed** because no hosting account/credentials were provided |

No live URL is claimed. See [section 9](#9-what-was-tested-and-what-was-not) for the exact verification report.

---

## 2. Stack

- React 18 + TypeScript 5 + Vite 5 (route-level code splitting)
- Tailwind CSS 3 with CSS-variable light/dark themes
- Framer Motion, Lucide React icons, Recharts
- React Router 6
- Supabase (`@supabase/supabase-js`) — Postgres, Auth, Storage; RLS on every table
- Hand-written PWA (`public/manifest.webmanifest`, `public/sw.js`) with offline shell + notification click handling
- Vercel (primary) / Netlify (alternative) static deployment with SPA rewrites

---

## 3. Run it locally

```bash
npm install
npm run dev            # http://127.0.0.1:5173
```

Without any environment variables the app boots into **Local workspace mode**:

- A complete, fully functional workspace stored in this browser's `localStorage`.
- Clearly labelled in the UI as browser-only. It is **not** authentication and **not** multi-device.
- Documents are stored as data URLs, so uploads are capped at 1.5 MB with an explicit message.

Scripts:

```bash
npm run dev        # dev server
npm run build      # tsc -b && vite build
npm run preview    # serve dist on 127.0.0.1:4173
npm run typecheck  # tsc --noEmit -p tsconfig.app.json
```

---

## 4. Connect Supabase (production mode)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole of `supabase/migrations/0001_init.sql`.
   It creates the schema, checks, indexes, the single-active-session unique index, `updated_at` triggers, the
   new-user bootstrap trigger, every RLS policy, the achievement catalogue and both storage buckets.
3. Copy `.env.example` to `.env` and fill:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key or legacy anon public key>
   ```

   Either the new `sb_publishable_…` key or the legacy anon JWT works. Never place a secret or
   `service_role` key in a `VITE_` variable.

   Then run `npm run verify:supabase` — it checks the URL, the key type, the Auth service, every table
   from the migration and that anonymous reads return no rows. It never prints the key.
4. **Authentication → Providers**: Email is enabled by default. For Google sign-in, enable Google, add your OAuth
   client ID/secret, and register the callback `https://<project-ref>.supabase.co/auth/v1/callback`.
5. **Authentication → URL Configuration**:
   - Site URL: your deployed origin (or `http://127.0.0.1:5173` while developing)
   - Redirect URLs: `http://127.0.0.1:5173/**`, `https://your-domain/**`
6. Restart the dev server. The app now requires real sign-in, and the "Local workspace mode" banner disappears.

Storage buckets are created by the migration: `avatars` (public, owner-scoped writes) and `study-documents`
(private, owner-scoped, read through 7-day signed URLs).

---

## 5. What each section does

| Section | Behaviour |
| --- | --- |
| **Dashboard** | Today's target ring, focus score, next exam countdown, challenge progress, schedule, priority tasks, evidence-based insights, 7-day chart |
| **Focus Room** | Five modes, custom duration, objective, linked task, commitment gate, pause/resume, extend, authorised break, interruption capture with reason |
| **Timetable** | Recurring weekly blocks, day/week/month views, conflict detection, drag-to-reschedule, launch a session directly from a block (completion marks that block) |
| **Study Planner** | Tasks with subject/unit/topic, category, priority, estimate, deadline; links study time to tasks |
| **Subjects** | Subjects → units → topics with status (`not started / in progress / completed / needs revision`), study documents |
| **Exams** | Real dates, type, readiness derived from topic coverage, days/at-risk views |
| **30-Day Challenge** | Never resets on a missed day; per-day hit/miss/partial records, recovery copy, editable targets that never rewrite past days |
| **Analytics** | Daily/weekly/monthly series, subject distribution, completion rates, distraction totals, CSV export |
| **Achievements** | 13 persisted milestones; unlocked only from stored activity, with a celebration modal |
| **Focus Guardian** | Distraction logging, interruption history, transparent score breakdown, missed-block and overdue-task detection |
| **Settings** | Profile, avatar, theme (dark/light/system), reduced motion, sounds, timer defaults, targets, notification preferences, data export, sign out, account deletion |

Global: `Ctrl/⌘ + K` opens All Sections, `Space` toggles pause in the focus lock, bottom navigation on mobile.

---

## 6. How the timer stays honest

- The database stores `started_at`, `planned_end_at`, `planned_minutes`, `paused_at`, `total_paused_seconds`, `status`.
- Remaining time is always derived from timestamps — never from a decrementing counter — so throttled tabs, sleep
  and refreshes cannot drift the clock.
- A 500 ms tick only re-renders; a 15 s heartbeat writes `elapsed_seconds` and a `localStorage` mirror.
- A unique partial index (`status in ('active','paused')`) makes duplicate active sessions impossible at the DB level.
- On reload: an in-progress session resumes. If the tab was gone long enough that the planned end passed, or the
  mirror is older than 10 minutes, the session is finalised as `interrupted` with reason `browser_closed` and the
  logged time is truncated to the last heartbeat — nothing is fabricated.
- Breaks are separate from study time and are excluded from every metric.

**Focus score** (shown with its component breakdown in Focus Guardian):

```
study volume 40 + session completion 25 + academic tasks 15 + consistency 10 + focus discipline 10 = 100
```

**30-day challenge**: Day 1 starts on your first day; past days are immutable; a missed day is recorded as missed
(not a reset) and recovery guidance is shown.

---

## 7. Data model

Created and secured in `supabase/migrations/0001_init.sql`:

`profiles`, `user_preferences`, `subjects`, `units`, `topics`, `study_tasks`, `timetable_entries`, `focus_sessions`,
`session_interruptions`, `daily_goals`, `exam_schedule`, `study_challenges`, `daily_challenge_progress`,
`notifications`, `achievements`, `user_achievements`, `distraction_logs`, `study_resources`.

Every user-owned table has `user_id` + RLS policies for `select/insert/update/delete` scoped to `auth.uid()`;
`achievements` is read-only to authenticated users. `handle_new_user()` bootstraps a profile, preferences and the
default challenge on signup.

Application code talks to a small typed `Backend` interface (`src/lib/backend.ts`) with two real adapters —
Supabase and local storage — so the UI is identical in both modes.

---

## 8. Deployment

### Vercel (primary)

```bash
npm i -g vercel      # or use the dashboard
vercel               # preview
vercel --prod        # production
```

`vercel.json` already sets the Vite build, `dist` output, SPA rewrite, service-worker no-cache headers, manifest
content type and immutable asset caching. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project → Settings →
Environment Variables, then redeploy.

### Netlify (alternative)

```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

`netlify.toml` contains the build command, publish directory, SPA redirect and headers.

After deploying, add the production origin to Supabase Auth → URL Configuration (Site URL + redirect URLs), otherwise
Google/email links will bounce to localhost.

---

## 9. What was tested and what was not

Verified on this machine against the real running app (Chromium, 747×768 mobile viewport and desktop widths):

- `npx tsc --noEmit -p tsconfig.app.json` → 0 errors; `npm run build` → success (entry 84 kB gzip, charts split into
  a lazy chunk).
- Production bundle served by `vite preview`: HTTP 200 for `/`, manifest and `sw.js`; service worker active; clean
  console (no errors/warnings after the Router future flags and SVG `strokeDashoffset` fix).
- Onboarding: identity → 3 subjects → exam → targets → dashboard, with the real records visible afterwards.
- Focus session: commitment gate disabled until checked, session start, live countdown, pause/resume, authorised
  break (break time excluded), interruption dialog with reason + note → row stored as `interrupted` with 45 s actual.
- Reload during an active session: timer rebuilt from timestamps and continued (no false interruption).
- Natural completion of a 1-minute session: status `completed`, 60 s logged, completion modal, break offer, "First
  Spark" achievement unlocked.
- Timetable block creation (conflict view updates), planner task creation, subject unit + topics creation, exam
  countdown, challenge dashboard and settings preload, guardian distraction logging, achievements, settings
  (light/dark switch, reduce motion, sound), mobile "More" sheet.
- Analytics totals matched the stored rows (2 min focused, 1/3 sessions completed, 33% completion).
- Layout checked at 320 px, 390 px and desktop widths: no horizontal overflow, mobile bottom navigation and the
  "More" sheet reachable, fixed focus-lock header usable.

Not verified, because it needs your credentials or a hosting account:

- Supabase sign-up/sign-in, Google OAuth, password reset email delivery, cross-device sync and RLS enforcement
  against a live database. The SQL is written for Postgres 15 / Supabase but has not been executed on a real project.
- A public deployment URL.
- Browser notification delivery after the tab/browser is closed (impossible for a web app; see limitations).

---

## 10. Honest limitations

- **Notifications** require granted permission and a running browser. FOCUSFORGE explicitly states it cannot
  guarantee reminders once the browser is fully closed; the in-app reminder engine runs only while a tab is open.
- **Local mode** is a real, usable workspace but it is browser storage: clearing site data deletes it, and documents
  are limited to 1.5 MB. It is not authentication and offers no protection on a shared computer.
- **Focus Guardian** never blocks apps, hides exit controls or traps you in confirmation loops. It records what you
  report and what the timer observes; it cannot detect other apps.
- **Screen wake lock** is requested where supported; the OS may still sleep the display.
- **Readiness %** is derived from topic statuses you set, not from an external syllabus.
- **Timezone** defaults to `Asia/Kolkata` and is configurable in Settings; daily boundaries follow that zone.

---

## 11. Project structure

```
src/
  App.tsx                 # providers, gates, lazy routes
  components/             # layout shell, UI primitives, session launcher
  lib/
    backend.ts            # Supabase + local adapters behind one typed interface
    store.tsx             # dataset, CRUD actions, achievements, challenge sync
    focus.tsx             # timestamp timer engine, recovery, breaks, completion
    metrics.ts            # day stats, focus score, streaks, analytics, insights
    notifications.ts      # permission handling + reminder engine
    types.ts / utils.ts   # domain types and formatting helpers
  pages/                  # 13 screens incl. auth, onboarding, reset password
supabase/migrations/0001_init.sql
public/                   # manifest, service worker, icons
```
