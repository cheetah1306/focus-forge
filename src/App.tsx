import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, RefreshCw } from 'lucide-react'
import { AppProvider, useApp } from './lib/app-context'
import { FocusProvider } from './lib/focus'
import { AppShell } from './components/layout'
import { Button, Toaster } from './components/ui'
import { useReminderEngine } from './lib/notifications'
import AuthPage from './pages/AuthPage'
import Onboarding from './pages/Onboarding'

// Route-level code splitting keeps the charts and heavy pages out of the shell.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const FocusRoom = lazy(() => import('./pages/FocusRoom'))
const Timetable = lazy(() => import('./pages/Timetable'))
const Planner = lazy(() => import('./pages/Planner'))
const Subjects = lazy(() => import('./pages/Subjects'))
const Exams = lazy(() => import('./pages/Exams'))
const Challenge = lazy(() => import('./pages/Challenge'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Guardian = lazy(() => import('./pages/Guardian'))
const Settings = lazy(() => import('./pages/Settings'))

function SectionLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-2 text-[11px] muted">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        Loading section…
      </div>
    </div>
  )
}

function Splash({ label = 'Forging your workspace' }: { label?: string }) {
  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center gap-5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500 shadow-glow"
      >
        <span className="absolute inset-0 animate-pulseRing rounded-2xl border border-brand-300/40" />
        <Flame className="h-7 w-7 text-white" strokeWidth={2.2} />
      </motion.div>
      <div className="text-center">
        <p className="font-display text-sm font-bold tracking-[0.2em]">FOCUSFORGE</p>
        <p className="mt-1 text-[11px] muted">{label}…</p>
      </div>
    </div>
  )
}

function ErrorScreen() {
  const { loadingError, actions } = useApp()
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-5">
      <div className="panel w-full max-w-md p-6 text-center">
        <p className="text-sm font-semibold text-rose-400">Workspace could not load</p>
        <p className="mt-2 text-xs leading-relaxed muted">{loadingError}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void actions.reload()}>
            Retry
          </Button>
          <Button variant="ghost" onClick={() => void actions.signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

function ThemeSync() {
  const { prefs } = useApp()
  useEffect(() => {
    const root = document.documentElement
    const theme = prefs?.theme ?? 'dark'
    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      root.classList.toggle('dark', isDark)
      root.classList.toggle('reduce-motion', Boolean(prefs?.reduced_motion))
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [prefs?.theme, prefs?.reduced_motion])
  return null
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp()
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function Protected() {
  const { user, data, ready } = useApp()
  const location = useLocation()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  if (data.profile && !data.profile.onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (location.pathname === '/onboarding') {
    return <Onboarding />
  }
  return (
    <AppShell>
      <Suspense fallback={<SectionLoader />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/focus" element={<FocusRoom />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/guardian" element={<Guardian />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </AppShell>
  )
}

function Gate() {
  const { ready, loadingError, user } = useApp()
  const app = useApp()
  useReminderEngine(app)
  const location = useLocation()

  if (!ready) return <Splash />
  if (loadingError) return <ErrorScreen />
  if (user && location.pathname === '/reset-password') return <AuthPage />
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <AuthPage initialMode="login" />
            </PublicOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnly>
              <AuthPage initialMode="signup" />
            </PublicOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnly>
              <AuthPage />
            </PublicOnly>
          }
        />
        <Route path="/reset-password" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  return <Protected />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <FocusProvider>
          <ThemeSync />
          <Gate />
          <Toaster />
        </FocusProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
