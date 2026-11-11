import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  ShieldAlert,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '../lib/app-context'
import {
  buildInsights,
  dayStats,
  distractionStats,
  seriesLastNDays,
  sessionSeconds,
  subjectDistribution,
  subjectStats,
  datasetSummary,
} from '../lib/metrics'
import { addDaysKey, cn, downloadFile, formatMinutes, toDateKey, todayKey } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, EmptyState, SegmentedControl, SectionHeader } from '../components/ui'

function ChartTooltip({
  active,
  payload,
  label,
  unit = 'min',
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>
  label?: string
  unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--panel-solid)] px-2.5 py-2 text-[10px] shadow-xl">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <strong className="font-semibold text-[var(--text)]">{Math.round(Number(p.value ?? 0))}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

function NoData({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--panel-solid)]/40 backdrop-blur-[1px]">
      <p className="rounded-full border border-[var(--border)] surface-1 px-3 py-1 text-[10px] muted">{label}</p>
    </div>
  )
}

export default function Analytics() {
  const { data, prefs, today, timezone } = useApp()
  const [range, setRange] = useState<'7' | '30' | '90'>('30')
  const rangeDays = Number(range)

  const series = useMemo(() => seriesLastNDays(data, prefs, rangeDays), [data, prefs, rangeDays])
  const summary = useMemo(() => datasetSummary(data, prefs), [data, prefs])
  const subjects = useMemo(() => subjectDistribution(data), [data])
  const subjectRows = useMemo(() => subjectStats(data, prefs), [data, prefs])
  const distraction = useMemo(() => distractionStats(data, prefs, 14), [data, prefs])
  const insights = useMemo(() => buildInsights(data, prefs), [data, prefs])
  const stats = dayStats(data, today, prefs)

  const sessions = data.sessions.filter((s) => s.status !== 'active')
  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const weekMinutes = sessions
    .filter((s) => toDateKey(s.started_at, timezone) >= addDaysKey(today, -6))
    .reduce((sum, s) => sum + sessionSeconds(s) / 60, 0)
  const monthMinutes = sessions
    .filter((s) => toDateKey(s.started_at, timezone) >= addDaysKey(today, -29))
    .reduce((sum, s) => sum + sessionSeconds(s) / 60, 0)
  const avgSession = completedSessions.length ? completedSessions.reduce((sum, s) => sum + s.actual_seconds / 60, 0) / completedSessions.length : 0
  const completionRate = sessions.length ? completedSessions.length / sessions.length : 0
  const taskRate = data.tasks.length ? data.tasks.filter((t) => t.status === 'completed').length / data.tasks.length : 0
  const consistencyDays = series.filter((d) => d.minutes >= d.target * 0.6).length
  const consistency = Math.round((consistencyDays / Math.max(1, series.length)) * 100)

  const weekly = useMemo(() => {
    const out: { label: string; hours: number; sessions: number; target: number }[] = []
    for (let w = 7; w >= 0; w--) {
      const start = addDaysKey(today, -(w * 7 + 6))
      const end = addDaysKey(today, -w * 7)
      const weekSessions = sessions.filter((s) => {
        const key = toDateKey(s.started_at, timezone)
        return key >= start && key <= end
      })
      out.push({
        label: new Date(`${start}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        hours: Math.round((weekSessions.reduce((sum, s) => sum + sessionSeconds(s) / 60, 0) / 60) * 10) / 10,
        sessions: weekSessions.filter((s) => s.status === 'completed').length,
        target: Math.round(((prefs?.daily_target_minutes ?? 240) * 7) / 60),
      })
    }
    return out
  }, [prefs?.daily_target_minutes, sessions, today, timezone])

  const exportCsv = () => {
    const rows = [
      ['date', 'subject', 'topic', 'mode', 'planned_minutes', 'actual_minutes', 'status'],
      ...sessions.map((s) => [
        toDateKey(s.started_at, timezone),
        data.subjects.find((x) => x.id === s.subject_id)?.name ?? 'General',
        (s.topic ?? '').replace(/,/g, ' '),
        s.mode,
        String(s.planned_minutes),
        String(Math.round(sessionSeconds(s) / 60)),
        s.status,
      ]),
    ]
    downloadFile(`focusforge-sessions-${todayKey(timezone)}.csv`, rows.map((r) => r.join(',')).join('\n'), 'text/csv')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Evidence, not vibes"
        title="Analytics"
        description="Every chart below is computed from your persisted sessions, tasks, timetable and distraction logs. Nothing is sampled or invented."
        actions={
          <>
            <SegmentedControl value={range} onChange={setRange} options={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }]} />
            <Button variant="secondary" onClick={exportCsv} icon={<Download className="h-4 w-4" />} disabled={sessions.length === 0}>
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Last 7 days', value: formatMinutes(weekMinutes, true), hint: `${formatMinutes(prefs?.weekly_target_minutes ?? 1680, true)} weekly target`, icon: <Clock className="h-4 w-4" />, tone: 'brand' },
          { label: 'Last 30 days', value: formatMinutes(monthMinutes, true), hint: `${summary.totalSessions} completed sessions`, icon: <BarChart3 className="h-4 w-4" />, tone: 'violet' },
          { label: 'Avg session', value: formatMinutes(avgSession, true), hint: 'Completed sessions only', icon: <Timer className="h-4 w-4" />, tone: 'brand' },
          { label: 'Session completion', value: `${Math.round(completionRate * 100)}%`, hint: `${completedSessions.length}/${sessions.length} started`, icon: <CheckCircle2 className="h-4 w-4" />, tone: 'success' },
          { label: 'Task completion', value: `${Math.round(taskRate * 100)}%`, hint: `${data.tasks.filter((t) => t.status === 'completed').length}/${data.tasks.length} tasks`, icon: <Target className="h-4 w-4" />, tone: 'warning' },
          { label: 'Distraction time', value: formatMinutes(distraction.totalAll, true), hint: `${formatMinutes(distraction.totalToday, true)} today`, icon: <ShieldAlert className="h-4 w-4" />, tone: 'danger' },
        ].map((s) => {
          const tones: Record<string, string> = {
            brand: 'text-brand-300 bg-brand-500/10 border-brand-400/20',
            violet: 'text-violet-400 bg-violet-500/10 border-violet-400/20',
            success: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20',
            warning: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
            danger: 'text-rose-400 bg-rose-500/10 border-rose-400/20',
          }
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-[10px] uppercase tracking-wider soft">{s.label}</p>
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl border', tones[s.tone])}>{s.icon}</span>
              </div>
              <p className="mt-1.5 font-display text-xl font-bold">{s.value}</p>
              <p className="mt-0.5 text-[9.5px] muted">{s.hint}</p>
            </Card>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="relative p-5">
          <SectionHeader
            title="Daily study time"
            subtitle={`Focused minutes per day over the last ${rangeDays} days`}
            action={<Badge tone={stats.minutes >= stats.targetMinutes ? 'success' : 'neutral'}>{formatMinutes(stats.minutes, true)} today</Badge>}
          />
          <div className="relative mt-4 h-[260px]">
            {sessions.length === 0 && <NoData label="No sessions recorded yet" />}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#5b8cff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} interval={rangeDays > 30 ? 10 : rangeDays > 7 ? 4 : 0} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="minutes" name="Studied" stroke="#5b8cff" strokeWidth={2} fill="url(#studyFill)" />
                <Line type="monotone" dataKey="target" name="Target" stroke="#fbbf24" strokeWidth={1.2} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] soft">The dashed line is your daily target. {rangeDays > 30 ? '30-day windows are shown for clarity.' : ''}</p>
        </Card>

        <Card className="relative p-5">
          <SectionHeader title="Subject distribution" subtitle="Where your focused minutes actually went" />
          <div className="relative mt-2 h-[210px]">
            {subjects.length === 0 && <NoData label="Link sessions to subjects to see this" />}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjects} dataKey="minutes" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                  {subjects.map((s) => (
                    <Cell key={s.name} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {subjects.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="text-[10px] font-medium">{formatMinutes(s.minutes, true)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Weekly productivity" subtitle="Hours and completed sessions per week" />
          <div className="relative mt-3 h-[220px]">
            {sessions.length === 0 && <NoData label="No weekly data yet" />}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip unit="h" />} />
                <Bar dataKey="hours" name="Hours" radius={[4, 4, 2, 2]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-between text-[10px] muted">
            <span>Current week target: {formatMinutes(prefs?.weekly_target_minutes ?? 1680, true)}</span>
            <span>{weekly[weekly.length - 1]?.sessions ?? 0} sessions this week</span>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Planned vs actual" subtitle="Timetable minutes against recorded focus time" />
          <div className="relative mt-3 h-[220px]">
            {sessions.length === 0 && <NoData label="No planned or recorded time yet" />}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.slice(-14)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="planned" name="Planned" fill="rgba(120,130,155,0.28)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="minutes" name="Actual" fill="#5b8cff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] soft">Over-planning without execution shows as tall grey bars beside short blue ones.</p>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Consistency" subtitle="Daily focus score across the selected range" action={<Badge tone={consistency >= 70 ? 'success' : consistency >= 40 ? 'warning' : 'neutral'}>{consistency}% of days on pace</Badge>} />
          <div className="relative mt-3 h-[200px]">
            {sessions.length === 0 && <NoData label="Consistency builds after your first sessions" />}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} interval={rangeDays > 30 ? 10 : rangeDays > 7 ? 4 : 0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip content={<ChartTooltip unit="" />} />
                <Line type="monotone" dataKey="focusScore" name="Focus score" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] muted">
            <Flame className="h-3 w-3 text-amber-400" /> Current streak {stats.streak} days · {consistencyDays} days at 60%+ of target
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Distraction trend" subtitle="Self-reported minutes over the last 14 days" action={<Badge tone="danger">{formatMinutes(distraction.totalToday, true)} today</Badge>} />
          <div className="relative mt-3 h-[200px]">
            {distraction.series.every((d) => d.minutes === 0) && <NoData label="No distractions reported — or none logged" />}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distraction.series} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-soft)' }} axisLine={false} tickLine={false} width={34} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="minutes" name="Distraction" fill="#fb7185" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {distraction.byPlatform.map((p) => (
              <span key={p.platform} className="chip capitalize">
                {p.platform}: {formatMinutes(p.minutes, true)}
              </span>
            ))}
            {distraction.byPlatform.length === 0 && <span className="text-[10px] soft">Nothing logged yet.</span>}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Performance insights" subtitle="Generated from this range's actual records" action={<Activity className="h-4 w-4 soft" />} />
          <ul className="mt-3 space-y-2">
            {insights.map((line) => (
              <li key={line} className="flex gap-2 text-[11.5px] leading-relaxed muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                {line}
              </li>
            ))}
            <li className="flex gap-2 text-[11.5px] leading-relaxed muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
              Average completed session length is {formatMinutes(avgSession)}. {avgSession < 20 ? 'Short sessions are fine, but consider one longer deep-work block.' : 'Your session length is healthy for retention.'}
            </li>
            <li className="flex gap-2 text-[11.5px] leading-relaxed muted">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
              {sessions.length - completedSessions.length} of {sessions.length} sessions ended early, a {Math.round(completionRate * 100)}% completion rate.
            </li>
          </ul>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Subject time breakdown" subtitle="Focused minutes and syllabus coverage" />
          <div className="mt-3 space-y-2.5">
            {subjectRows.length === 0 && (
              <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No subjects yet" description="Add subjects and link sessions to unlock this breakdown." className="border-0 py-6" />
            )}
            {subjectRows.map((s) => (
              <div key={s.subject.id}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="truncate muted">{s.subject.name}</span>
                  <span className="shrink-0 font-medium">
                    {formatMinutes(s.minutes, true)} · {s.progress}%
                  </span>
                </div>
                <div className="mt-1 flex gap-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full surface-2">
                    <div className="h-full rounded-full bg-brand-400" style={{ width: `${(s.minutes / Math.max(1, Math.max(...subjectRows.map((x) => x.minutes)))) * 100}%` }} />
                  </div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full surface-2">
                    <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {subjectRows.length > 0 && <p className="pt-1 text-[9.5px] soft">Blue = time invested · Green = topic coverage</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
