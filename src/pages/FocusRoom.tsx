import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlarmClock,
  ArrowRight,
  Brain,
  CheckCircle2,
  Coffee,
  Flame,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Square,
  Timer,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { FOCUS_MODES, useFocus, type FocusMode } from '../lib/focus'
import { dayStats, sessionSeconds } from '../lib/metrics'
import { cn, formatMinutes, formatSeconds, subjectColor } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, Field, Input, Modal, ProgressBar, Ring, SectionHeader, Select } from '../components/ui'
import { toast } from '../lib/events'
import { requestNotificationPermission, notificationPermission } from '../lib/notifications'

const MODE_ICONS: Record<FocusMode, React.ReactNode> = {
  pomodoro: <Timer className="h-4 w-4" />,
  deep: <Brain className="h-4 w-4" />,
  exam: <AlarmClock className="h-4 w-4" />,
  custom: <Sparkles className="h-4 w-4" />,
  emergency: <Flame className="h-4 w-4" />,
}

function AnimatedDigits({ seconds }: { seconds: number }) {
  const text = formatSeconds(seconds)
  return (
    <span className="inline-flex items-baseline font-mono text-[54px] font-medium tabular-nums tracking-tight sm:text-[68px]">
      {text.split('').map((ch, i) => (
        <motion.span
          key={`${i}-${ch}`}
          initial={{ y: 6, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className={ch === ':' ? 'px-0.5 opacity-60' : ''}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

function SetupPanel() {
  const { data, prefs, today, actions } = useApp()
  const focus = useFocus()
  const [mode, setMode] = useState<FocusMode>('pomodoro')
  const [minutes, setMinutes] = useState(prefs?.default_focus_minutes ?? 25)
  const [subjectId, setSubjectId] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [taskId, setTaskId] = useState('')
  const [committed, setCommitted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [notifPermission, setNotifPermission] = useState(notificationPermission())

  const stats = dayStats(data, today, prefs)
  const modeInfo = FOCUS_MODES.find((m) => m.id === mode)!
  const tasks = data.tasks.filter((t) => t.status === 'pending' && (!subjectId || t.subject_id === subjectId))

  useEffect(() => {
    setMinutes(modeInfo.focus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const start = async () => {
    if (!committed) {
      toast.warning('Commitment required', 'Tick the accountability commitment before starting.')
      return
    }
    setStarting(true)
    try {
      await focus.start({
        mode,
        minutes,
        subjectId: subjectId || null,
        topic: topic.trim() || null,
        taskId: taskId || null,
      })
    } catch (err) {
      toast.error('Session could not start', err instanceof Error ? err.message : undefined)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Distraction-free study environment"
        title="Focus Room"
        description="Choose a mode, commit to one objective, and let the timestamp engine do the rest. Your session survives refreshes and browser restarts."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<AlarmClock className="h-3.5 w-3.5" />}
            onClick={async () => {
              const result = await requestNotificationPermission()
              setNotifPermission(result)
              if (result === 'granted') toast.success('Notifications enabled', 'Session completion alerts are on.')
              if (result === 'denied') toast.warning('Notifications blocked', 'You can re-enable them in your browser site settings.')
            }}
          >
            {notifPermission === 'granted' ? 'Notifications on' : 'Enable notifications'}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Focus mode" subtitle="Each mode changes the timer defaults, break rhythm and copy." />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FOCUS_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'relative overflow-hidden rounded-xl border p-3 text-left transition-all',
                    mode === m.id ? 'border-brand-400/50 bg-brand-500/[0.09] shadow-[0_0_0_1px_rgba(91,140,255,0.25)]' : 'border-[var(--border)] surface-1 hover:surface-2',
                  )}
                >
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', mode === m.id ? 'bg-brand-500/20 text-brand-300' : 'surface-2 muted')}>{MODE_ICONS[m.id]}</span>
                  <p className="mt-2 text-xs font-semibold">{m.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed muted">{m.description}</p>
                  {mode === m.id && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </button>
              ))}
            </div>
          </Card>

          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="relative grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
              <div className="flex justify-center">
                <Ring progress={0} size={200} stroke={10}>
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] soft">Planned block</span>
                  <span className="mt-1 font-display text-3xl font-semibold">{minutes}</span>
                  <span className="text-[10px] muted">minutes</span>
                  <span className="mt-2 text-[9.5px] soft">{modeInfo.break}m break after</span>
                </Ring>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[15, 25, 30, 45, 50, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setMinutes(d)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                        minutes === d ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-[var(--border)] surface-1 muted hover:surface-2',
                      )}
                    >
                      {d}m
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.min(300, Math.max(1, Number(e.target.value) || 1)))}
                      className="field-sm w-[74px] text-center"
                    />
                    <span className="text-[10px] soft">custom</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Subject">
                    <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTaskId('') }}>
                      <option value="">General study</option>
                      {data.subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Linked task (optional)">
                    <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                      <option value="">No task</option>
                      {tasks.slice(0, 20).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Session objective" className="mt-3" hint="Vague objectives invite distractions. Be specific.">
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Solve 12 integration problems from Unit 3" />
                </Field>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-brand-400/25 bg-brand-500/[0.06] p-3">
                  <input type="checkbox" checked={committed} onChange={(e) => setCommitted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5b8cff]" />
                  <span>
                    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-300" /> I commit to focusing on this task until the session ends.
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-relaxed muted">
                      Ending early is allowed and never blocked — it is simply recorded as an interruption, not a completed session.
                    </span>
                  </span>
                </label>

                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={() => void start()} loading={starting} disabled={!committed} icon={<Play className="h-4 w-4" />} className="flex-1 sm:flex-none">
                    Start {minutes}-minute session
                  </Button>
                  <span className="text-[10px] soft">Ends ≈ {new Date(Date.now() + minutes * 60000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Today's footprint" subtitle="Real records only" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Focused', value: formatMinutes(stats.minutes, true) },
                { label: 'Sessions', value: `${stats.completedSessions}` },
                { label: 'Focus score', value: `${stats.focusScore}` },
                { label: 'Interruptions', value: `${stats.interruptedSessions}` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[var(--border)] surface-1 px-3 py-2">
                  <p className="text-[9.5px] uppercase tracking-wider soft">{s.label}</p>
                  <p className="mt-0.5 font-display text-base font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10.5px] muted">
                <span>Daily target</span>
                <span>{formatMinutes(stats.minutes, true)} / {formatMinutes(stats.targetMinutes, true)}</span>
              </div>
              <ProgressBar value={stats.minutes / Math.max(1, stats.targetMinutes)} className="mt-1.5" />
            </div>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-between" onClick={() => void actions.syncChallengeProgress()}>
              Refresh challenge progress <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Focus protocol" subtitle="How this room protects your attention" />
            <ul className="mt-3 space-y-2.5 text-[11px] muted leading-relaxed">
              {[
                'The countdown is computed from timestamps, so throttled tabs and refreshes cannot skew your minutes.',
                'Only one session can be active at a time — duplicates are impossible by design.',
                'Breaks are separate from study time, so your analytics never inflate.',
                'Interruptions require a reason and never count as completed sessions.',
                'Screen wake lock is requested where supported; browsers may still sleep the display.',
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Pomodoro rhythm" action={<Badge tone="brand">{prefs?.sessions_before_long_break ?? 4} rounds</Badge>} />
            <div className="mt-3 space-y-2 text-[11px]">
              {[
                ['Focus', `${prefs?.default_focus_minutes ?? 25} min`],
                ['Short break', `${prefs?.break_minutes ?? 5} min`],
                ['Long break', `${prefs?.long_break_minutes ?? 20} min`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg border border-[var(--border)] surface-1 px-3 py-2">
                  <span className="muted">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ActiveSession() {
  const { data, prefs, today } = useApp()
  const focus = useFocus()
  const navigate = useNavigate()
  const session = focus.session!
  const [endOpen, setEndOpen] = useState(false)
  const [reason, setReason] = useState('distraction')
  const [note, setNote] = useState('')
  const [ending, setEnding] = useState(false)
  const modeInfo = FOCUS_MODES.find((m) => m.id === session.mode)!
  const stats = dayStats(data, today, prefs)
  const subject = focus.subject

  useEffect(() => {
    setEndOpen(false)
  }, [session.id])

  const endSession = async () => {
    setEnding(true)
    await focus.interrupt(reason, note.trim() || undefined)
    setEnding(false)
    setEndOpen(false)
    toast.info('Session ended early', `${formatMinutes(focus.elapsedSeconds / 60)} recorded as interrupted time.`)
    navigate('/')
  }

  const authorizedBreak = async () => {
    await focus.pause()
    focus.startBreak(prefs?.break_minutes ?? 5)
    toast.info('Authorized break started', 'The timer is paused. Your break time is not counted as study time.')
  }

  const pct = Math.round(focus.progress * 100)

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,108,255,0.16),transparent_65%)]" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={focus.paused ? 'warning' : 'success'} dot>
              {focus.paused ? 'Paused' : 'In focus'}
            </Badge>
            <Badge tone="brand">{modeInfo.label}</Badge>
            <span className="text-[11px] muted">Round {Math.max(1, Math.floor(stats.completedSessions / (prefs?.sessions_before_long_break ?? 4)) + 1)}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] muted">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-300" /> Commitment active
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="relative overflow-hidden p-5 sm:p-8">
            <div className="flex flex-col items-center">
              <Ring progress={focus.progress} size={Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 110 : 300)} stroke={12}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] soft">{focus.paused ? 'Paused' : 'Remaining'}</p>
                <AnimatedDigits seconds={focus.remainingSeconds} />
                <p className="mt-1 text-[11px] muted">
                  {formatSeconds(focus.elapsedSeconds)} elapsed · {pct}%
                </p>
                <div className="mt-3 flex items-center gap-1.5 rounded-full border border-[var(--border)] surface-1 px-2.5 py-1 text-[9.5px] muted">
                  <span className={cn('h-1.5 w-1.5 rounded-full', focus.paused ? 'bg-amber-400' : 'bg-emerald-400')} />
                  {focus.paused ? 'Timer paused — pause time excluded' : 'Timestamp engine live'}
                </div>
              </Ring>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {focus.paused ? (
                  <Button size="lg" onClick={() => void focus.resume()} icon={<Play className="h-4 w-4" />}>
                    Resume focus
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={() => void focus.pause()} icon={<Pause className="h-4 w-4" />}>
                    Pause
                  </Button>
                )}
                <Button size="lg" variant="secondary" onClick={authorizedBreak} icon={<Coffee className="h-4 w-4" />} disabled={focus.paused}>
                  Break
                </Button>
                <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] surface-1 p-1">
                  <span className="px-2 text-[10px] soft">Extend</span>
                  {[5, 10, 15].map((m) => (
                    <button key={m} onClick={() => void focus.extend(m)} className="rounded-lg px-2 py-1.5 text-[11px] font-semibold transition hover:surface-2">
                      +{m}
                    </button>
                  ))}
                </div>
                <Button size="lg" variant="danger" onClick={() => setEndOpen(true)} icon={<Square className="h-4 w-4" />}>
                  End session
                </Button>
              </div>

              <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
                {[
                  { label: 'Planned', value: formatMinutes(session.planned_minutes, true) },
                  { label: 'Elapsed', value: formatMinutes(focus.elapsedSeconds / 60, true) },
                  { label: 'Pauses', value: `${session.pauses.filter((p) => p.ended_at).length + (focus.paused ? 1 : 0)}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[var(--border)] surface-1 px-2.5 py-2 text-center">
                    <p className="text-[9px] uppercase tracking-wider soft">{s.label}</p>
                    <p className="mt-0.5 text-xs font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase"
                  style={{ backgroundColor: `${subjectColor(subject?.color).hex}1f`, color: subjectColor(subject?.color).hex }}
                >
                  {(subject?.name ?? 'GEN').slice(0, 3)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{subject?.name ?? 'General study'}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed muted">{session.topic ?? 'No specific objective set'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                  <ShieldCheck className="h-3 w-3" /> Focus Guardian
                </p>
                <p className="mt-1 text-[11px] leading-relaxed muted">
                  "I commit to focusing on this task until the session ends." Interruptions are logged with a reason and excluded from completed sessions.
                </p>
              </div>
              <div className="mt-3 space-y-1.5 text-[10.5px] muted">
                <div className="flex items-center justify-between">
                  <span>Planned end</span>
                  <span className="font-medium">{new Date(session.planned_end_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Started</span>
                  <span className="font-medium">{new Date(session.started_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Interruptions today</span>
                  <span className="font-medium">{stats.interruptedSessions}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeader title="Protect this block" />
              <ul className="mt-3 space-y-2 text-[11px] muted leading-relaxed">
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />Phone in another room, face down, or in a drawer.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />Close every tab that is not part of this objective.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-brand-400" />If a thought interrupts you, write it down and continue.</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />Water within reach. Posture upright. One objective.</li>
              </ul>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => navigate('/guardian')} icon={<Plus className="h-3.5 w-3.5" />}>
                Report a distraction after this block
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title="Are you sure you want to interrupt your focus session?"
        description="This is your device and your decision. FOCUSFORGE will simply record the truth."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEndOpen(false)}>
              Continue studying
            </Button>
            <Button variant="secondary" icon={<Coffee className="h-4 w-4" />} onClick={() => { setEndOpen(false); void authorizedBreak() }}>
              Authorized break
            </Button>
            <Button variant="danger" loading={ending} onClick={() => void endSession()} icon={<Square className="h-4 w-4" />}>
              End session
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 text-[11px] leading-relaxed muted">
            You have {formatSeconds(focus.remainingSeconds)} left of a {session.planned_minutes}-minute block. Ending now records {formatMinutes(focus.elapsedSeconds / 60)} as
            interrupted time — it will not count as a completed session or a missed target by itself.
          </div>
          <div>
            <span className="label">Reason for interruption</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                ['distraction', 'Distraction'],
                ['instagram', 'Instagram'],
                ['youtube', 'YouTube Shorts'],
                ['fatigue', 'Fatigue'],
                ['emergency', 'Emergency'],
                ['technical', 'Technical issue'],
                ['other', 'Other'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setReason(value)}
                  className={cn('rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition', reason === value ? 'border-rose-400/40 bg-rose-500/15 text-rose-300' : 'border-[var(--border)] surface-1 muted hover:surface-2')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What pulled you away?" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

export default function FocusRoom() {
  const focus = useFocus()
  const { today, prefs, data } = useApp()
  const stats = dayStats(data, today, prefs)
  const recent = useMemo(() => data.sessions.filter((s) => s.status !== 'active').slice(0, 5), [data.sessions])

  return (
    <div>
      {focus.session ? (
        <ActiveSession />
      ) : (
        <>
          <SetupPanel />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionHeader title="Recent sessions" subtitle="Completed and interrupted blocks" action={<Badge tone="neutral">{stats.completedSessions} today</Badge>} />
              {recent.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-[11px] muted">
                  No sessions yet. Your first completed block will appear here with its exact duration.
                </p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {recent.map((s) => {
                    const subject = data.subjects.find((x) => x.id === s.subject_id)
                    return (
                      <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] surface-1 px-2.5 py-2">
                        <span className={cn('h-1.5 w-1.5 rounded-full', s.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400')} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium">{s.topic ?? subject?.name ?? 'Focus session'}</p>
                          <p className="text-[9.5px] muted">
                            {new Date(s.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {s.status}
                          </p>
                        </div>
                        <span className="text-[10.5px] font-semibold">{formatMinutes(sessionSeconds(s) / 60, true)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <SectionHeader title="Focus score breakdown" subtitle="Transparent by design — no hidden formulas" />
              <div className="mt-3 space-y-2.5">
                {stats.scoreParts.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="muted">{p.label}</span>
                      <span className="font-medium">
                        {p.earned}/{p.max}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-400" style={{ width: `${(p.earned / p.max) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 text-[9.5px] soft">{p.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
