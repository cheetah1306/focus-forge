import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Flame, Mail, ShieldCheck, Sparkles, Timer, TrendingUp } from 'lucide-react'
import { useApp } from '../lib/app-context'
import { isSupabaseConfigured } from '../lib/supabase'
import { Button, Field, Input, Ring } from '../components/ui'
import { toast } from '../lib/events'
import { cn } from '../lib/utils'

type Mode = 'login' | 'signup' | 'forgot' | 'reset'

const FEATURES = [
  { icon: <Timer className="h-4 w-4" />, title: 'Timestamp-accurate focus engine', body: 'Pause, extend, refresh or reopen — your session rebuilds from stored timestamps.' },
  { icon: <ShieldCheck className="h-4 w-4" />, title: 'Focus Guardian accountability', body: 'Commit before you start. Interruptions are logged honestly, never disguised as progress.' },
  { icon: <TrendingUp className="h-4 w-4" />, title: 'Analytics that mean something', body: 'Every chart is built from your real sessions, tasks and reported distractions.' },
]

function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[#070a12] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="pointer-events-none absolute inset-0 tile-grid opacity-[0.35]" />
      <div className="relative flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 shadow-glow">
          <Flame className="h-4.5 w-4.5" strokeWidth={2.4} />
        </span>
        <div>
          <p className="font-display text-[15px] font-bold tracking-[0.14em]">FOCUSFORGE</p>
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/40">Study operating system</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
          <Sparkles className="h-3 w-3 text-brand-300" /> Built for exam season
        </p>
        <h1 className="font-display text-[38px] font-semibold leading-[1.08] tracking-tight">
          Turn scattered study hours into a <span className="gradient-text">measurable system.</span>
        </h1>
        <p className="mt-4 text-[13px] leading-relaxed text-white/55">
          One command centre for sessions, timetables, subjects, deadlines and the 30-day preparation challenge. No fake streaks. No vanity dashboards.
        </p>
        <div className="mt-8 space-y-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="flex gap-3"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-300">{f.icon}</span>
              <div>
                <p className="text-[13px] font-medium">{f.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/45">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
        <Ring progress={0.72} size={64} stroke={5}>
          <span className="text-[11px] font-semibold">72%</span>
        </Ring>
        <div>
          <p className="text-[12px] font-medium">Today's focus score</p>
          <p className="text-[11px] leading-relaxed text-white/45">3 of 4 sessions completed · 2h 40m focused · 0 fabricated minutes.</p>
        </div>
      </div>
    </div>
  )
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.08 3.56-5.14 3.56-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  )
}

function StrengthMeter({ value }: { value: string }) {
  const score = [value.length >= 8, /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', score >= i ? (score <= 1 ? 'bg-rose-400' : score <= 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'surface-2')} />
        ))}
      </div>
      <span className="text-[10px] soft">{['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'][score]}</span>
    </div>
  )
}

