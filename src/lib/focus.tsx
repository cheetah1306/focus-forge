import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from './app-context'
import type { FocusSession, Subject } from './types'
import { activeSessionSeconds } from './metrics'
import { playChime, showBrowserNotification } from './notifications'

export type FocusMode = FocusSession['mode']

export interface ModeConfig {
  id: FocusMode
  label: string
  description: string
  focus: number
  break: number
  longBreak: number
  rounds: number
}

export const FOCUS_MODES: ModeConfig[] = [
  { id: 'pomodoro', label: 'Pomodoro', description: '25 min focus · 5 min break · long break every 4 rounds', focus: 25, break: 5, longBreak: 20, rounds: 4 },
  { id: 'deep', label: 'Deep Work', description: '50 min of uninterrupted, high-cognitive-load work', focus: 50, break: 10, longBreak: 25, rounds: 3 },
  { id: 'exam', label: 'Exam Prep', description: '90 min exam simulation with a 15 min recovery break', focus: 90, break: 15, longBreak: 30, rounds: 2 },
  { id: 'custom', label: 'Custom Study', description: 'Your own duration, subject and topic', focus: 25, break: 5, longBreak: 20, rounds: 4 },
  { id: 'emergency', label: 'Emergency', description: 'Too tired to start? Commit to 15 honest minutes.', focus: 15, break: 3, longBreak: 10, rounds: 4 },
]

export function modeConfig(mode: FocusMode): ModeConfig {
  return FOCUS_MODES.find((m) => m.id === mode) ?? FOCUS_MODES[0]
}

interface Mirror {
  sessionId: string
  beatAt: number
}

function readMirror(sessionId: string): Mirror | null {
  try {
    const raw = localStorage.getItem(`ff.active.${sessionId}`)
    return raw ? (JSON.parse(raw) as Mirror) : null
  } catch {
    return null
  }
}

function writeMirror(sessionId: string) {
  localStorage.setItem('ff.activeSessionId', sessionId)
  localStorage.setItem(`ff.active.${sessionId}`, JSON.stringify({ sessionId, beatAt: Date.now() }))
}

export function elapsedAt(session: FocusSession, at: number): number {
  const start = new Date(session.started_at).getTime()
  let paused = 0
  for (const p of session.pauses) {
    const ps = new Date(p.started_at).getTime()
    const pe = p.ended_at ? new Date(p.ended_at).getTime() : at
    if (ps <= at) paused += Math.max(0, Math.min(pe, at) - ps)
  }
  return Math.max(0, Math.floor((at - start - paused) / 1000))
}

export interface CompletionState {
  sessionId: string
  subjectName: string
  topic: string | null
  plannedMinutes: number
  actualSeconds: number
  mode: FocusMode
  completed: boolean
  breakMinutes: number
  round: number
  rounds: number
}

interface FocusContextValue {
  session: FocusSession | null
  subject: Subject | null
  paused: boolean
  elapsedSeconds: number
  remainingSeconds: number
  plannedSeconds: number
  progress: number
  completion: CompletionState | null
  breakRemaining: number
  breakTotal: number
  startBreak: (minutes: number) => void
  endBreak: () => void
  recoveryNotice: string | null
  dismissRecovery: () => void
  dismissCompletion: () => void
  start: (input: {
    mode: FocusMode
    minutes: number
    subjectId: string | null
    topic: string | null
    taskId?: string | null
    entryId?: string | null
  }) => Promise<FocusSession | null>
  pause: () => Promise<void>
  resume: () => Promise<void>
  extend: (minutes: number) => Promise<void>
  interrupt: (reason: string, note?: string) => Promise<void>
  reset: () => Promise<void>
  acknowledgeCompletion: () => void
}

const FocusContext = createContext<FocusContextValue | null>(null)

