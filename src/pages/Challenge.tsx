import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { useFocus } from '../lib/focus'
import { challengeMetrics, dayStats } from '../lib/metrics'
import { addDaysKey, cn, formatDateShort, formatMinutes } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, Field, Input, Modal, NumberInput, ProgressBar, Ring, SectionHeader, Select } from '../components/ui'
import { SessionLauncher } from '../components/session-launcher'
import { toast } from '../lib/events'

export default function Challenge() {
  const { data, actions, prefs, today, timezone } = useApp()
  const focus = useFocus()
  const [setupOpen, setSetupOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [launchOpen, setLaunchOpen] = useState(false)
  const [dayDetail, setDayDetail] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '30-Day Exam Preparation Challenge',
    startDate: today,
    days: 30,
    dailyHours: 4,
    weeklyRevisionTarget: 3,
    prioritySubjects: [] as string[],
  })

  const metrics = useMemo(() => challengeMetrics(data, prefs), [data, prefs])
  const active = metrics.challenge
  const todayStats = metrics.todayStats
  const deficit = metrics.days
    .filter((d) => d.date < today)
    .reduce((sum, d) => sum + Math.max(0, d.target - d.minutes), 0)
  const reportRow = dayDetail ? data.challengeProgress.find((p) => p.date === dayDetail) : null
  const detailStats = dayDetail ? dayStats(data, dayDetail, prefs) : null
  const revisionTasksThisWeek = data.tasks.filter(
    (t) =>
      t.status === 'completed' &&
      (t.category === 'revision' || t.category === 'practice' || t.category === 'mock') &&
      t.completed_at &&
      t.completed_at.slice(0, 10) >= addDaysKey(today, -6),
  ).length

  const create = async () => {
    setCreating(true)
    try {
      await actions.createChallenge({
        name: form.name.trim() || 'Study Challenge',
        startDate: form.startDate,
        days: form.days,
        dailyHours: form.dailyHours,
        weeklyRevisionTarget: form.weeklyRevisionTarget,
        subjectPriorities: form.prioritySubjects,
      })
      setSetupOpen(false)
      await actions.syncChallengeProgress()
    } catch (err) {
      toast.error('Could not start challenge', err instanceof Error ? err.message : undefined)
    } finally {
      setCreating(false)
    }
  }

  if (!active) {
    return (
      <div>
        <PageHeader
          eyebrow="Accountability at scale"
          title="30-Day Study Challenge"
          description="A structured preparation sprint. Every day has a target, every missed day is recorded honestly, and the challenge never resets because of a bad day."
          actions={<Button onClick={() => setSetupOpen(true)} icon={<Plus className="h-4 w-4" />}>Configure challenge</Button>}
        />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="relative border-b border-[var(--border)] bg-gradient-to-br from-brand-500/[0.12] via-transparent to-violet-500/[0.1] px-5 py-7 sm:px-7">
              <div className="pointer-events-none absolute inset-0 tile-grid opacity-30" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <Badge tone="brand" dot>Not started</Badge>
                  <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Thirty days can change the outcome.</h2>
                  <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed muted">
                    Set a daily study target, commit to a starting date, and let FOCUSFORGE track the real record. The challenge will not reset when you miss a day — it
                    will show you exactly where you stand.
                  </p>
                </div>
                <Ring progress={0} size={96} stroke={7}>
                  <span className="font-display text-lg font-semibold">0</span>
                  <span className="text-[9px] soft">days</span>
                </Ring>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {[
                { title: 'Daily targets', body: 'Study hours and focus sessions per day, based on your real capacity.' },
                { title: 'Honest tracking', body: 'Missed days are recorded, not reset. Recovery is planned, not pretended.' },
                { title: 'Performance reports', body: 'Each day produces a report from your actual sessions and tasks.' },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-[var(--border)] surface-1 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                    <Check className="h-3 w-3 text-brand-300" /> {f.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed muted">{f.body}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] p-5">
              <Button onClick={() => setSetupOpen(true)} icon={<Target className="h-4 w-4" />}>
                Start the 30-day challenge
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Prerequisites" subtitle="The challenge works best with a real plan" />
            <ul className="mt-3 space-y-2 text-[11px] muted leading-relaxed">
              <li className={cn('flex items-center gap-2', data.subjects.length > 0 && 'text-emerald-400')}>
                {data.subjects.length > 0 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} At least one subject added ({data.subjects.length})
              </li>
              <li className={cn('flex items-center gap-2', data.exams.length > 0 && 'text-emerald-400')}>
                {data.exams.length > 0 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Examination dates entered ({data.exams.length})
              </li>
              <li className={cn('flex items-center gap-2', data.entries.length > 0 && 'text-emerald-400')}>
                {data.entries.length > 0 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Timetable blocks scheduled ({data.entries.length})
              </li>
              <li className={cn('flex items-center gap-2', data.tasks.length > 0 && 'text-emerald-400')}>
                {data.tasks.length > 0 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Study tasks created ({data.tasks.length})
              </li>
            </ul>
            <p className="mt-3 text-[10px] soft">You can start without these, but readiness and analytics will be sparse.</p>
          </Card>
        </div>

        <Modal
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          title="Configure your challenge"
          description="Pick honest targets. You can adjust the daily hours later."
          footer={
            <>
              <Button variant="ghost" onClick={() => setSetupOpen(false)}>
                Cancel
              </Button>
              <Button loading={creating} onClick={() => void create()}>
                Start challenge
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Field label="Challenge name">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Start date">
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </Field>
              <Field label="Duration (days)">
                <NumberInput min={7} max={120} value={form.days} onValueChange={(v) => setForm((f) => ({ ...f, days: v }))} />
              </Field>
              <Field label="Daily hours">
                <NumberInput min={1} max={16} step={0.5} value={form.dailyHours} onValueChange={(v) => setForm((f) => ({ ...f, dailyHours: v }))} />
              </Field>
            </div>
            <Field label="Weekly revision target (revision tasks)">
              <NumberInput min={0} max={30} value={form.weeklyRevisionTarget} onValueChange={(v) => setForm((f) => ({ ...f, weeklyRevisionTarget: v }))} />
            </Field>
            <Field label="Subject priorities (up to 3)">
              <div className="flex flex-wrap gap-1.5">
                {data.subjects.map((s) => {
                  const activeSubject = form.prioritySubjects.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          prioritySubjects: activeSubject ? f.prioritySubjects.filter((id) => id !== s.id) : [...f.prioritySubjects, s.id].slice(0, 3),
                        }))
                      }
                      className={cn('rounded-full border px-3 py-1 text-[11px] transition', activeSubject ? 'border-brand-400/50 bg-brand-500/15' : 'border-[var(--border)] surface-1 muted')}
                    >
                      {s.name}
                    </button>
                  )
                })}
                {data.subjects.length === 0 && <p className="text-[10.5px] muted">Add subjects first to prioritise them.</p>}
              </div>
            </Field>
            <p className="rounded-2xl border border-brand-400/20 bg-brand-500/[0.06] p-3 text-[10.5px] leading-relaxed muted">
              Day 1 starts on {form.startDate}. Targets apply immediately. Missing a day never resets the challenge — it is tracked as a missed day with a recovery plan.
            </p>
          </div>
        </Modal>
      </div>
    )
  }

  const progress = metrics.elapsedDays / Math.max(1, metrics.totalDays)
  const completed = metrics.completedDays
  const todayDone = todayStats.minutes >= todayStats.targetMinutes && todayStats.minutes > 0

  return (
    <div>
      <PageHeader
        eyebrow={`${formatDateShort(active.start_date)} → ${formatDateShort(active.end_date)} · ${timezone}`}
        title={active.name}
        description={`Day ${metrics.currentDay} of ${metrics.totalDays}. ${metrics.remainingDays} days left. Targets are ${active.daily_hours} study hours per day.`}
        actions={
          <>
            <Button variant="secondary" icon={<Settings2 className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
              Challenge settings
            </Button>
            <Button onClick={() => setLaunchOpen(true)} icon={<Play className="h-4 w-4" />} disabled={Boolean(focus.session)}>
              Study now
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Ring progress={progress} size={168} stroke={11}>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] soft">Challenge day</span>
              <span className="mt-0.5 font-display text-3xl font-semibold leading-none">{metrics.currentDay}</span>
              <span className="mt-1 text-[10px] muted">of {metrics.totalDays}</span>
              <span className="mt-1.5 rounded-full surface-2 px-2 py-0.5 text-[9px] font-semibold">{Math.round(progress * 100)}% elapsed</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={todayDone ? 'success' : 'warning'} dot>
                  Today {todayDone ? 'target met' : 'in progress'}
                </Badge>
                <Badge tone="neutral">{completed} days completed</Badge>
                <Badge tone={metrics.missedDays > 0 ? 'danger' : 'success'}>{metrics.missedDays} missed</Badge>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed muted">
                {todayDone
                  ? `You have already hit today's ${formatMinutes(todayStats.targetMinutes)} target. Anything more widens your margin.`
                  : `${formatMinutes(Math.max(0, todayStats.targetMinutes - todayStats.minutes))} remaining to secure Day ${metrics.currentDay}.`}
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] muted">
                  <span>Today's progress</span>
                  <span>{formatMinutes(todayStats.minutes, true)} / {formatMinutes(todayStats.targetMinutes, true)}</span>
                </div>
                <ProgressBar value={todayStats.minutes / Math.max(1, todayStats.targetMinutes)} className="mt-1" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded-2xl border border-[var(--border)] surface-1 px-2 py-1.5">
                  <p className="soft">Consistency</p>
                  <p className="text-sm font-semibold">{metrics.consistency}%</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] surface-1 px-2 py-1.5">
                  <p className="soft">Streak</p>
                  <p className="text-sm font-semibold">{metrics.streak}d</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] surface-1 px-2 py-1.5">
                  <p className="soft">Best</p>
                  <p className="text-sm font-semibold">{metrics.bestStreak}d</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider soft">Challenge hours</p>
            <p className="mt-1 font-display text-xl font-semibold">{(metrics.totalMinutes / 60).toFixed(1)}h</p>
            <p className="text-[10px] muted">of {(metrics.targetMinutes / 60).toFixed(0)}h challenge target</p>
            <ProgressBar value={metrics.totalMinutes / Math.max(1, metrics.targetMinutes)} height="h-1" className="mt-2" />
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider soft">Deficit</p>
            <p className={cn('mt-1 font-display text-xl font-semibold', deficit > 0 && 'text-amber-400')}>{formatMinutes(deficit, true)}</p>
            <p className="text-[10px] muted">Across elapsed days</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider soft">Weekly revision</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {revisionTasksThisWeek}/{active.weekly_revision_target}
            </p>
            <p className="text-[10px] muted">Revision/practice tasks this week</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider soft">Recovery plan</p>
            <p className="mt-1 text-[12px] font-semibold">
              {deficit === 0 ? 'On track' : `+${Math.ceil(deficit / Math.max(1, metrics.remainingDays))} min/day`}
            </p>
            <p className="text-[10px] muted">{deficit === 0 ? 'No deficit to recover' : `To recover over ${metrics.remainingDays} days`}</p>
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <SectionHeader
          title="The 30 days"
          subtitle="Click any day to inspect its honest performance report"
          action={
            <div className="flex items-center gap-2 text-[9.5px] soft">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> met</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/50" /> missed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm surface-2" /> upcoming</span>
            </div>
          }
        />
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {metrics.days.map((day) => (
            <button
              key={day.date}
              onClick={() => setDayDetail(day.date)}
              className={cn(
                'group relative flex aspect-square flex-col items-center justify-center rounded-2xl border text-center transition-transform hover:-translate-y-0.5',
                day.status === 'completed' && 'border-emerald-400/30 bg-emerald-500/15',
                day.status === 'missed' && 'border-rose-400/30 bg-rose-500/10',
                day.status === 'pending' && 'border-brand-400/50 bg-brand-500/10',
                day.status === 'future' && 'border-[var(--border)] surface-1',
              )}
            >
              <span className={cn('text-[8.5px] font-semibold uppercase tracking-wider', day.status === 'completed' ? 'text-emerald-400' : day.status === 'missed' ? 'text-rose-400' : 'soft')}>
                D{day.dayNumber}
              </span>
              <span className="text-[10px] font-semibold">{formatDateShort(day.date)}</span>
              {day.status === 'completed' && <Check className="mt-0.5 h-2.5 w-2.5 text-emerald-400" />}
              {day.status === 'missed' && <X className="mt-0.5 h-2.5 w-2.5 text-rose-400" />}
              {day.status === 'pending' && <span className="mt-0.5 text-[8px] text-brand-300">today</span>}
              {day.status === 'future' && <span className="mt-0.5 text-[8px] soft">{Math.round(day.target / 60)}h</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] surface-1 px-3 py-2 text-[10.5px] muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-300" /> Missed days are recorded, never erased. The challenge continues until Day {metrics.totalDays}.
          </span>
          <span className="flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" /> {metrics.completedDays} of {metrics.elapsedDays} elapsed days met target
          </span>
        </div>
      </Card>

      {metrics.currentDay > metrics.totalDays && (
        <Card className="mt-4 border-brand-400/30 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold">Challenge complete</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed muted">
                You studied {(metrics.totalMinutes / 60).toFixed(1)} hours across the challenge, met the daily target on {metrics.completedDays} days, and recorded {metrics.missedDays}{' '}
                missed days. Consistency: {metrics.consistency}%. Best streak: {metrics.bestStreak} days.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Recovery & discipline" subtitle="What the data says you should do next" />
          <ul className="mt-3 space-y-2 text-[11px] leading-relaxed muted">
            {deficit > 0 && (
              <li className="flex gap-2">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                You are {formatMinutes(deficit)} behind the cumulative challenge target. Adding {Math.ceil(deficit / Math.max(1, metrics.remainingDays))} minutes per remaining day
                clears the deficit without a heroic catch-up day.
              </li>
            )}
            {todayStats.interruptedSessions > 0 && (
              <li className="flex gap-2">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                {todayStats.interruptedSessions} interrupted session{todayStats.interruptedSessions === 1 ? '' : 's'} today. Interruptions are excluded from completed counts.
              </li>
            )}
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
              Your weakest planned area this week is revision ({revisionTasksThisWeek}/{active.weekly_revision_target} revision tasks). Schedule one revision block next.
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              Keep the challenge active until {formatDateShort(active.end_date)}. Starting a new challenge archives this one; it never deletes the record.
            </li>
          </ul>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Daily performance reports" subtitle="Generated from real daily records" />
          <div className="mt-3 space-y-1.5">
            {data.challengeProgress
              .filter((p) => p.challenge_id === active.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 6)
              .map((p) => (
                <button key={p.id} onClick={() => setDayDetail(p.date)} className="flex w-full items-center gap-2 rounded-2xl border border-[var(--border)] surface-1 px-2.5 py-2 text-left transition hover:surface-2">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-xl text-[9px] font-bold', p.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                    D{p.day_number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px] font-medium">{formatDateShort(p.date)} · {formatMinutes(p.studied_minutes, true)} studied</span>
                    <span className="block truncate text-[9px] soft">{p.report?.summary ?? 'Report pending'}</span>
                  </span>
                  <span className="text-[9.5px] font-semibold">{p.focus_score}</span>
                  <ChevronRight className="h-3 w-3 soft" />
                </button>
              ))}
            {data.challengeProgress.filter((p) => p.challenge_id === active.id).length === 0 && (
              <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-3 py-5 text-center text-[10.5px] muted">
                No reports yet. Complete a session and reports will be generated for each elapsed day.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Start a new challenge"
        description="A new challenge archives the current one but keeps all history."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSetupOpen(false)}>
              Cancel
            </Button>
            <Button loading={creating} onClick={() => void create()}>
              Start challenge
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Challenge name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Days">
              <NumberInput min={7} max={120} value={form.days} onValueChange={(v) => setForm((f) => ({ ...f, days: v }))} />
            </Field>
            <Field label="Daily hours">
              <NumberInput min={1} max={16} step={0.5} value={form.dailyHours} onValueChange={(v) => setForm((f) => ({ ...f, dailyHours: v }))} />
            </Field>
          </div>
          <Field label="Weekly revision target">
            <NumberInput min={0} max={30} value={form.weeklyRevisionTarget} onValueChange={(v) => setForm((f) => ({ ...f, weeklyRevisionTarget: v }))} />
          </Field>
          <Field label="Subject priorities">
            <Select value="" onChange={(e) => e.target.value && setForm((f) => ({ ...f, prioritySubjects: [...f.prioritySubjects, e.target.value].slice(0, 3) }))}>
              <option value="">Add a priority subject…</option>
              {data.subjects.filter((s) => !form.prioritySubjects.includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {form.prioritySubjects.map((id) => {
              const s = data.subjects.find((x) => x.id === id)
              return (
                <button key={id} onClick={() => setForm((f) => ({ ...f, prioritySubjects: f.prioritySubjects.filter((x) => x !== id) }))} className="chip">
                  {s?.name ?? 'Subject'} <X className="h-3 w-3" />
                </button>
              )
            })}
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Challenge settings"
        description="Adjust your daily commitment. Past days are not recalculated."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                await actions.updateChallenge(active.id, { daily_hours: form.dailyHours, weekly_revision_target: form.weeklyRevisionTarget })
                setSettingsOpen(false)
                toast.success('Challenge updated')
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Daily target hours">
            <NumberInput min={1} max={16} step={0.5} value={form.dailyHours} onValueChange={(v) => setForm((f) => ({ ...f, dailyHours: v }))} />
          </Field>
          <Field label="Weekly revision target">
            <NumberInput min={0} max={30} value={form.weeklyRevisionTarget} onValueChange={(v) => setForm((f) => ({ ...f, weeklyRevisionTarget: v }))} />
          </Field>
          <div className="rounded-2xl border border-[var(--border)] surface-1 p-3 text-[10.5px] leading-relaxed muted">
            Current challenge runs {formatDateShort(active.start_date)} to {formatDateShort(active.end_date)}. Changing the daily target affects today and future days only.
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(dayDetail)}
        onClose={() => setDayDetail(null)}
        title={dayDetail ? `Day report · ${new Date(`${dayDetail}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
        description="Generated from focus sessions, tasks and distraction logs."
        size="md"
      >
        {dayDetail && detailStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Studied', value: formatMinutes(detailStats.minutes, true) },
                { label: 'Target', value: formatMinutes(detailStats.targetMinutes, true) },
                { label: 'Sessions', value: `${detailStats.completedSessions}` },
                { label: 'Focus score', value: `${detailStats.focusScore}` },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[var(--border)] surface-1 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider soft">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] muted">
                <span>Target achievement</span>
                <span>{Math.round(Math.min(1, detailStats.minutes / Math.max(1, detailStats.targetMinutes)) * 100)}%</span>
              </div>
              <ProgressBar value={detailStats.minutes / Math.max(1, detailStats.targetMinutes)} className="mt-1" tone={detailStats.minutes >= detailStats.targetMinutes ? 'success' : 'warning'} />
            </div>
            <div className="space-y-1.5 text-[11px] muted">
              <p>· {detailStats.tasksCompleted} task(s) completed</p>
              <p>· {detailStats.interruptedSessions} interrupted session(s)</p>
              <p>· {detailStats.distractionMinutes} minutes of reported distraction</p>
              <p>· {detailStats.minutes >= detailStats.targetMinutes ? 'Daily target met — counts as a completed challenge day.' : `${formatMinutes(Math.max(0, detailStats.targetMinutes - detailStats.minutes))} short of target.`}</p>
            </div>
            {reportRow?.report && (
              <div className="rounded-2xl border border-[var(--border)] surface-1 p-3 text-[10.5px] leading-relaxed muted">
                <p className="font-semibold text-[var(--text)]">Persisted report</p>
                <p className="mt-1">{reportRow.report.summary}</p>
              </div>
            )}
            {dayDetail === today && (
              <Button
                size="sm"
                onClick={() => {
                  setDayDetail(null)
                  setLaunchOpen(true)
                }}
                icon={<Play className="h-3.5 w-3.5" />}
              >
                Study now
              </Button>
            )}
          </div>
        )}
      </Modal>

      <SessionLauncher
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        context={{ minutes: Math.max(25, Math.round((todayStats.targetMinutes - todayStats.minutes) / 2)), mode: 'custom' }}
      />
    </div>
  )
}