export default function AuthPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const mode = (
    location.pathname === '/signup'
      ? 'signup'
      : location.pathname === '/forgot-password'
        ? 'forgot'
        : location.pathname === '/reset-password'
          ? 'reset'
          : initialMode
  ) as Mode

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  const local = !isSupabaseConfigured

  useEffect(() => {
    let alive = true
    void app.actions.socialProviders().then((providers) => {
      if (alive) setGoogleEnabled(providers.google)
    })
    return () => {
      alive = false
    }
    // Provider availability is a project-wide setting, read once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    setError(null)
    setMessage(null)
    if (!email.trim() && mode !== 'reset') return setError('Enter your email address.')
    if (mode !== 'forgot' && password.length < 6 && mode !== 'reset') return setError('Password must be at least 6 characters.')
    setBusy(true)
    try {
      if (mode === 'login') {
        const res = await app.actions.signInAccount(email, password)
        if (res.error) setError(res.error)
        else navigate('/')
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError('Tell us your name so the dashboard can greet you properly.')
          setBusy(false)
          return
        }
        if (password !== confirm) {
          setError('Passwords do not match.')
          setBusy(false)
          return
        }
        const res = await app.actions.signUpAccount(name, email, password)
        if (res.error) setError(res.error)
        else if (res.needsConfirmation) setMessage('Check your inbox to confirm your email address, then sign in.')
        else navigate('/')
      } else if (mode === 'forgot') {
        const res = await app.actions.sendPasswordReset(email)
        if (res.error) setError(res.error)
        else setMessage('If an account exists for that address, a recovery link is on its way.')
      } else if (mode === 'reset') {
        if (password.length < 6) {
          setError('Choose a password with at least 6 characters.')
          setBusy(false)
          return
        }
        const res = await app.actions.updatePassword(password)
        if (res.error) setError(res.error)
        else {
          toast.success('Password updated', 'You can now use your new password.')
          navigate('/')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const localStart = async () => {
    if (!name.trim()) return setError('Enter your name to create a local workspace.')
    setBusy(true)
    const res = await app.actions.signUpAccount(name, email, 'local-workspace')
    setBusy(false)
    if (res.error) setError(res.error)
    else navigate('/')
  }

  const google = async () => {
    const res = await app.actions.signInWithGoogle()
    if (res.error) setError(res.error)
  }

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    login: { title: 'Welcome back', subtitle: 'Your command centre is ready. Sign in to continue the challenge.' },
    signup: { title: 'Build your study system', subtitle: 'One account for sessions, subjects, deadlines and honest analytics.' },
    forgot: { title: 'Reset your password', subtitle: "We'll email you a secure recovery link." },
    reset: { title: 'Choose a new password', subtitle: 'Use at least 6 characters. Then sign in with the new password.' },
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--bg)] lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel />
      <div className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60 lg:hidden" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 shadow-glow">
              <Flame className="h-4.5 w-4.5 text-white" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold tracking-[0.14em]">FOCUSFORGE</p>
              <p className="text-[9px] uppercase tracking-[0.22em] soft">Study operating system</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold tracking-tight">{titles[mode].title}</h2>
          <p className="mt-1.5 text-[13px] muted leading-relaxed">{titles[mode].subtitle}</p>

          <div className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Akshay Sharma" autoComplete="name" />
              </Field>
            )}
            {mode !== 'reset' && (
              <Field label="Email address">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 soft" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" className="pl-9" autoComplete="email" />
                </div>
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field label={mode === 'reset' ? 'New password' : 'Password'}>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'signup' && password.length > 0 && <StrengthMeter value={password} />}
              </Field>
            )}
            {mode === 'signup' && (
              <Field label="Confirm password">
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </Field>
            )}

            {error && <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-400">{error}</p>}
            {message && (
              <p className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-500 dark:text-emerald-300">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {message}
              </p>
            )}

            <Button onClick={() => void submit()} loading={busy} size="lg" className="w-full" iconRight={<ArrowRight className="h-4 w-4" />}>
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send recovery link' : 'Update password'}
            </Button>

            {googleEnabled && !local && (mode === 'login' || mode === 'signup') && (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-[10px] uppercase tracking-wider soft">or</span>
                  <span className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <Button variant="secondary" className="w-full" onClick={() => void google()} icon={<GoogleGlyph className="h-4 w-4" />}>
                  Continue with Google
                </Button>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
              {mode === 'login' ? (
                <>
                  <Link to="/signup" className="font-medium text-brand-300 hover:underline">
                    Create an account
                  </Link>
                  <Link to="/forgot-password" className="muted hover:text-[var(--text)]">
                    Forgot password?
                  </Link>
                </>
              ) : (
                <Link to="/login" className="font-medium text-brand-300 hover:underline">
                  ← Back to sign in
                </Link>
              )}
            </div>
          </div>

          {local && (
            <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Supabase not configured
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed muted">
                Secure cloud accounts, RLS and multi-device sync need Supabase credentials. Until then you can use a full local workspace stored in this browser.
              </p>
              <div className="mt-3 space-y-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                <Button variant="secondary" className="w-full" loading={busy} onClick={() => void localStart()}>
                  Open local workspace
                </Button>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed soft">
                Local mode uses browser storage only. It is not a substitute for authentication — connect Supabase in <code className="rounded bg-black/20 px-1">.env</code> to go live.
              </p>
            </div>
          )}

          <p className="mt-6 text-center text-[10.5px] leading-relaxed soft">
            FOCUSFORGE never asks for your passwords, never traps your device, and never invents study statistics.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
