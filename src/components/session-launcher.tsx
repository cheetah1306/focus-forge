import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, Play, ShieldCheck } from 'lucide-react'
import { useApp } from '../lib/app-context'
import { FOCUS_MODES, useFocus, type FocusMode } from '../lib/focus'
import { addMinutesToTime, cn, formatMinutes, subjectColor } from '../lib/utils'
import { Button, Field, Input, Modal, Select } from './ui'
import { toast } from '../lib/events'

const QUICK_DURATIONS = [15, 25, 30, 45, 50, 60, 90]

export interface LaunchContext {
  subjectId?: string | null
  topic?: string | null
  minutes?: number
  mode?: FocusMode
  taskId?: string | null
  entryId?: string | null
}

export function SessionLauncher({
  open,
  onClose,
  context,
}: {
  open: boolean
  onClose: () => void
  context?: LaunchContext
}) {
  const { data, prefs, actions } = useApp()
  const focus = useFocus()
  const navigate = useNavigate()
  const [mode, setMode] = useState<FocusMode>('pomodoro')
  const [minutes, setMinutes] = useState<number>(25)
  const [custom, setCustom] = useState('')
  const [subjectId, setSubjectId] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [taskId, setTaskId] = useState<string>('')
  const [note, setNote] = useState('')
  const [committed, setCommitted] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    const baseMode = context?.mode ?? 'custom'
    setMode(baseMode)
    setMinutes(context?.minutes ?? prefs?.default_focus_minutes ?? 25)
    setSubjectId(context?.subjectId ?? data.subjects[0]?.id ?? '')
    setTopic(context?.topic ?? '')
    setTaskId(context?.taskId ?? '')
    setNote('')
    setCommitted(false)
    setCustom('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selectedSubject = data.subjects.find((s) => s.id === subjectId)
  const availableTasks = useMemo(
    () => data.tasks.filter((t) => t.status === 'pending' && (!subjectId || t.subject_id === subjectId)),
    [data.tasks, subjectId],
  )
  const endTime = addMinutesToTime(new Date().toTimeString().slice(0, 5), minutes)

  const start = async () => {
    if (focus.session) {
      onClose()
      navigate('/focus')
      return
    }
    if (!committed) {
      toast.warning('Commitment required', 'Confirm your focus commitment to start the session.')
      return
    }
    setStarting(true)
    try {
      const created = await focus.start({
        mode,
        minutes,
        subjectId: subjectId || null,
        topic: topic.trim() || null,
        taskId: taskId || null,
        entryId: context?.entryId ?? null,
      })
      if (created) {
        if (note.trim()) void actions.patchSession(created.id, { note: note.trim() })
        toast.success('Session started', `${minutes} focused minutes. Distractions can wait.`)
        onClose()
        navigate('/focus')
      }
    } catch (err) {
      toast.error('Could not start session', err instanceof Error ? err.message : undefined)
    } finally {
      setStarting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={focus.session ? 'A session is already running' : 'Start a focus session'}
      description={focus.session ? 'FOCUSFORGE only tracks one focus session at a time.' : 'Configure the block, commit to it, and begin.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void start()}
            loading={starting}
            disabled={!committed}
            icon={<Play className="h-4 w-4" />}
          >
            {focus.session ? 'Open focus room' : `Start ${minutes}-minute session`}
          </Button>
        </>
      }
    >
      {focus.session ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Session already active
          </p>
          <p className="mt-1 text-xs muted">
            End or complete the current session before starting another. This prevents duplicate session records and keeps your analytics honest.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <span className="label">Focus mode</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {FOCUS_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id)
                    setMinutes(m.focus)
                  }}
                  className={cn(
                    'relative rounded-xl border p-2.5 text-left transition-colors',
                    mode === m.id ? 'border-brand-400/50 bg-brand-500/10' : 'border-[var(--border)] surface-1 hover:surface-2',
                  )}
                >
                  <span className="block text-[11px] font-semibold">{m.label}</span>
                  <span className="mt-0.5 block text-[9.5px] muted">{m.focus}m focus</span>
                  {mode === m.id && <motion.span layoutId="mode-check" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] soft">{FOCUS_MODES.find((m) => m.id === mode)?.description}</p>
          </div>

          <div>
            <span className="label">Duration</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setMinutes(d)
                    setCustom('')
                  }}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                    minutes === d ? 'border-brand-400/50 bg-brand-500/15 text-brand-200' : 'border-[var(--border)] surface-1 muted hover:surface-2',
                  )}
                >
                  {d}m
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={300}
                  placeholder="Custom"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value)
                    const n = Number(e.target.value)
                    if (n >= 1 && n <= 300) setMinutes(n)
                  }}
                  className="field-sm w-24"
                />
                <span className="text-[10px] soft">min</span>
              </div>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] soft">
              <Clock className="h-3 w-3" /> Planned end ≈ {endTime} · breaks are not counted as study time
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
            <Field label="Topic / objective" hint="What exactly will you finish in this block?">
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Thermo — entropy problems 4–12" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link a study task (optional)">
              <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No linked task</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Session note (optional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to remember later" />
            </Field>
          </div>

          {selectedSubject && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] surface-1 px-3 py-2 text-[11px] muted">
              <span className={cn('h-2 w-2 rounded-full', subjectColor(selectedSubject.color).dot)} />
              {selectedSubject.name}
              {selectedSubject.code ? ` · ${selectedSubject.code}` : ''}
              <span className="ml-auto">Daily target {formatMinutes(prefs?.daily_target_minutes ?? 240, true)}</span>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-400/25 bg-brand-500/[0.06] p-3.5">
            <input type="checkbox" checked={committed} onChange={(e) => setCommitted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5b8cff]" />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-300" /> Focus Guardian commitment
              </span>
              <span className="mt-0.5 block text-[11px] muted leading-relaxed">
                I commit to focusing on this task until the session ends. If I stop early, FOCUSFORGE will record the interruption honestly — it will not count as a
                completed session.
              </span>
            </span>
          </label>
        </div>
      )}
    </Modal>
  )
}