export function FocusProvider({ children }: { children: ReactNode }) {
  const app = useApp()
  const { data, prefs, actions } = app
  const [now, setNow] = useState(Date.now())
  const [completion, setCompletion] = useState<CompletionState | null>(null)
  const [breakState, setBreakState] = useState<{ endsAt: number; total: number } | null>(null)
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null)
  const finalizingRef = useRef<Set<string>>(new Set())
  const recoveredRef = useRef<Set<string>>(new Set())
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null)
  const lastDbBeat = useRef(0)

  const session = useMemo(() => data.sessions.find((s) => s.status === 'active') ?? null, [data.sessions])
  const subject = useMemo(
    () => (session?.subject_id ? data.subjects.find((s) => s.id === session.subject_id) ?? null : null),
    [data.subjects, session?.subject_id],
  )
  const paused = Boolean(session?.pauses.some((p) => !p.ended_at))
  const plannedSeconds = (session?.planned_minutes ?? 0) * 60
  const elapsedSeconds = session ? activeSessionSeconds(session, now) : 0
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds)
  const progress = plannedSeconds > 0 ? Math.min(1, elapsedSeconds / plannedSeconds) : 0

  /* tick */
  useEffect(() => {
    if (!session && !breakState) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [session?.id, session, breakState])

  const breakRemaining = breakState ? Math.max(0, Math.ceil((breakState.endsAt - now) / 1000)) : 0
  const breakTotal = breakState?.total ?? 0

  useEffect(() => {
    if (!breakState || breakRemaining > 0) return
    setBreakState(null)
    if (prefs?.sound_enabled) playChime('break')
    if (prefs?.notify.breaks) {
      void showBrowserNotification('Break over', 'Reset, hydrate, and start the next block.', 'break-over')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakRemaining, breakState])

  /* mirror + heartbeat */
  useEffect(() => {
    if (!session) return
    writeMirror(session.id)
    const beat = () => {
      writeMirror(session.id)
      if (Date.now() - lastDbBeat.current > 45_000) {
        lastDbBeat.current = Date.now()
        void actions.heartbeat(session.id)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(beat, 15_000)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [actions, session?.id, session])

  /* screen wake lock keeps the device from sleeping mid-session (best effort) */
  useEffect(() => {
    let cancelled = false
    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }
        if (!nav.wakeLock || document.visibilityState !== 'visible' || paused) return
        const lock = await nav.wakeLock.request('screen')
        if (cancelled) await lock.release()
        else wakeLockRef.current = lock
      } catch {
        /* unsupported or denied */
      }
    }
    if (session && !paused) request()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && session && !paused) request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
    }
  }, [session?.id, paused, session])

  /* document title reflects remaining time */
  useEffect(() => {
    if (!session) return
    const base = 'FOCUSFORGE'
    const m = Math.floor(remainingSeconds / 60)
    const s = remainingSeconds % 60
    document.title = paused ? `Paused · ${base}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} · ${base}`
    return () => {
      document.title = `${base} — Study Operating System`
    }
  }, [remainingSeconds, paused, session])

  /* recovery on load */
  useEffect(() => {
    if (!session || recoveredRef.current.has(session.id)) return
    recoveredRef.current.add(session.id)
    const mirror = readMirror(session.id)
    const sessionPaused = session.pauses.some((p) => !p.ended_at)
    const elapsedNow = elapsedAt(session, Date.now())
    const planned = session.planned_minutes * 60
    const plannedEnd = new Date(session.planned_end_at).getTime()
    const beatAt = mirror?.beatAt ?? new Date(session.last_heartbeat_at).getTime()

    const finish = async (status: 'completed' | 'interrupted', reason: string, seconds: number) => {
      if (finalizingRef.current.has(session.id)) return
      finalizingRef.current.add(session.id)
      if (prefs?.sound_enabled && status === 'completed') playChime('complete')
      await actions.finalizeSession(session, { status, reason, actualSeconds: seconds })
      if (status === 'completed') {
        void showBrowserNotification('Focus session complete', `${session.planned_minutes} minutes logged.`, `session-${session.id}`)
        setCompletion({
          sessionId: session.id,
          subjectName: subject?.name ?? 'General study',
          topic: session.topic,
          plannedMinutes: session.planned_minutes,
          actualSeconds: planned,
          mode: session.mode,
          completed: true,
          breakMinutes: modeConfig(session.mode).break,
          round: (data.sessions.filter((s) => s.status === 'completed').length % 4) + 1,
          rounds: 4,
        })
      } else {
        setRecoveryNotice(
          `Your last session was interrupted because the browser was closed. We recorded ${Math.round(
            seconds / 60,
          )} of ${session.planned_minutes} planned minutes — nothing was fabricated.`,
        )
      }
      void actions.syncChallengeProgress()
    }

    if (elapsedNow >= planned) {
      if (beatAt >= plannedEnd - 120_000) {
        void finish('completed', '', planned)
      } else {
        void finish('interrupted', 'browser_closed', Math.min(planned, elapsedAt(session, beatAt)))
      }
    } else if (!sessionPaused && mirror && Date.now() - mirror.beatAt > 10 * 60_000) {
      void finish('interrupted', 'browser_closed', elapsedAt(session, beatAt))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, prefs?.sound_enabled])

  /* completion when the countdown reaches zero */
  useEffect(() => {
    if (!session || paused || remainingSeconds > 0) return
    if (finalizingRef.current.has(session.id)) return
    finalizingRef.current.add(session.id)
    const finish = async () => {
      if (prefs?.sound_enabled) playChime('complete')
      await actions.finalizeSession(session, { status: 'completed', actualSeconds: plannedSeconds })
      void showBrowserNotification('Focus session complete', `${session.planned_minutes} minutes logged. Time for a break.`, `session-${session.id}`)
      const completedToday = data.sessions.filter(
        (s) => s.status === 'completed' && new Date(s.started_at).toDateString() === new Date().toDateString(),
      ).length
      const config = modeConfig(session.mode)
      setCompletion({
        sessionId: session.id,
        subjectName: subject?.name ?? 'General study',
        topic: session.topic,
        plannedMinutes: session.planned_minutes,
        actualSeconds: plannedSeconds,
        mode: session.mode,
        completed: true,
        breakMinutes:
          completedToday > 0 && completedToday % (prefs?.sessions_before_long_break ?? config.rounds) === 0
            ? prefs?.long_break_minutes ?? config.longBreak
            : prefs?.break_minutes ?? config.break,
        round: (completedToday % (prefs?.sessions_before_long_break ?? config.rounds)) + 1,
        rounds: prefs?.sessions_before_long_break ?? config.rounds,
      })
      void actions.syncChallengeProgress()
    }
    void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, paused, session?.id])

  const start = useCallback<FocusContextValue['start']>(
    async ({ mode, minutes, subjectId, topic, taskId, entryId }) => {
      const planned = Math.max(1, Math.round(minutes))
      const created = await actions.startSession({ subjectId, topic, mode, plannedMinutes: planned, taskId, entryId })
      if (created) {
        setNow(Date.now())
        setCompletion(null)
        setBreakState(null)
        writeMirror(created.id)
        lastDbBeat.current = Date.now()
        if (prefs?.sound_enabled) playChime('start')
        if (prefs?.notify.session_end) {
          // Permission is requested explicitly from Settings / Focus Room; only notify if already granted.
          void showBrowserNotification('Focus session started', `${planned} minutes · ${topic ?? 'Deep focus'}`, `start-${created.id}`)
        }
      }
      return created
    },
    [actions, prefs?.sound_enabled, prefs?.notify.session_end],
  )

  const pause = useCallback(async () => {
    if (!session || paused) return
    await actions.pauseSession(session)
    setNow(Date.now())
  }, [actions, paused, session])

  const resume = useCallback(async () => {
    if (!session || !paused) return
    await actions.resumeSession(session)
    setNow(Date.now())
  }, [actions, paused, session])

  const extend = useCallback(
    async (minutes: number) => {
      if (!session) return
      const nextMinutes = session.planned_minutes + minutes
      await actions.patchSession(session.id, {
        planned_minutes: nextMinutes,
        planned_end_at: new Date(new Date(session.planned_end_at).getTime() + minutes * 60000).toISOString(),
      })
      setNow(Date.now())
    },
    [actions, session],
  )

  const interrupt = useCallback(
    async (reason: string, note?: string) => {
      if (!session) return
      if (finalizingRef.current.has(session.id)) return
      finalizingRef.current.add(session.id)
      const elapsed = elapsedAt(session, Date.now())
      setBreakState(null)
      await actions.finalizeSession(session, { status: 'interrupted', reason, note, actualSeconds: elapsed })
      void actions.syncChallengeProgress()
    },
    [actions, session],
  )

  const reset = useCallback(async () => {
    if (!session) return
    await interrupt('reset', 'Session reset by user')
    setCompletion(null)
  }, [interrupt, session])

  const dismissCompletion = useCallback(() => setCompletion(null), [])
  const acknowledgeCompletion = useCallback(() => setCompletion(null), [])

  const value: FocusContextValue = {
    session,
    subject,
    paused,
    elapsedSeconds,
    remainingSeconds,
    plannedSeconds,
    progress,
    completion,
    breakRemaining,
    breakTotal,
    startBreak: (minutes: number) => setBreakState({ endsAt: Date.now() + minutes * 60000, total: minutes * 60 }),
    endBreak: () => setBreakState(null),
    recoveryNotice,
    dismissRecovery: () => setRecoveryNotice(null),
    dismissCompletion,
    start,
    pause,
    resume,
    extend,
    interrupt,
    reset,
    acknowledgeCompletion,
  }

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error('useFocus must be used inside FocusProvider')
  return ctx
}

