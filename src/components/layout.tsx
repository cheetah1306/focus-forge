import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Coffee,
  Flame,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Pause,
  Play,
  Plus,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/app-context'
import { useFocus } from '../lib/focus'
import { dayStats, challengeMetrics, activeSessionSeconds } from '../lib/metrics'
import { formatMinutes, formatSeconds, greetingForHour, subjectColor, cn } from '../lib/utils'
import { Badge, Button, Modal, ProgressBar, Ring } from './ui'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  short?: string
  group: string
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, group: 'Study' },
  { to: '/focus', label: 'Focus Room', short: 'Focus', icon: <Timer className="h-[18px] w-[18px]" />, group: 'Study' },
  { to: '/timetable', label: 'Timetable', short: 'Plan', icon: <CalendarDays className="h-[18px] w-[18px]" />, group: 'Study' },
  { to: '/planner', label: 'Study Planner', short: 'Tasks', icon: <ListChecks className="h-[18px] w-[18px]" />, group: 'Study' },
  { to: '/subjects', label: 'Subjects', icon: <BookOpen className="h-[18px] w-[18px]" />, group: 'Academics' },
  { to: '/exams', label: 'Exams', icon: <GraduationCap className="h-[18px] w-[18px]" />, group: 'Academics' },
  { to: '/challenge', label: '30-Day Challenge', short: 'Challenge', icon: <Target className="h-[18px] w-[18px]" />, group: 'Academics' },
  { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-[18px] w-[18px]" />, group: 'Insight' },
  { to: '/achievements', label: 'Achievements', icon: <Trophy className="h-[18px] w-[18px]" />, group: 'Insight' },
  { to: '/guardian', label: 'Focus Guardian', icon: <ShieldAlert className="h-[18px] w-[18px]" />, group: 'Insight' },
]

const GROUP_ORDER = ['Study', 'Academics', 'Insight']

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-violet-500 shadow-glow">
        <Flame className="h-4.5 w-4.5 text-white" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-bold tracking-[0.14em]">FOCUSFORGE</span>
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] soft">Study OS</span>
        </span>
      )}
    </Link>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">{eyebrow}</p>}
        <h1 className="font-display text-[22px] font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] muted leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

function NotificationBell() {
  const { data, actions } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = data.notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const navigate = useNavigate()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] surface-1 muted transition hover:text-[var(--text)]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-50 w-[330px] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--panel-solid)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider soft">Notifications</span>
              {unread > 0 && (
                <button onClick={() => void actions.markAllNotificationsRead()} className="text-[11px] font-medium text-brand-300 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs muted">No notifications yet. Completed sessions, deadlines and achievements appear here.</p>
              ) : (
                data.notifications.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      void actions.markNotificationRead(n.id)
                      if (n.link) navigate(n.link)
                      setOpen(false)
                    }}
                    className={cn('flex w-full gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition hover:surface-1', !n.read && 'bg-brand-500/[0.06]')}
                  >
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand-400')} />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium leading-snug">{n.title}</span>
                      <span className="mt-0.5 block text-[11px] muted leading-snug">{n.body}</span>
                      <span className="mt-1 block text-[10px] soft">
                        {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AccountMenu() {
  const { user, data, actions } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])
  const name = data.profile?.full_name || user?.name || user?.email?.split('@')[0] || 'Student'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-strong)] bg-gradient-to-br from-brand-500/30 to-violet-500/30 text-[11px] font-bold tracking-wide"
        aria-label="Account menu"
      >
        {data.profile?.avatar_url ? <img src={data.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials || 'FF'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--panel-solid)] shadow-2xl"
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-[11px] muted">{user?.email ?? 'Local workspace'}</p>
            </div>
            <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs muted transition hover:surface-1 hover:text-[var(--text)]">
              <SettingsIcon className="h-4 w-4" /> Settings & profile
            </Link>
            <button
              onClick={() => void actions.signOut()}
              className="flex w-full items-center gap-2.5 border-t border-[var(--border)] px-4 py-2.5 text-left text-xs text-rose-400 transition hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Sidebar({ onOpenMore }: { onOpenMore: () => void }) {
  const { prefs, data } = useApp()
  const today = dayStats(data, new Date().toISOString().slice(0, 10), prefs)
  const challenge = challengeMetrics(data, prefs)
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-2">
        <Logo />
      </div>
      <nav className="no-scrollbar mt-2 flex-1 overflow-y-auto pb-4">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] soft">{group}</p>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all',
                      isActive ? 'bg-brand-500/[0.12] text-[var(--text)]' : 'muted hover:surface-1 hover:text-[var(--text)]',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-active" className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-brand-400" />}
                      <span className={cn('transition-colors', isActive ? 'text-brand-300' : 'soft group-hover:text-[var(--text-muted)]')}>{item.icon}</span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <div className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] soft">System</div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all',
              isActive ? 'bg-brand-500/[0.12] text-[var(--text)]' : 'muted hover:surface-1 hover:text-[var(--text)]',
            )
          }
        >
          <SettingsIcon className="h-[18px] w-[18px]" /> Settings
        </NavLink>
        <button onClick={onOpenMore} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium muted transition hover:surface-1 hover:text-[var(--text)]">
          <Menu className="h-[18px] w-[18px]" /> All sections
        </button>
      </nav>

      <div className="mb-3 rounded-2xl border border-[var(--border)] surface-1 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider soft">Today</span>
          <Badge tone={today.minutes >= today.targetMinutes ? 'success' : 'neutral'}>{Math.round((today.minutes / Math.max(1, today.targetMinutes)) * 100)}%</Badge>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="font-display text-lg font-semibold">{formatMinutes(today.minutes, true)}</span>
          <span className="text-[10px] muted">/ {formatMinutes(today.targetMinutes, true)}</span>
        </div>
        <ProgressBar value={today.minutes / Math.max(1, today.targetMinutes)} height="h-1.5" className="mt-2" />
        <div className="mt-3 flex items-center justify-between text-[10px] muted">
          <span className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-amber-400" /> {challenge.streak} day streak
          </span>
          <span>Day {challenge.currentDay}/{challenge.totalDays || 30}</span>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--border)] px-2.5 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/30 to-violet-500/30 text-[10px] font-bold">
          {(data.profile?.full_name ?? 'S')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium">{data.profile?.full_name ?? 'Student'}</p>
          <p className="truncate text-[9px] soft">{data.profile?.semester ? `Sem ${data.profile.semester}` : 'Semester not set'}</p>
        </div>
      </div>
    </aside>
  )
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/85 px-4 backdrop-blur-xl lg:hidden">
      <Logo />
      <div className="flex items-center gap-2">
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  )
}

