import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Gamepad2,
  Globe,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Play,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Youtube,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { useFocus } from '../lib/focus'
import { buildInsights, dailyReportText, dayStats, distractionStats } from '../lib/metrics'
import type { DistractionPlatform } from '../lib/types'
import { cn, formatClock12, formatMinutes, minutesBetweenTimes, relativeDeadline, toDateKey, weekdayOfKey } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, EmptyState, Field, Input, NumberInput, ProgressBar, SectionHeader } from '../components/ui'
import { SessionLauncher } from '../components/session-launcher'
import { toast } from '../lib/events'

const PLATFORMS: { id: DistractionPlatform; label: string; icon: React.ReactNode }[] = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="h-4 w-4" /> },
  { id: 'youtube', label: 'YouTube Shorts', icon: <Youtube className="h-4 w-4" /> },
  { id: 'browsing', label: 'Browsing', icon: <Globe className="h-4 w-4" /> },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="h-4 w-4" /> },
  { id: 'chat', label: 'Chat / social', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
]

export default function Guardian() {
  const { data, actions, prefs, today, timezone, user } = useApp()
  const focus = useFocus()
  const [now, setNow] = useState(Date.now())
  const [platform, setPlatform] = useState<DistractionPlatform>('instagram')
  const [minutes, setMinutes] = useState(20)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [launch, setLaunch] = useState(false)
  const [reportOpen, setReportOpen] = useState(true)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const stats = useMemo(() => dayStats(data, today, prefs), [data, prefs, today])
  const distractions = useMemo(() => distractionStats(data, prefs, 7), [data, prefs])
  const insights = useMemo(() => buildInsights(data, prefs), [data, prefs])
  const report = dailyReportText(data, prefs, today)
  const todayLogs = data.distractions.filter((d) => d.date === today).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const interruptions = [...data.interruptions].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)

  const missedEntries = data.entries.filter((e) => {
    if (e.status !== 'pending') return false
    const isToday = e.day_of_week === weekdayOfKey(today) || e.recurrence === 'daily'
    if (!isToday) return false
    const [h, m] = e.end_time.split(':').map(Number)
    return h * 60 + m < new Date(now).getHours() * 60 + new Date(now).getMinutes()
  })

  const overdueTasks = data.tasks.filter((t) => t.status === 'pending' && t.deadline && t.deadline.slice(0, 10) < today)

  const checklist = [
    { label: `Study ${formatMinutes(stats.targetMinutes, true)}`, done: stats.minutes >= stats.targetMinutes, detail: formatMinutes(stats.minutes, true) },
    { label: `Complete ${stats.targetSessions} focus sessions`, done: stats.completedSessions >= stats.targetSessions, detail: `${stats.completedSessions} done` },
    {
      label: 'Finish tasks due today',
      done: data.tasks.filter((t) => t.status === 'pending' && t.deadline && t.deadline.slice(0, 10) === today).length === 0,
      detail: `${data.tasks.filter((t) => t.status === 'pending' && t.deadline && t.deadline.slice(0, 10) === today).length} pending`,
    },
    { label: 'Report distraction time honestly', done: todayLogs.length > 0, detail: `${formatMinutes(distractions.totalToday, true)} logged` },
    { label: 'Keep interruption count at zero', done: stats.interruptedSessions === 0, detail: `${stats.interruptedSessions} today` },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Accountability, not punishment"
        title="Focus Guardian"
        description="Commitment, interruption logging and distraction awareness. Your device always remains under your control — nothing here traps or blocks you."
        actions={
          <>
            <Button variant="secondary" icon={<Play className="h-4 w-4" />} onClick={() => setLaunch(true)} disabled={Boolean(focus.session)}>
              Start committed session
            </Button>
            <Badge tone={stats.focusScore >= 75 ? 'success' : stats.focusScore >= 45 ? 'warning' : 'danger'}>Focus score {stats.focusScore}/100</Badge>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Log a distraction"
            subtitle="Honest reporting is the only way this number means anything."
            action={<Badge tone="danger">{formatMinutes(distractions.totalToday, true)} today</Badge>}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium transition',
                  platform === p.id ? 'border-brand-400/45 bg-brand-500/12 text-[var(--text)]' : 'border-[var(--border)] surface-1 muted hover:surface-2',
                )}
              >
                <span className={platform === p.id ? 'text-brand-300' : 'soft'}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[110px_1fr_150px]">
            <Field label="Minutes">
              <NumberInput min={1} max={720} value={minutes} onValueChange={setMinutes} />
            </Field>
            <Field label="What happened? (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 40 minutes of Reels after lunch" />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={async () => {
                await actions.logDistraction(platform, minutes, note, date)
                setNote('')
              }}
              icon={<ShieldAlert className="h-4 w-4" />}
            >
              Log distraction
            </Button>
            {[10, 20, 30, 60].map((m) => (
              <button key={m} onClick={() => setMinutes(m)} className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] font-medium surface-1 muted transition hover:surface-2">
                {m}m
              </button>
            ))}
            <span className="ml-auto text-[10px] soft">Lost time is shown as-is — never deducted from study time, never hidden.</span>
          </div>

          {todayLogs.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {todayLogs.map((log) => {
                const meta = PLATFORMS.find((p) => p.id === log.platform)
                return (
                  <motion.div key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] surface-1 px-2.5 py-2">
                    <span className="text-rose-400">{meta?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium capitalize">{meta?.label ?? log.platform} · {formatMinutes(log.minutes, true)}</p>
                      <p className="truncate text-[9.5px] muted">{log.note ?? 'No note'} · {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <button onClick={() => void actions.deleteDistraction(log.id)} className="rounded p-1 soft hover:text-rose-400" aria-label="Delete log">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader title="Today's accountability checklist" subtitle="No gamification tricks — just the facts" />
          <div className="mt-3 space-y-1.5">
            {checklist.map((item) => (
              <div key={item.label} className={cn('flex items-center gap-2 rounded-2xl border px-2.5 py-2', item.done ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-[var(--border)] surface-1')}>
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', item.done ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400' : 'border-[var(--border-strong)] soft')}>
                  {item.done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                </span>
                <p className="min-w-0 flex-1 text-[11px] font-medium">{item.label}</p>
                <span className="text-[9.5px] soft">{item.detail}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] muted">
              <span>Focus score composition</span>
              <span>{stats.focusScore}/100</span>
            </div>
            <ProgressBar value={stats.focusScore / 100} className="mt-1" tone={stats.focusScore >= 70 ? 'success' : 'brand'} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Focus score calculator" subtitle="Every component and its weight, visible" />
          <div className="mt-3 space-y-2.5">
            {stats.scoreParts.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="muted">{p.label}</span>
                  <span className="font-medium">{p.earned}/{p.max}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full surface-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(p.earned / p.max) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-400" />
                </div>
                <p className="mt-0.5 text-[9.5px] soft">{p.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-2xl border border-[var(--border)] surface-1 p-2.5 text-[10px] leading-relaxed muted">
            Formula: study volume 40 + session completion 25 + academic tasks 15 + consistency 10 + focus discipline 10 = 100. Tasks with no deadline due today contribute 0
            unless you complete extra work.
          </p>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Missed blocks & overdue work" subtitle="Detected from your timetable and task deadlines" />
          <div className="mt-3 space-y-2">
            {missedEntries.length === 0 && overdueTasks.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-[10.5px] muted">
                Nothing overdue right now. Your timetable and planner are clear.
              </p>
            )}
            {missedEntries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">{entry.title}</p>
                    <p className="text-[9.5px] muted">
                      Scheduled {formatClock12(entry.start_time)}–{formatClock12(entry.end_time)} · {minutesBetweenTimes(entry.start_time, entry.end_time)} min not logged
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => void actions.updateEntry(entry.id, { status: 'missed' })}>
                    Mark missed
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLaunch(true)}
                    disabled={Boolean(focus.session)}
                  >
                    Study now
                  </Button>
                </div>
              </div>
            ))}
            {overdueTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.05] p-2.5">
                <p className="text-[11px] font-semibold">{task.title}</p>
                <p className="text-[9.5px] muted">
                  {relativeDeadline(task.deadline).label} · {task.estimated_minutes} min estimated ·{' '}
                  {data.subjects.find((s) => s.id === task.subject_id)?.name ?? 'General'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionHeader
            title="Interruption history"
            subtitle="Early exits with reasons, planned vs actual time"
            action={<Badge tone={interruptions.length ? 'warning' : 'success'}>{interruptions.length} recorded</Badge>}
          />
          {interruptions.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No interruptions recorded" description="Ending a session early is allowed. When it happens, it is logged here with the reason you choose." className="mt-3 border-0 py-6" />
          ) : (
            <div className="mt-3 space-y-1.5">
              {interruptions.map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] surface-1 px-2.5 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
                    <ShieldAlert className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium capitalize">{i.reason.replace('_', ' ')}</p>
                    <p className="text-[9px] muted">
                      {toDateKey(i.created_at, timezone)} · {i.actual_minutes} of {i.planned_minutes} min · {i.note ?? 'no note'}
                    </p>
                  </div>
                  <Badge tone="danger">−{i.planned_minutes - i.actual_minutes}m</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="End-of-day accountability report"
            subtitle={`Generated ${today} · ${timezone}`}
            action={
              <Button
                size="sm"
                variant="ghost"
                icon={<ClipboardCopy className="h-3.5 w-3.5" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(report)
                    toast.success('Report copied')
                  } catch {
                    toast.error('Clipboard unavailable', 'Select the text and copy it manually.')
                  }
                }}
              >
                Copy
              </Button>
            }
          />
          <p className="mt-3 rounded-2xl border border-[var(--border)] surface-1 p-3 text-[11px] leading-relaxed muted">{report}</p>
          <ul className="mt-3 space-y-1.5">
            {insights.slice(0, 3).map((line) => (
              <li key={line} className="flex gap-2 text-[10.5px] leading-relaxed muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await actions.syncChallengeProgress()
                await actions.notify({ type: 'report', title: 'Daily accountability report', body: report, link: '/analytics' })
                toast.success('Report saved', 'Your daily report has been written to notifications.')
              }}
            >
              Save report
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReportOpen((o) => !o)}>
              {reportOpen ? 'Hide details' : 'Show details'}
            </Button>
          </div>
          {reportOpen && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Studied', value: formatMinutes(stats.minutes, true) },
                { label: 'Interruptions', value: `${stats.interruptedSessions}` },
                { label: 'Distraction', value: formatMinutes(stats.distractionMinutes, true) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[var(--border)] surface-1 px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wider soft">{s.label}</p>
                  <p className="text-[11px] font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Anti-procrastination controls" subtitle="What is enabled right now" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Commitment gate', active: true, detail: 'Required before every session' },
            { label: 'Interruption logging', active: true, detail: 'Reason + note required' },
            { label: 'Daily target reminders', active: Boolean(prefs?.notify.daily_target), detail: prefs?.notify.daily_target ? 'Enabled in settings' : 'Enable in Settings → Notifications' },
            { label: 'Deadline alerts', active: Boolean(prefs?.notify.deadlines), detail: prefs?.notify.deadlines ? '24h before due' : 'Enable in Settings → Notifications' },
          ].map((f) => (
            <div key={f.label} className={cn('rounded-2xl border p-3', f.active ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-[var(--border)] surface-1')}>
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold">
                <span className={cn('h-1.5 w-1.5 rounded-full', f.active ? 'bg-emerald-400' : 'bg-[var(--text-soft)]')} />
                {f.label}
              </p>
              <p className="mt-1 text-[9.5px] muted">{f.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--border)] surface-1 p-2.5 text-[10px] leading-relaxed muted">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-brand-300" />
          FOCUSFORGE never blocks your device, hides exit controls, or loops confirmations. You can end any session instantly; it simply records the truth.
        </p>
        <p className="mt-2 text-[9.5px] soft">Signed in as {user?.email ?? 'local workspace'} · timezone {timezone}</p>
      </Card>

      <SessionLauncher
        open={launch}
        onClose={() => setLaunch(false)}
        context={{
          minutes: prefs?.default_focus_minutes ?? 25,
          topic: missedEntries[0]?.topic ?? undefined,
          subjectId: missedEntries[0]?.subject_id ?? null,
          entryId: missedEntries[0]?.id ?? null,
          mode: 'custom',
        }}
      />
    </div>
  )
}
