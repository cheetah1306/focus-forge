<div align="center">

<img src="public/icon-512.png" alt="Focus Forge logo" width="112" />

# FOCUS FORGE

### Your time. Your focus. Your progress.

**A personal study workspace that turns intentions into consistent action.**

Plan smarter · Focus deeper · Track every step

[![Live App](https://img.shields.io/badge/🚀_Launch_App-Focus_Forge-635BFF?style=for-the-badge)](https://focusforge-ashen-five.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github)](https://github.com/cheetah1306/focus-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)

</div>

---

## ✨ Explore

| [Overview](#-why-focus-forge) | [Features](#-everything-in-one-workspace) | [How it works](#-how-focus-forge-works) | [Tech stack](#-technology-stack) | [Setup](#-get-started) | [License](#-license) |
|:---:|:---:|:---:|:---:|:---:|:---:|

## 🎯 Why Focus Forge?

Studying effectively is not only about spending more hours at a desk. It is about knowing **what to study, when to study, and whether the planned work is actually getting done.**

Focus Forge brings those pieces together in one organised workspace. Build a study plan, schedule it, start a focused session, and use your activity data to understand your progress.

> **One workspace. A complete study routine. Progress you can measure.**

## 🚀 Everything in one workspace

<details open>
<summary><strong>🧠 Focus & productivity</strong></summary>

- **Focus Room** — Five focus modes, custom session durations, objectives and task linking.
- **Session controls** — Pause, resume, extend sessions, record interruptions and manage breaks.
- **Focus Guardian** — Review reported distractions, missed timetable blocks and overdue tasks.
- **30-Day Focus Challenge** — Set daily goals and keep your challenge history, even when you miss a day.

</details>

<details>
<summary><strong>📚 Academic planning</strong></summary>

- **Study Planner** — Organise tasks by subject, unit, topic, priority, category, estimated duration and deadline.
- **Smart Timetable** — Create recurring weekly blocks, switch between calendar views, detect conflicts and reschedule work.
- **Subject & Topic Tracking** — Track topics as not started, in progress, completed or needing revision.
- **Exam Preparation** — Add exam dates and types, view countdowns and follow topic-level preparation progress.

</details>

<details>
<summary><strong>📊 Insights & personalisation</strong></summary>

- **Dashboard** — See daily targets, upcoming exams, priority tasks, schedule and focus progress.
- **Analytics** — Review daily, weekly and monthly trends, subject distribution and completion rates; export data as CSV.
- **Achievements** — Unlock 13 milestones through recorded activity.
- **Personalisation** — Configure profile, avatar, themes, reduced motion, sounds, timer defaults, targets and notification preferences.

</details>

## 💡 What makes it different?

| Capability | Why it matters |
|---|---|
| **Timestamp-based timer** | Uses recorded timestamps instead of trusting a counter that can drift when a browser tab sleeps. |
| **Session recovery** | Reconstructs remaining time after a refresh and handles interrupted sessions. |
| **Plan-to-focus connection** | Links sessions with tasks and timetable blocks, connecting intention with execution. |
| **Break-aware tracking** | Keeps break time separate from focused study time. |
| **Challenge history** | Missed days do not erase the record or reset the challenge. |
| **Two data modes** | Start with local browser storage or configure Supabase for authenticated, cloud-backed data. |

### 📈 How the focus score is calculated

The app uses a 100-point activity score to summarise study habits:

| Dimension | Weight |
|---|---:|
| Study volume | 40 |
| Session completion | 25 |
| Academic tasks | 15 |
| Consistency | 10 |
| Focus discipline | 10 |
| **Total** | **100** |

*This is an activity and habit indicator, not a prediction of exam marks or academic performance.*

## 🔄 How Focus Forge works

~~~mermaid
flowchart TD
    A["🎯 Set your study goals"] --> B["📚 Organise subjects and tasks"]
    B --> C["🗓️ Build your timetable"]
    C --> D["⏱️ Start a focused session"]
    D --> E["📌 Record progress and interruptions"]
    E --> F["📊 Review insights and achievements"]
    F --> A
~~~

The cycle is simple: plan your work, follow your schedule, focus on one task, and use your progress data to improve the next study session.

## 🛠️ Technology stack

| Area | Technologies |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling & interaction | Tailwind CSS 3, CSS variables, Framer Motion, Lucide React |
| Navigation & charts | React Router 6, Recharts |
| Backend services | Supabase PostgreSQL, Auth and Storage |
| Offline support | Web App Manifest, Service Worker, browser local storage |
| Deployment | Vercel; Netlify configuration included |

## ⚡ Get started

### Requirements

- Node.js (LTS recommended)
- npm
- Git

### 1. Clone the repository

~~~bash
git clone https://github.com/cheetah1306/focus-forge.git
cd focus-forge
~~~

### 2. Install dependencies

~~~bash
npm install
~~~

### 3. Start the development server

~~~bash
npm run dev
~~~

Open the local URL printed by Vite in your terminal (the configured host is `127.0.0.1:5173`).

<details>
<summary><strong>More useful commands</strong></summary>

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Run TypeScript project build and create production assets |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript checks |
| `npm run verify:supabase` | Verify Supabase configuration and schema |

</details>

## ☁️ Configure Supabase

Focus Forge supports a browser-local mode and a Supabase-backed mode.

### Option A — Local mode

No Supabase environment variables are required. Data is stored in the current browser's `localStorage`.

- Useful for trying the app without configuring a backend.
- Does not provide account authentication or multi-device synchronisation.
- Clearing browser site data removes locally stored workspace data.
- Local document uploads are limited to 1.5 MB.

### Option B — Supabase mode

1. Create a project at [Supabase](https://supabase.com).
2. Open the Supabase SQL Editor and run `supabase/migrations/0001_init.sql`.
3. Copy `.env.example` to `.env`.
4. Add your project URL and publishable (or legacy anon public) key:

~~~env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-or-anon-public-key>
~~~

5. Run the configuration check:

~~~bash
npm run verify:supabase
~~~

6. Configure authentication providers and the Site URL / redirect URLs in Supabase Auth settings.
7. Restart the development server.

**Security note:** Never put a Supabase `service_role` key or secret key in a `VITE_` environment variable. Frontend environment variables are exposed to the browser. Use only the publishable key or legacy anon public key in client-side configuration.

## 🧱 Project structure

The repository is organised by responsibility: application entry points, reusable UI, domain logic, page-level screens, deployment assets and database migrations.

~~~text
focus-forge/
│
├── public/                         # PWA assets and static files
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon.svg
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── _redirects
│
├── scripts/                        # Project utility and verification scripts
│   ├── generate-icons.mjs
│   └── verify-supabase.mjs
│
├── src/
│   ├── components/                 # Shared interface components
│   │   ├── layout.tsx
│   │   ├── session-launcher.tsx
│   │   └── ui.tsx
│   │
│   ├── lib/                        # Application logic and data services
│   │   ├── achievements.ts
│   │   ├── app-context.tsx
│   │   ├── backend.ts
│   │   ├── events.ts
│   │   ├── focus.tsx
│   │   ├── metrics.ts
│   │   ├── notifications.ts
│   │   ├── store.tsx
│   │   ├── supabase.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   │
│   ├── pages/                      # Main application screens
│   │   ├── Achievements.tsx
│   │   ├── Analytics.tsx
│   │   ├── AuthPage.tsx
│   │   ├── Challenge.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Exams.tsx
│   │   ├── FocusRoom.tsx
│   │   ├── Guardian.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Planner.tsx
│   │   ├── Settings.tsx
│   │   ├── Subjects.tsx
│   │   └── Timetable.tsx
│   │
│   ├── App.tsx                     # App routes and composition
│   ├── main.tsx                    # React entry point
│   ├── styles.css                  # Global styles
│   └── vite-env.d.ts               # Vite type declarations
│
├── supabase/
│   └── migrations/
│       └── 0001_init.sql           # Database schema and security policies
│
├── .env.example                    # Environment variable template
├── .gitignore
├── index.html
├── LICENSE                         # MIT License
├── netlify.toml
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── vercel.json
└── vite.config.ts
~~~

## 🚀 Production deployment

The project includes Vercel configuration for a Vite single-page application.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Application routing | SPA rewrite to `index.html` |

To deploy your own instance:

1. Import this GitHub repository into [Vercel](https://vercel.com).
2. Add the Supabase environment variables if you are using Supabase mode.
3. Deploy the project.
4. Add your deployed URL to the Supabase Auth Site URL and redirect URL settings.

A Netlify configuration is also included in `netlify.toml`.

<div align="center">

### 🌐 Try the deployed application

[![Open Focus Forge](https://img.shields.io/badge/OPEN_FOCUS_FORGE-Launch_Now-635BFF?style=for-the-badge&logo=vercel&logoColor=white)](https://focusforge-ashen-five.vercel.app)

</div>

## 🔐 Privacy & practical notes

- Supabase mode uses user-scoped Row Level Security (RLS) policies for user-owned data.
- Focus Guardian records reported distractions and interruptions; it does **not** monitor or block other applications.
- Browser notifications require permission and browser support. Delivery is not guaranteed after the browser is fully closed.
- Screen Wake Lock is requested where supported, but the operating system may still turn off the display.
- Exam readiness reflects topic statuses entered in the app; it is not an external assessment of syllabus mastery.
- The default timezone is `Asia/Kolkata`.

## 🧪 Verification

The project includes a TypeScript check, production build and Supabase configuration verifier. The application documentation also describes checks for timer pause/resume and reload recovery, session completion and interruption logging, planner and timetable workflows, analytics consistency, responsive layouts and Supabase data isolation.

Google OAuth and password-reset email delivery require provider configuration. Browser-closed notification delivery is not guaranteed.

## 🤝 Contributing

Suggestions, bug reports and improvements are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Make your changes and run the relevant checks.
4. Open a pull request with a clear summary and testing notes.

## 📄 License

Focus Forge is licensed under the **MIT License**. You are free to use, copy, modify, merge, publish, distribute, sublicense and sell copies of the software, subject to the license conditions.

The full license is available in [`LICENSE`](LICENSE). The license text is also included below for convenience.

<details>
<summary><strong>Read the full MIT License</strong></summary>

MIT License

Copyright (c) 2026 Akshay R

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

</details>

---

<div align="center">

**Plan with intention. Focus with discipline. Forge your progress.**

[🌐 Live Application](https://focusforge-ashen-five.vercel.app) · [💻 GitHub Repository](https://github.com/cheetah1306/focus-forge) · [📄 MIT License](LICENSE)

<sub>Made to help turn study goals into focused action.</sub>

</div>