function DesktopHeader() {
  const { data, prefs } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const current = NAV.find((n) => n.to === location.pathname)
  const title = current?.label ?? (location.pathname === '/settings' ? 'Settings' : 'FOCUSFORGE')
  const today = dayStats(data, new Date().toISOString().slice(0, 10), prefs)
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg)]/80 px-6 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2 text-sm">
        <span className="soft">{greetingForHour(new Date().getHours())}</span>
        <ChevronRight className="h-3.5 w-3.5 soft" />
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] surface-1 px-3 py-1.5 xl:flex">
          <Target className="h-3.5 w-3.5 text-brand-300" />
          <span className="text-[11px] muted">Today</span>
          <span className="text-[11px] font-semibold">{formatMinutes(today.minutes, true)}</span>
          <span className="text-[11px] soft">/ {formatMinutes(today.targetMinutes, true)}</span>
        </div>
        <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/focus')} className="h-9 rounded-xl px-3.5">
          New session
        </Button>
        <NotificationBell />
        <AccountMenu />
      </div>
    </header>
  )
}

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: <LayoutDashboard className="h-[19px] w-[19px]" /> },
  { to: '/timetable', label: 'Plan', icon: <CalendarDays className="h-[19px] w-[19px]" /> },
  { to: '/analytics', label: 'Stats', icon: <BarChart3 className="h-[19px] w-[19px]" /> },
]

function MobileNav({ onOpenMore }: { onOpenMore: () => void }) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--bg-elevated)]/92 px-2 pt-1.5 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 items-end">
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn('flex flex-col items-center gap-1 py-1 text-[9.5px] font-medium', isActive ? 'text-brand-300' : 'muted')}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <NavLink to="/focus" aria-label="Focus room" className="-mt-6 flex flex-col items-center">
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-400 to-violet-500 text-white shadow-[0_10px_30px_-8px_rgba(59,108,255,0.8)] transition-transform active:scale-95',
                isActive && 'ring-2 ring-brand-300/50',
              )}
            >
              <Timer className="h-5 w-5" />
            </span>
          )}
        </NavLink>
        {MOBILE_NAV.slice(2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn('flex flex-col items-center gap-1 py-1 text-[9.5px] font-medium', isActive ? 'text-brand-300' : 'muted')}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <button onClick={onOpenMore} className="flex flex-col items-center gap-1 py-1 text-[9.5px] font-medium muted">
          <Menu className="h-[19px] w-[19px]" />
          More
        </button>
      </div>
    </nav>
  )
}

function AllSectionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Modal open={open} onClose={onClose} title="All sections" description="Everything in your study operating system.">
      <div className="grid grid-cols-2 gap-2">
        {[...NAV, { to: '/settings', label: 'Settings', icon: <SettingsIcon className="h-[18px] w-[18px]" />, group: 'System' }].map((item) => (
          <button
            key={item.to}
            onClick={() => {
              navigate(item.to)
              onClose()
            }}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] surface-1 px-3 py-3 text-left text-xs font-medium transition hover:surface-2"
          >
            <span className="text-brand-300">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function ActiveSessionDock() {
  const { session, remainingSeconds, progress, paused, pause, resume } = useFocus()
  const navigate = useNavigate()
  const location = useLocation()
  if (!session) return null
  const mins = Math.floor(remainingSeconds / 60)
  const percent = Math.round(progress * 100)
  if (location.pathname === '/focus') return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[74px] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 lg:bottom-5 lg:left-auto lg:right-6 lg:translate-x-0"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-brand-400/25 bg-[var(--panel-solid)]/95 p-2.5 shadow-glow backdrop-blur-xl">
        <button onClick={() => navigate('/focus')} className="relative flex h-11 w-11 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={3} />
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="#5b8cff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 19}
              strokeDashoffset={2 * Math.PI * 19 * (1 - progress)}
            />
          </svg>
          <Timer className="h-4 w-4 text-brand-300" />
        </button>
        <button onClick={() => navigate('/focus')} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[11px] font-semibold">{paused ? 'Paused' : 'Focus session active'}</p>
          <p className="truncate text-[10px] muted">
            {formatSeconds(remainingSeconds)} left · {percent}% · {mins} min remaining
          </p>
        </button>
        <button
          onClick={() => (paused ? void resume() : void pause())}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] surface-2 transition hover:surface-3"
          aria-label={paused ? 'Resume focus session' : 'Pause focus session'}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      </div>
    </motion.div>
  )
}

export function BreakDock() {
  const { breakRemaining, breakTotal, endBreak } = useFocus()
  if (!breakTotal) return null
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-[74px] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 lg:bottom-5 lg:left-6 lg:translate-x-0">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-[var(--panel-solid)]/95 p-3 shadow-2xl backdrop-blur-xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
          <Coffee className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold">Authorized break</p>
          <p className="text-[10px] muted">{formatSeconds(breakRemaining)} remaining</p>
        </div>
        <Button size="sm" variant="ghost" onClick={endBreak}>
          End break
        </Button>
      </div>
    </motion.div>
  )
}

