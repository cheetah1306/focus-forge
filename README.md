<div align="center">

# Focus Forge

### Build focus. Protect your time. Forge your progress.

A personal study workspace for focused sessions, academic planning, timetable management and measurable progress.

**[Open the Live App](https://focusforge-ashen-five.vercel.app)** · **[View on GitHub](https://github.com/cheetah1306/focus-forge)**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel&logoColor=white)

</div>

---

## About Focus Forge

Focus Forge helps students turn study plans into consistent action. It brings together what you plan to study, when you plan to study, and the time you actually spend studying—all in one workspace.

It is more than a countdown timer: it combines a focus room, study planner, weekly timetable, exam preparation tools and progress analytics.

## What makes it different?

- **Timestamp-driven focus sessions:** Session time is calculated from real timestamps, helping avoid timer drift when a browser tab sleeps or reloads.
- **Planning connected to execution:** Link focus sessions to tasks and timetable blocks so planned work can be compared with completed work.
- **A realistic 30-day challenge:** Missed days remain part of the history instead of resetting the entire challenge.
- **Activity-based insights:** Focus scores, streaks, analytics and achievements are based on recorded study activity and topic progress.
- **Flexible data modes:** Use browser-local storage to get started, or configure Supabase for authentication and cloud-backed, user-isolated data.
- **Transparent accountability:** Focus Guardian records reported distractions and interruptions; it does not monitor or block other applications.

## Features

| Feature | Description |
| --- | --- |
| **Dashboard** | Daily targets, focus score, upcoming exams, challenge progress, schedule and priority tasks. |
| **Focus Room** | Five focus modes, custom duration, session objectives, linked tasks, pause/resume, extensions, breaks and interruption records. |
| **Study Planner** | Organise tasks by subject, unit, topic, priority, category, estimated time and deadline. |
| **Smart Timetable** | Recurring weekly blocks, day/week/month views, conflict detection, drag-to-reschedule and session launching. |
| **Subject & Topic Tracking** | Organise units and topics; track not started, in progress, completed and needs revision. |
| **Exam Preparation** | Add exam dates and types, view countdowns and track readiness through topic coverage. |
| **30-Day Focus Challenge** | Set daily goals, review results and retain history when days are missed. |
| **Analytics** | Daily, weekly and monthly trends, subject distribution, completion rates, distraction insights and CSV export. |
| **Achievements** | 13 milestones earned through recorded activity. |
| **Focus Guardian** | Distraction logs, interruptions, missed timetable blocks, overdue tasks and focus-score breakdown. |
| **Personalisation** | Profile and avatar, themes, reduced motion, sounds, timer defaults, targets and notification preferences. |

## The focus engine

The timer uses a timestamp-driven session model instead of relying only on a ticking counter. It records the session start, planned end, pause time, accumulated paused duration and current status. This allows remaining time to be reconstructed after a refresh and supports recovery from interrupted sessions.

Break time is tracked separately from study time. A unique partial database index also prevents multiple active or paused sessions for the same user.

The focus score is a 100-point activity breakdown:

| Dimension | Weight |
| --- | ---: |
| Study volume | 40 |
| Session completion | 25 |
| Academic tasks | 15 |
| Consistency | 10 |
| Focus discipline | 10 |
| **Total** | **100** |

The score is intended as a habit and activity indicator—not as a prediction of exam marks or academic results.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI and styling | Tailwind CSS 3, CSS variables, Framer Motion, Lucide React |
| Routing and charts | React Router 6, Recharts |
| Backend | Supabase: PostgreSQL, Auth and Storage |
| Offline experience | Web App Manifest, Service Worker and browser storage |
| Deployment | Vercel; Netlify configuration is also included |

## Run locally

**Prerequisites:** Node.js and npm.

\`\`\`bash
git clone https://github.com/cheetah1306/focus-forge.git
cd focus-forge
npm install
npm run dev
\`\`\`

Open the local address printed by Vite (configured host: \`127.0.0.1:5173\`).

### Useful commands

\`\`\`bash
npm run dev             # Start the development server
npm run build           # Type-check and create the production build
npm run preview         # Preview the production build
npm run typecheck       # Run TypeScript checks
npm run verify:supabase # Verify Supabase configuration and schema
\`\`\`

## Data modes

### Local workspace

The app can run without Supabase environment variables. In this mode, workspace data is stored in the current browser's \`localStorage\`. This is useful for trying the app, but it does not provide account authentication or multi-device synchronisation. Clearing browser site data removes local workspace data. Local document uploads are limited to 1.5 MB.

### Supabase production mode

1. Create a project at [Supabase](https://supabase.com).
2. Run \`supabase/migrations/0001_init.sql\` in the Supabase SQL Editor.
3. Copy \`.env.example\` to \`.env\` and configure:

\`\`\`env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-public-key>
\`\`\`

4. Run \`npm run verify:supabase\`.
5. Configure authentication providers and Site URL / redirect URLs in Supabase Auth settings.
6. Restart the development server.

The migration defines the database schema, indexes, triggers, user-scoped Row Level Security (RLS) policies, achievement catalogue and storage policies.

**Security:** Never expose a Supabase \`service_role\` key or secret key through a \`VITE_\` variable. Frontend environment variables are visible in the browser. Use only the publishable key or legacy anon public key in client-side configuration.

## Live deployment

<div align="center">

### Focus Forge is live

**[https://focusforge-ashen-five.vercel.app](https://focusforge-ashen-five.vercel.app)**

[**Launch the app**](https://focusforge-ashen-five.vercel.app)

</div>

The repository includes Vercel configuration for a Vite production build:

- Build command: \`npm run build\`
- Output directory: \`dist\`
- SPA rewrite to \`index.html\`
- Service worker and manifest response headers
- Immutable caching for generated assets

To deploy your own copy, import the repository into Vercel, configure Supabase environment variables if using cloud mode, and deploy. Add the deployed origin to Supabase Auth URL configuration. A Netlify configuration is also included in \`netlify.toml\`.

## Project structure

\`\`\`text
focus-forge/
├── public/                    # PWA manifest, service worker and icons
├── src/
│   ├── components/            # Shared UI and session launcher
│   ├── lib/
│   │   ├── backend.ts         # Typed backend interface and adapters
│   │   ├── store.tsx          # Workspace state and data operations
│   │   ├── focus.tsx          # Timer engine and recovery
│   │   ├── metrics.ts         # Focus score and analytics
│   │   ├── notifications.ts   # Reminder handling
│   │   └── types.ts           # Domain types
│   └── pages/                 # Application screens
├── supabase/
│   └── migrations/
│       └── 0001_init.sql      # Schema, RLS, triggers and storage policies
├── vercel.json
├── netlify.toml
└── package.json
\`\`\`

## Privacy and practical limitations

- Supabase mode uses user-scoped RLS policies for user-owned records. Local mode stays in the current browser.
- Focus Guardian records reported distractions and timer interruptions; it does not monitor or block other applications.
- Browser notifications require permission and browser support. Delivery is not guaranteed after the browser is fully closed.
- Screen Wake Lock is requested where supported, but the operating system may still turn off the display.
- Exam readiness is calculated from topic statuses entered in the app; it is not an external assessment of syllabus mastery.
- Daily boundaries use the configured timezone (default: \`Asia/Kolkata\`).

## Verification notes

Project documentation records checks for TypeScript compilation and production builds, timer pause/resume and reload recovery, session completion and interruption logging, planner/timetable/subject/exam workflows, analytics consistency, responsive layouts, and Supabase RLS/storage isolation.

Google OAuth and password-reset email delivery require provider configuration and are not documented as fully verified. Browser-closed notification delivery is not guaranteed.

## Contributing

Ideas and improvements are welcome. Open an issue to report a bug or discuss a feature, or submit a pull request with a clear description and testing notes.

## License

A license file is not currently documented in this repository. Please contact the repository owner before reusing or redistributing the code.

---

<div align="center">

**Plan with intention. Focus with discipline. Forge your progress.**

[Try Focus Forge](https://focusforge-ashen-five.vercel.app) · [Explore the GitHub repository](https://github.com/cheetah1306/focus-forge)

</div>
