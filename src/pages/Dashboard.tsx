import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  ListChecks,
  Pencil,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { useFocus } from '../lib/focus'
import {
  buildInsights,
  challengeMetrics,
  dayStats,
  examCountdown,
  examReadiness,
  subjectStats,
  seriesLastNDays,
} from '../lib/metrics'
import {
  cn,
  formatClock12,
  formatDateLong,
  formatMinutes,
  formatSeconds,
  greetingForHour,
  minutesBetweenTimes,
  relativeDeadline,
  weekdayOfKey,
} from '../lib/utils'
import { AnimatedNumber, Badge, Button, Card, EmptyState, Field, Modal, NumberInput, Ring, SectionHeader } from '../components/ui'
import { PageHeader } from '../components/layout'
import { SessionLauncher, type LaunchContext } from '../components/session-launcher'
import { subjectColor as sc } from '../lib/utils'
import { ResponsiveContainer, BarChart, Bar, Tooltip as ChartTooltip, XAxis, Cell } from 'recharts'

export default function Dashboard() {
  const { data, prefs, today, timezone, actions } = useApp()
  const focus = useFocus()
  const navigate = useNavigate()
  const [clock, setClock] = useState(new Date())
  const [launch, setLaunch] = useState<LaunchContext | null>(null)
  const [targetOpen, setTargetOpen] = useState(false)
  const [targetForm, setTargetForm] = useState({ hours: 0, sessions: 4, tasks: 2 })

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const stats = useMemo(() => dayStats(data, today, prefs), [data, prefs, today])
  const challenge = useMemo(() => challengeMetrics(data, prefs), [data, prefs])
  const subjects = useMemo(() => subjectStats(data, prefs), [data, prefs])
  const insights = useMemo(() => buildInsights(data, prefs), [data, prefs])
  const week = useMemo(() => seriesLastNDays(data, prefs, 7), [data, prefs])
  const nextExam = data.exams.filter((e) => e.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0]
  const examInfo = nextExam ? examCountdown(nextExam, timezone) : null
  const readiness = nextExam ? examReadiness(data, nextExam) : null
  const examSubject = nextExam?.subject_id ? data.subjects.find((s) => s.id === nextExam.subject_id) : null

  const todaysEntries = useMemo(
    () => data.entries.filter((e) => e.day_of_week === weekdayOfKey(today)).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [data.entries, today],
  )
  const doneEntries = todaysEntries.filter((e) => e.status === 'completed').length
  const pendingTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.status === 'pending')
        .sort((a, b) => {
          const ad = a.deadline ?? '9999'
          const bd = b.deadline ?? '9999'
          return ad.localeCompare(bd)
        })
        .slice(0, 5),
    [data.tasks],
  )
  const weakest = subjects.filter((s) => s.totalTopics > 0).sort((a, b) => a.progress - b.progress)[0]
  const name = data.profile?.full_name?.split(' ')[0] ?? 'Student'
  const targetPct = stats.targetMinutes > 0 ? Math.min(1, stats.minutes / stats.targetMinutes) : 0

  const openTarget = () => {
    setTargetForm({
      hours: Math.round(stats.targetMinutes / 60),
      sessions: stats.targetSessions,
      tasks: Math.max(1, stats.tasksCompleted || 2),
    })
    setTargetOpen(true)
  }

  const saveTarget = async () => {
    await actions.saveDailyGoal(today, Math.max(15, targetForm.hours * 60), Math.max(1, targetForm.sessions), Math.max(0, targetForm.tasks))
    setTargetOpen(false)
  }

  const motivation = (() => {
    if (stats.minutes === 0) return { title: 'The first block is the hardest', body: 'Commit to one 25-minute session. Momentum is built, not found.' }
    if (stats.minutes >= stats.targetMinutes && stats.targetMinutes > 0)
      return { title: 'Target secured for today', body: `${formatMinutes(stats.minutes - stats.targetMinutes)} beyond target. Bank the win — or extend the margin.` }
    if (stats.interruptedSessions > 0)
      return {
        title: 'Protect the next block',
        body: `${stats.interruptedSessions} session${stats.interruptedSessions === 1 ? '' : 's'} interrupted today. Put the phone in another room before you start.`,
      }
    if (challenge.missedDays > 0)
      return { title: 'Recovery is part of the system', body: `${challenge.missedDays} missed day${challenge.missedDays === 1 ? '' : 's'} so far. The challenge does not reset — today is Day ${challenge.currentDay}.` }
    return { title: 'Keep the streak honest', body: `${formatMinutes(Math.max(0, stats.targetMinutes - stats.minutes))} left to hit today's target. Log real minutes, not optimistic ones.` }
  })()

  const nextSlot = todaysEntries.find((e) => e.status === 'pending' && e.end_time >= clock.toTimeString().slice(0, 5))

  return (
    <div>
      <PageHeader
        eyebrow={formatDateLong(today)}
        title={`${greetingForHour(clock.getHours())}, ${name}`}
        description={
          data.profile?.college
            ? `${data.profile.college}${data.profile.semester ? ` · Semester ${data.profile.semester}` : ''} · ${clock.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
            : `Your study command centre · ${clock.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
        }
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={openTarget}>
              Today's target
            </Button>
            <Button icon={<Play className="h-4 w-4" />} onClick={() => setLaunch({ mode: 'custom', minutes: prefs?.default_focus_minutes ?? 25 })} disabled={Boolean(focus.session)}>
              {focus.session ? 'Session running' : 'Start focus session'}
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative overflow-hidden p-6 sm:p-8 rounded-[32px] shadow-sm">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
            <Ring progress={targetPct} size={200} stroke={12}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] soft">Focused Today</span>
              <span className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-tight text-brand-500 dark:text-brand-300">{formatMinutes(stats.minutes, true)}</span>
              <span className="mt-1.5 text-[11px] font-medium muted">of {formatMinutes(stats.targetMinutes, true)} target</span>
              <span className={cn('mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold border', targetPct >= 1 ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500 dark:text-emerald-300' : 'border-[var(--border)] surface-2 muted')}>
                {Math.round(targetPct * 100)}% complete
              </span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand" dot>
                  Focus score {stats.focusScore}/100
                </Badge>
                {focus.session ? (
                  <Badge tone="success" dot>
                    Session live · {formatSeconds(focus.remainingSeconds)} left
                  </Badge>
                ) : (
                  <Badge tone="neutral">No active session</Badge>
                )}
              </div>
              <h2 className="mt-3 font-display text-xl font-bold tracking-tight">
                {stats.minutes >= stats.targetMinutes && stats.minutes > 0 ? 'Target met. Now widen the gap.' : 'Your next block is the only thing that matters.'}
              </h2>
              <p className="mt-1 text-xs muted leading-relaxed font-medium">{motivation.body}</p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Sessions', value: `${stats.completedSessions}`, hint: `${stats.startedSessions} started` },
                  { label: 'Remaining', value: formatMinutes(Math.max(0, stats.targetMinutes - stats.minutes), true), hint: 'to target' },
                  { label: 'Streak', value: `${stats.streak}d`, hint: `best ${challenge.bestStreak}d` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-[var(--border)] surface-1 px-3 py-2.5 shadow-sm">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider soft">{s.label}</p>
                    <p className="mt-1 font-display text-base font-bold">{s.value}</p>
                    <p className="text-[9.5px] soft font-medium">{s.hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button size="md" icon={<Play className="h-4 w-4" />} onClick={() => setLaunch({ mode: 'pomodoro', minutes: 25 })}>
                  25m Sprint
                </Button>
                <Button size="md" variant="secondary" icon={<Timer className="h-4 w-4" />} onClick={() => setLaunch({ mode: 'deep', minutes: 50 })}>
                  50m Deep Work
                </Button>
                <Link to="/focus" className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-brand-500 dark:text-brand-300 surface-1 border border-[var(--border)] hover:surface-2 transition">
                  Open focus room <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="relative overflow-hidden p-6 rounded-[28px] shadow-sm">
            <SectionHeader
              title="Next examination"
              action={
                <Link to="/exams" className="text-xs font-semibold text-brand-500 dark:text-brand-300 hover:underline">
                  All exams →
                </Link>
              }
            />
            {nextExam && examInfo ? (
              <>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{nextExam.name}</p>
                    <p className="mt-0.5 text-xs muted font-medium">
                      {examSubject?.name ?? 'General'} · {formatClock12(nextExam.exam_time)}
                    </p>
                    <p className="mt-0.5 text-[11px] soft font-medium">{new Date(`${nextExam.exam_date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="shrink-0 text-right surface-1 border border-[var(--border)] px-3.5 py-2 rounded-2xl shadow-sm">
                    <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-brand-500 dark:text-brand-300">
                      <AnimatedNumber value={examInfo.days} />
                    </p>
                    <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wider soft">days left</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold muted">
                    <span>Preparation readiness</span>
                    <span className="text-brand-500 dark:text-brand-300">{readiness?.progress ?? 0}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      style={{ width: `${readiness?.progress ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10.5px] soft font-medium">
                    <span>{readiness?.pendingTopics ?? 0} chapters pending</span>
                    <span>{readiness?.revision ?? 0} need revision</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--border)] surface-1 px-3.5 py-2 text-xs font-medium muted">
                  <Clock className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" /> {examInfo.hours}h {examInfo.minutes}m remaining in the countdown
                </div>
              </>
            ) : (
              <div className="mt-3">
                <EmptyState
                  icon={<GraduationCap className="h-5 w-5" />}
                  title="No exams added"
                  description="Add your real exam dates to activate the countdown and preparation tracker."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => navigate('/exams')} icon={<Plus className="h-3.5 w-3.5" />}>
                      Add examination
                    </Button>
                  }
                  className="border-0 px-0 py-4"
                />
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-[28px] shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] soft">30-day challenge</p>
                <p className="mt-1 text-base font-bold">
                  Day {challenge.currentDay || 0}
                  <span className="muted font-medium"> / {challenge.totalDays || 30}</span>
                </p>
              </div>
              <Badge tone={challenge.consistency >= 70 ? 'success' : challenge.consistency >= 40 ? 'warning' : 'neutral'}>{challenge.consistency}% consistent</Badge>
            </div>
            <div className="mt-3 grid grid-cols-10 gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => {
                const day = challenge.days[i]
                const status = day?.status ?? 'future'
                return (
                  <div
                    key={i}
                    title={day ? `Day ${i + 1} · ${status} · ${formatMinutes(day.minutes, true)}` : `Day ${i + 1}`}
                    className={cn(
                      'aspect-square rounded-[6px] border transition-transform active:scale-95',
                      status === 'completed' && 'border-emerald-500/40 bg-emerald-500 shadow-sm shadow-emerald-500/30',
                      status === 'missed' && 'border-rose-400/30 bg-rose-500/25',
                      status === 'pending' && 'border-brand-500/60 bg-brand-500/40',
                      status === 'future' && 'border-[var(--border)] surface-1',
                    )}
                  />
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-medium muted">
              <span>{challenge.completedDays} days hit target</span>
              <span>{challenge.missedDays} missed</span>
            </div>
            {challenge.challenge ? (
              <Link to="/challenge" className="mt-3 flex items-center justify-between rounded-full border border-[var(--border)] surface-1 px-4 py-2 text-xs font-semibold transition hover:surface-2">
                View challenge dashboard <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <Button size="sm" className="mt-3 w-full" variant="secondary" onClick={() => navigate('/challenge')}>
                Start a challenge
              </Button>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Study time" value={<AnimatedNumber value={stats.minutes / 60} format={(n) => n.toFixed(1)} />} suffix="h" hint={`${Math.round(stats.minutes)} minutes logged`} icon={<Clock className="h-4 w-4" />} tone="brand" delay={0} />
        <StatTile label="Sessions" value={stats.completedSessions} hint={`${stats.interruptedSessions} interrupted today`} icon={<Timer className="h-4 w-4" />} tone="violet" delay={0.04} />
        <StatTile label="Target left" value={formatMinutes(Math.max(0, stats.targetMinutes - stats.minutes), true)} hint={`Target ${formatMinutes(stats.targetMinutes, true)}`} icon={<Target className="h-4 w-4" />} tone={targetPct >= 1 ? 'success' : 'warning'} delay={0.08} />
        <StatTile label="Tasks done" value={stats.tasksCompleted} hint={`${data.tasks.filter((t) => t.status === 'pending').length} pending`} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" delay={0.12} />
        <StatTile label="Study streak" value={`${stats.streak}d`} hint={`Best ${challenge.bestStreak} days`} icon={<Flame className="h-4 w-4" />} tone="warning" delay={0.16} />
        <StatTile label="Distraction" value={stats.distractionMinutes} suffix="min" hint="Reported today" icon={<ShieldAlert className="h-4 w-4" />} tone="danger" delay={0.2} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Today's schedule"
            subtitle={`${doneEntries} of ${todaysEntries.length} scheduled blocks completed`}
            action={
              <Link to="/timetable" className="text-[11px] font-medium text-brand-300 hover:underline">
                Open timetable
              </Link>
            }
          />
          {todaysEntries.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Nothing scheduled for today"
              description="A timetable turns intention into a plan. Add recurring study blocks for each subject."
              action={
                <Button size="sm" variant="secondary" onClick={() => navigate('/timetable?new=1')} icon={<Plus className="h-3.5 w-3.5" />}>
                  Add timetable entry
                </Button>
              }
              className="mt-4"
            />
          ) : (
            <div className="mt-4 space-y-2">
              {todaysEntries.map((entry) => {
                const subject = data.subjects.find((s) => s.id === entry.subject_id)
                const color = sc(subject?.color)
                const isNow = entry.start_time <= clock.toTimeString().slice(0, 5) && entry.end_time >= clock.toTimeString().slice(0, 5)
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                      entry.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : isNow ? 'border-brand-400/35 bg-brand-500/[0.07]' : 'border-[var(--border)] surface-1',
                    )}
                  >
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-[11px] font-semibold">{formatClock12(entry.start_time)}</p>
                      <p className="text-[9px] soft">{formatClock12(entry.end_time)}</p>
                    </div>
                    <div className="h-8 w-px shrink-0" style={{ backgroundColor: `${color.hex}55` }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={cn('truncate text-xs font-medium', entry.status === 'completed' && 'line-through opacity-60')}>{entry.title}</p>
                        {entry.priority === 1 && <Badge tone="danger">must do</Badge>}
                        {isNow && entry.status === 'pending' && <Badge tone="brand" dot>now</Badge>}
                      </div>
                      <p className="truncate text-[10px] muted">
                        {subject?.name ?? 'General'}
                        {entry.topic ? ` · ${entry.topic}` : ''} · {minutesBetweenTimes(entry.start_time, entry.end_time)} min
                      </p>
                    </div>
                    {entry.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Done
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void actions.updateEntry(entry.id, { status: 'completed' })}
                          className="h-7 px-2 text-[10px]"
                        >
                          Mark done
                        </Button>
                        <Button
                          size="sm"
                          icon={<Play className="h-3 w-3" />}
                          onClick={() =>
                            setLaunch({
                              entryId: entry.id,
                              subjectId: entry.subject_id,
                              topic: entry.topic ?? entry.title,
                              minutes: minutesBetweenTimes(entry.start_time, entry.end_time) || 25,
                              mode: 'custom',
                            })
                          }
                          className="h-7 px-2.5 text-[10px]"
                        >
                          Start
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {nextSlot && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] px-3 py-2 text-[11px] muted">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              Next up: <strong className="font-semibold text-[var(--text)]">{nextSlot.title}</strong> at {formatClock12(nextSlot.start_time)}
              <button
                className="ml-auto font-semibold text-brand-300 hover:underline"
                onClick={() =>
                  setLaunch({
                    entryId: nextSlot.id,
                    subjectId: nextSlot.subject_id,
                    topic: nextSlot.topic ?? nextSlot.title,
                    minutes: minutesBetweenTimes(nextSlot.start_time, nextSlot.end_time) || 25,
                    mode: 'custom',
                  })
                }
              >
                Start now
              </button>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Quick actions" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Instant session', icon: <Play className="h-3.5 w-3.5" />, onClick: () => setLaunch({ mode: 'custom', minutes: prefs?.default_focus_minutes ?? 25 }) },
                { label: '25-min sprint', icon: <Timer className="h-3.5 w-3.5" />, onClick: () => setLaunch({ mode: 'pomodoro', minutes: 25 }) },
                { label: '50-min deep work', icon: <TrendingUp className="h-3.5 w-3.5" />, onClick: () => setLaunch({ mode: 'deep', minutes: 50 }) },
                { label: 'Create task', icon: <ListChecks className="h-3.5 w-3.5" />, onClick: () => navigate('/planner?new=1') },
                { label: 'Add timetable entry', icon: <CalendarDays className="h-3.5 w-3.5" />, onClick: () => navigate('/timetable?new=1') },
                { label: 'Exam countdown', icon: <GraduationCap className="h-3.5 w-3.5" />, onClick: () => navigate('/exams') },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] surface-1 px-2.5 py-2.5 text-left text-[11px] font-medium transition hover:surface-2 hover:text-brand-200"
                >
                  <span className="text-brand-300">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title="Priority tasks"
              subtitle={`${data.tasks.filter((t) => t.status === 'pending').length} pending in your planner`}
              action={
                <Link to="/planner" className="text-[11px] font-medium text-brand-300 hover:underline">
                  Planner
                </Link>
              }
            />
            {pendingTasks.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-[11px] muted">
                No pending tasks. Add chapters, revision blocks or mock exams to your planner.
              </p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {pendingTasks.map((task) => {
                  const subject = data.subjects.find((s) => s.id === task.subject_id)
                  const dl = relativeDeadline(task.deadline)
                  return (
                    <div key={task.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                      <button
                        onClick={() => void actions.setTaskStatus(task.id, 'completed')}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--border-strong)] transition hover:border-emerald-400 hover:bg-emerald-500/20"
                        aria-label={`Complete ${task.title}`}
                      >
                        <Check className="h-2.5 w-2.5 opacity-0 transition hover:opacity-100" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium">{task.title}</p>
                        <p className="truncate text-[9.5px] muted">
                          {subject?.name ?? 'General'} · <span className={dl.tone === 'overdue' ? 'text-rose-400' : dl.tone === 'soon' ? 'text-amber-400' : ''}>{dl.label}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setLaunch({ subjectId: task.subject_id, topic: task.title, minutes: Math.min(90, task.estimated_minutes || 25), taskId: task.id, mode: 'custom' })}
                        className="rounded p-1 text-brand-300 transition hover:surface-2"
                        aria-label={`Start studying ${task.title}`}
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="What needs attention"
            subtitle="Derived from your actual records — never random quotes."
            action={<Badge tone={stats.focusScore >= 75 ? 'success' : stats.focusScore >= 45 ? 'warning' : 'neutral'}>Score {stats.focusScore}</Badge>}
          />
          <ul className="mt-3 space-y-2">
            {insights.map((line) => (
              <li key={line} className="flex gap-2 text-[11.5px] leading-relaxed muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {line}
              </li>
            ))}
            {weakest && (
              <li className="flex gap-2 text-[11.5px] leading-relaxed muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                Recommended next block: <strong className="font-medium text-[var(--text)]">{weakest.subject.name}</strong> · {weakest.completedTopics}/{weakest.totalTopics} topics complete.
              </li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (weakest) setLaunch({ subjectId: weakest.subject.id, minutes: prefs?.default_focus_minutes ?? 25, mode: 'custom' })
                else navigate('/subjects')
              }}
              icon={<BookOpen className="h-3.5 w-3.5" />}
            >
              {weakest ? `Study ${weakest.subject.name}` : 'Build subject syllabus'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/guardian')} icon={<ShieldAlert className="h-3.5 w-3.5" />}>
              Log a distraction
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Last 7 days" subtitle="Focused minutes against your daily target" />
          <div className="mt-3 h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                <ChartTooltip
                  cursor={{ fill: 'rgba(91,140,255,0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { label: string; minutes: number; target: number }
                    return (
                      <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--panel-solid)] px-2.5 py-1.5 text-[10px] shadow-xl">
                        <p className="font-semibold">{d.label}</p>
                        <p className="muted">
                          {formatMinutes(d.minutes, true)} / {formatMinutes(d.target, true)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 2, 2]}>
                  {week.map((d) => (
                    <Cell key={d.date} fill={d.minutes >= d.target && d.target > 0 ? '#34d399' : d.minutes > 0 ? '#5b8cff' : 'rgba(120,130,155,0.18)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <SessionLauncher open={Boolean(launch)} onClose={() => setLaunch(null)} context={launch ?? undefined} />

      <Modal
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
        title="Today's target"
        description="A target you set is a target you can be held to."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTargetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveTarget()}>Save target</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Study hours" hint={`Target: ${formatMinutes(targetForm.hours * 60)}`}>
            <NumberInput min={1} max={16} value={targetForm.hours} onValueChange={(v) => setTargetForm((f) => ({ ...f, hours: v }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Focus sessions">
              <NumberInput min={1} max={12} value={targetForm.sessions} onValueChange={(v) => setTargetForm((f) => ({ ...f, sessions: v }))} />
            </Field>
            <Field label="Tasks">
              <NumberInput min={0} max={20} value={targetForm.tasks} onValueChange={(v) => setTargetForm((f) => ({ ...f, tasks: v }))} />
            </Field>
          </div>
          <p className="text-[11px] soft">Remaining after current progress: {formatMinutes(Math.max(0, targetForm.hours * 60 - stats.minutes))}.</p>
        </div>
      </Modal>
    </div>
  )
}

function StatTile({
  label,
  value,
  suffix,
  hint,
  icon,
  tone,
  delay,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
  hint: string
  icon: React.ReactNode
  tone: 'brand' | 'violet' | 'success' | 'warning' | 'danger'
  delay: number
}) {
  const tones = {
    brand: 'text-brand-500 dark:text-brand-300 bg-brand-500/12 border-brand-400/25',
    violet: 'text-violet-500 dark:text-violet-300 bg-violet-500/12 border-violet-400/25',
    success: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/12 border-emerald-400/25',
    warning: 'text-amber-600 dark:text-amber-300 bg-amber-500/12 border-amber-400/25',
    danger: 'text-rose-500 dark:text-rose-300 bg-rose-500/12 border-rose-400/25',
  }
  return (
    <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} className="hover-lift rounded-[26px] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] soft">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl border', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-2.5 font-display text-2xl font-bold tracking-tight">
        {value}
        {suffix && <span className="ml-0.5 text-xs font-semibold muted">{suffix}</span>}
      </p>
      <p className="mt-1 text-[10.5px] font-medium muted line-clamp-1">{hint}</p>
    </Card>
  )
}