export function CompletionModal() {
  const { completion, dismissCompletion, startBreak } = useFocus()
  const navigate = useNavigate()
  if (!completion) return null
  return (
    <Modal
      open
      onClose={dismissCompletion}
      title="Session forged"
      description={completion.completed ? 'Your focused time is recorded. Real minutes, real progress.' : 'Session ended early.'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => navigate('/analytics')}>
            View analytics
          </Button>
          <Button variant="secondary" icon={<Coffee className="h-4 w-4" />} onClick={() => { startBreak(completion.breakMinutes); dismissCompletion() }}>
            Break · {completion.breakMinutes}m
          </Button>
          <Button icon={<Play className="h-4 w-4" />} onClick={() => { dismissCompletion(); navigate('/focus') }}>
            Another session
          </Button>
        </>
      }
    >
      <div className="relative flex flex-col items-center py-2 text-center">
        <div className="absolute inset-x-0 top-0 -z-0 h-32 bg-[radial-gradient(circle_at_50%_20%,rgba(59,108,255,0.18),transparent_70%)]" />
        <Ring progress={1} size={132} stroke={9} tone="success">
          <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
            <Check className="h-9 w-9 text-emerald-400" strokeWidth={2.6} />
          </motion.span>
        </Ring>
        <h3 className="mt-4 font-display text-xl font-semibold">{formatMinutes(Math.round(completion.actualSeconds / 60))} of focus</h3>
        <p className="mt-1 text-xs muted">
          {completion.subjectName}
          {completion.topic ? ` · ${completion.topic}` : ''}
        </p>
        <div className="mt-5 grid w-full grid-cols-3 gap-2">
          {[
            { label: 'Planned', value: `${completion.plannedMinutes}m` },
            { label: 'Logged', value: `${Math.round(completion.actualSeconds / 60)}m` },
            { label: 'Round', value: `${completion.round}/${completion.rounds}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border)] surface-1 px-2 py-2.5">
              <p className="text-[9px] uppercase tracking-wider soft">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] muted leading-relaxed">
          {completion.breakMinutes >= 15 ? 'You have earned a longer recovery break.' : 'Take a short break, hydrate, then go again.'} Your streak, focus score and
          subject progress have been updated.
        </p>
      </div>
    </Modal>
  )
}

export function RecoveryNotice() {
  const { recoveryNotice, dismissRecovery } = useFocus()
  return (
    <Modal
      open={Boolean(recoveryNotice)}
      onClose={dismissRecovery}
      title="Session recovered"
      description="FOCUSFORGE rebuilt your timer from stored timestamps."
      size="sm"
      footer={<Button onClick={dismissRecovery}>Understood</Button>}
    >
      <p className="text-xs leading-relaxed muted">{recoveryNotice}</p>
    </Modal>
  )
}

export function Celebration() {
  const { celebrationQueue, dismissCelebration, data } = useApp()
  const id = celebrationQueue[0]
  const achievement = data.achievements.find((a) => a.id === id)
  if (!achievement) return null
  return (
    <Modal
      open
      onClose={dismissCelebration}
      title="Achievement unlocked"
      description="Earned with real study time, not fabricated streaks."
      size="sm"
      footer={<Button onClick={dismissCelebration} icon={<Sparkles className="h-4 w-4" />}>Keep forging</Button>}
    >
      <div className="relative flex flex-col items-center py-3 text-center">
        <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 to-violet-500/20">
          <span className="absolute inset-0 animate-pulseRing rounded-full border border-amber-300/30" />
          <Trophy className="h-10 w-10 text-amber-300" strokeWidth={1.6} />
        </div>
        <h3 className="font-display text-lg font-semibold">{achievement.title}</h3>
        <p className="mt-1 max-w-xs text-xs muted">{achievement.description}</p>
        <Badge tone="warning" className="mt-3 capitalize">
          {achievement.tier}
        </Badge>
      </div>
    </Modal>
  )
}

export function LocalModeBanner() {
  const { mode } = useApp()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ff.local.banner') === '1')
  if (mode !== 'local' || dismissed) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-700 dark:text-amber-200">
      <ShieldAlert className="h-3.5 w-3.5" />
      <span>
        <strong className="font-semibold">Local workspace mode.</strong> Your data is stored only in this browser. Add Supabase credentials to enable secure accounts,
        cloud sync and multi-device access.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Link to="/settings" className="font-semibold underline decoration-dotted underline-offset-2">
          Setup guide
        </Link>
        <button
          onClick={() => {
            localStorage.setItem('ff.local.banner', '1')
            setDismissed(true)
          }}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function FocusLockBar() {
  const { session, remainingSeconds, paused, pause, resume } = useFocus()
  const navigate = useNavigate()
  if (!session) return null
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-brand-400/20 bg-[var(--bg)]/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px]">
        <span className={cn('h-1.5 w-1.5 rounded-full', paused ? 'bg-amber-400' : 'animate-pulse bg-emerald-400')} />
        <span className="font-semibold uppercase tracking-[0.16em]">{paused ? 'Focus paused' : 'Focus in progress'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm tabular-nums">{formatSeconds(remainingSeconds)}</span>
        <Button size="sm" variant="secondary" onClick={() => (paused ? void resume() : void pause())} icon={paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate('/')}>
          Exit view
        </Button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { session, subject, paused, pause, resume } = useFocus()
  const location = useLocation()
  const focused = Boolean(session)
  const elapsed = session ? activeSessionSeconds(session) : 0

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMoreOpen((o) => !o)
        return
      }
      if (e.code === 'Space' && !typing && session && !moreOpen) {
        e.preventDefault()
        if (paused) void resume()
        else void pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, paused, moreOpen, pause, resume])

  if (focused) {
    return (
      <div className="app-bg min-h-screen">
        <FocusLockBar />
        <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-5 sm:px-6">
          {session && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] panel px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-bold uppercase"
                  style={{ backgroundColor: `${subjectColor(subject?.color).hex}1f`, color: subjectColor(subject?.color).hex }}
                >
                  {(subject?.name ?? 'GEN').slice(0, 3)}
                </span>
                <div>
                  <p className="text-xs font-semibold">{subject?.name ?? 'General study'}</p>
                  <p className="text-[10px] muted">{session.topic ?? 'Deep focus'} · {formatMinutes(elapsed / 60)} elapsed</p>
                </div>
              </div>
              <Link to="/focus" className="text-[11px] font-semibold text-brand-300 hover:underline">
                Open focus room →
              </Link>
            </div>
          )}
          {children}
        </main>
        <ActiveSessionDock />
        <CompletionModal />
      </div>
    )
  }

  return (
    <div className="app-bg min-h-screen">
      <Sidebar onOpenMore={() => setMoreOpen(true)} />
      <div className="lg:pl-[248px]">
        <MobileHeader />
        <DesktopHeader />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-6">
          <LocalModeBanner />
          {children}
        </main>
      </div>
      <MobileNav onOpenMore={() => setMoreOpen(true)} />
      <ActiveSessionDock />
      <BreakDock />
      <CompletionModal />
      <RecoveryNotice />
      <Celebration />
      <AllSectionsModal open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
