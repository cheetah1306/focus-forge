import { useCallback, useEffect, useRef, useState } from 'react'
import { backend } from './backend'
import type {
  AppNotification,
  AppUser,
  DailyChallengeProgress,
  Dataset,
  DistractionLog,
  ExamSchedule,
  FocusSession,
  Profile,
  SessionInterruption,
  StudyChallenge,
  StudyResource,
  StudyTask,
  Subject,
  TimetableEntry,
  Topic,
  Unit,
  UserPreferences,
} from './types'
import { toast } from './events'
import { achievementState, activeChallenge, challengeMetrics, dayStats, DEFAULT_PREFS } from './metrics'
import { todayKey, uid } from './utils'
import { emptyDataset } from './backend'

interface AppState {
  ready: boolean
  loadingError: string | null
  user: AppUser | null
  data: Dataset
}

function sortDataset(d: Dataset): Dataset {
  return {
    ...d,
    subjects: [...d.subjects].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    units: [...d.units].sort((a, b) => a.position - b.position),
    topics: [...d.topics].sort((a, b) => a.position - b.position),
    tasks: [...d.tasks].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
      return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999')
    }),
    entries: [...d.entries].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    sessions: [...d.sessions].sort((a, b) => b.started_at.localeCompare(a.started_at)),
    exams: [...d.exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date)),
    notifications: [...d.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}

export function useAppStore() {
  const [state, setState] = useState<AppState>({ ready: false, loadingError: null, user: null, data: emptyDataset() })
  const [celebrationQueue, setCelebrationQueue] = useState<string[]>([])
  const loadingRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const load = useCallback(async (user: AppUser) => {
    if (loadingRef.current) return
    loadingRef.current = true
    try {
      const data = sortDataset(await backend.loadDataset(user.id))
      let prefs = data.preferences
      if (!prefs) {
        prefs = { ...DEFAULT_PREFS, user_id: user.id, updated_at: new Date().toISOString() }
        await backend.updatePreferences(user.id, prefs)
      }
      const next = sortDataset({ ...data, preferences: prefs })
      setState({ ready: true, loadingError: null, user, data: next })
    } catch (err) {
      setState((s) => ({ ...s, ready: true, loadingError: err instanceof Error ? err.message : 'Could not load your workspace.' }))
    } finally {
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    backend.getInitialUser().then((user) => {
      if (cancelled) return
      if (user) load(user)
      else setState((s) => ({ ...s, ready: true, user: null }))
    })
    const unsub = backend.onAuthChange((user) => {
      if (user) load(user)
      else setState({ ready: true, loadingError: null, user: null, data: emptyDataset() })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [load])

  const user = state.user
  const data = state.data
  const prefs = data.preferences
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)

  const patchDataset = useCallback((fn: (d: Dataset) => Dataset) => {
    setState((s) => ({ ...s, data: fn(s.data) }))
  }, [])

  /* ---------------------------- generic helpers --------------------------- */

  const insert = useCallback(
    async <T extends { id: string }>(table: string, row: T, apply: (d: Dataset, row: T) => Dataset) => {
      if (!user) throw new Error('Not signed in')
      const created = await backend.insert(table, { ...row, user_id: user.id })
      patchDataset((d) => apply(d, created))
      return created
    },
    [patchDataset, user],
  )

  const update = useCallback(
    async <T extends { id: string }>(table: string, id: string, patch: Partial<T>, apply: (d: Dataset) => Dataset) => {
      await backend.update<T>(table, id, patch as Record<string, unknown>)
      patchDataset(apply)
    },
    [patchDataset],
  )

  const remove = useCallback(
    async (table: string, id: string, apply: (d: Dataset) => Dataset) => {
      await backend.remove(table, id)
      patchDataset(apply)
    },
    [patchDataset],
  )

  const notify = useCallback(
    async (n: Omit<AppNotification, 'id' | 'user_id' | 'created_at' | 'read'>) => {
      if (!user) return
      try {
        const row: AppNotification = {
          ...n,
          id: uid(),
          user_id: user.id,
          read: false,
          created_at: new Date().toISOString(),
        }
        await backend.insert('notifications', row)
        patchDataset((d) => ({ ...d, notifications: [row, ...d.notifications] }))
      } catch {
        /* notifications are non-critical */
      }
    },
    [patchDataset, user],
  )

  /* ------------------------------- profile -------------------------------- */

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!state.user) return
      const next = await backend.updateProfile(state.user.id, patch)
      patchDataset((d) => ({ ...d, profile: next }))
    },
    [patchDataset, state.user],
  )

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      if (!state.user) return
      const merged = { ...(prefs as UserPreferences), ...patch }
      patchDataset((d) => ({ ...d, preferences: merged }))
      try {
        const saved = await backend.updatePreferences(state.user.id, patch)
        patchDataset((d) => ({ ...d, preferences: saved }))
      } catch (err) {
        toast.error('Could not save settings', err instanceof Error ? err.message : undefined)
      }
    },
    [patchDataset, prefs, state.user],
  )

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return
      const { url, error } = await backend.uploadAvatar(user.id, file)
      if (error || !url) {
        toast.error('Upload failed', error)
        return
      }
      await updateProfile({ avatar_url: url })
      toast.success('Profile photo updated')
    },
    [updateProfile, user],
  )

  /* ------------------------------- subjects ------------------------------- */

  const addSubject = useCallback(
    async (input: { name: string; code?: string; color?: Subject['color'] }) => {
      if (!user) return null
      const row: Subject = {
        id: uid(),
        user_id: user.id,
        name: input.name.trim(),
        code: input.code?.trim() || null,
        color: input.color ?? 'blue',
        position: data.subjects.length,
        created_at: new Date().toISOString(),
      }
      await insert<Subject>('subjects', row, (d, r) => ({ ...d, subjects: [...d.subjects, r] }))
      return row
    },
    [data.subjects.length, insert, user],
  )

  const updateSubject = useCallback(
    async (id: string, patch: Partial<Subject>) => {
      await update<Subject>('subjects', id, patch, (d) => ({
        ...d,
        subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }))
    },
    [update],
  )

  const deleteSubject = useCallback(
    async (id: string) => {
      await backend.remove('subjects', id)
      patchDataset((d) => ({
        ...d,
        subjects: d.subjects.filter((s) => s.id !== id),
        units: d.units.filter((u) => u.subject_id !== id),
        topics: d.topics.filter((t) => t.subject_id !== id),
        tasks: d.tasks.map((t) => (t.subject_id === id ? { ...t, subject_id: null, unit_id: null, topic_id: null } : t)),
        entries: d.entries.filter((e) => e.subject_id !== id),
        exams: d.exams.map((e) => (e.subject_id === id ? { ...e, subject_id: null } : e)),
        sessions: d.sessions.map((s) => (s.subject_id === id ? { ...s, subject_id: null } : s)),
      }))
    },
    [patchDataset],
  )

  const addUnit = useCallback(
    async (subjectId: string, name: string, topicNames: string[] = []) => {
      if (!user) return null
      const now = new Date().toISOString()
      const unit: Unit = {
        id: uid(),
        user_id: user.id,
        subject_id: subjectId,
        name: name.trim() || `Unit ${data.units.filter((u) => u.subject_id === subjectId).length + 1}`,
        position: data.units.filter((u) => u.subject_id === subjectId).length,
        created_at: now,
      }
      await insert<Unit>('units', unit, (d, r) => ({ ...d, units: [...d.units, r] }))
      const createdTopics: Topic[] = []
      for (const [i, topicName] of topicNames.entries()) {
        if (!topicName.trim()) continue
        const topic: Topic = {
          id: uid(),
          user_id: user.id,
          subject_id: subjectId,
          unit_id: unit.id,
          name: topicName.trim(),
          status: 'not_started',
          position: i,
          created_at: now,
          updated_at: now,
        }
        createdTopics.push(topic)
        await insert<Topic>('topics', topic, (d, r) => ({ ...d, topics: [...d.topics, r] }))
      }
      return unit
    },
    [data.units, insert, user],
  )

  const deleteUnit = useCallback(
    async (id: string) => {
      await backend.remove('units', id)
      patchDataset((d) => ({
        ...d,
        units: d.units.filter((u) => u.id !== id),
        topics: d.topics.filter((t) => t.unit_id !== id),
      }))
    },
    [patchDataset],
  )

  const addTopic = useCallback(
    async (unitId: string, subjectId: string, name: string) => {
      if (!user) return
      const now = new Date().toISOString()
      const topic: Topic = {
        id: uid(),
        user_id: user.id,
        subject_id: subjectId,
        unit_id: unitId,
        name: name.trim(),
        status: 'not_started',
        position: data.topics.filter((t) => t.unit_id === unitId).length,
        created_at: now,
        updated_at: now,
      }
      await insert<Topic>('topics', topic, (d, r) => ({ ...d, topics: [...d.topics, r] }))
    },
    [data.topics, insert, user],
  )

  const updateTopic = useCallback(
    async (id: string, patch: Partial<Topic>) => {
      await update<Topic>('topics', id, { ...patch, updated_at: new Date().toISOString() }, (d) => ({
        ...d,
        topics: d.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
    },
    [update],
  )

  const deleteTopic = useCallback(
    async (id: string) => {
      await remove('topics', id, (d) => ({ ...d, topics: d.topics.filter((t) => t.id !== id) }))
    },
    [remove],
  )

  /* --------------------------------- tasks -------------------------------- */

  const addTask = useCallback(
    async (input: Omit<StudyTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'completed_at' | 'actual_minutes'>) => {
      if (!user) return null
      const now = new Date().toISOString()
      const task: StudyTask = {
        ...input,
        id: uid(),
        user_id: user.id,
        status: 'pending',
        completed_at: null,
        actual_minutes: 0,
        created_at: now,
        updated_at: now,
      }
      await insert<StudyTask>('study_tasks', task, (d, r) => ({ ...d, tasks: [...d.tasks, r] }))
      return task
    },
    [insert, user],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<StudyTask>) => {
      await update<StudyTask>('study_tasks', id, { ...patch, updated_at: new Date().toISOString() }, (d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
    },
    [update],
  )

  const setTaskStatus = useCallback(
    async (id: string, status: StudyTask['status']) => {
      const now = new Date().toISOString()
      const patch: Partial<StudyTask> = {
        status,
        completed_at: status === 'completed' ? now : null,
        updated_at: now,
      }
      await update<StudyTask>('study_tasks', id, patch, (d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
      if (status === 'completed') toast.success('Task completed', 'Subject progress updated.')
    },
    [update],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      await remove('study_tasks', id, (d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
    },
    [remove],
  )

  /* ------------------------------- timetable ------------------------------ */

  const addEntry = useCallback(
    async (input: Omit<TimetableEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => {
      if (!user) return null
      const now = new Date().toISOString()
      const entry: TimetableEntry = { ...input, id: uid(), user_id: user.id, status: 'pending', created_at: now, updated_at: now }
      await insert<TimetableEntry>('timetable_entries', entry, (d, r) => ({ ...d, entries: [...d.entries, r] }))
      return entry
    },
    [insert, user],
  )

  const updateEntry = useCallback(
    async (id: string, patch: Partial<TimetableEntry>) => {
      await update<TimetableEntry>('timetable_entries', id, { ...patch, updated_at: new Date().toISOString() }, (d) => ({
        ...d,
        entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
    },
    [update],
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      await remove('timetable_entries', id, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }))
    },
    [remove],
  )

  /* -------------------------------- sessions ------------------------------ */

  const startSession = useCallback(
    async (input: {
      subjectId: string | null
      topic: string | null
      mode: FocusSession['mode']
      plannedMinutes: number
      taskId?: string | null
      entryId?: string | null
    }) => {
      if (!user) return null
      const existing = data.sessions.find((s) => s.status === 'active')
      if (existing) throw new Error('A focus session is already active.')
      const now = new Date().toISOString()
      const session: FocusSession = {
        id: uid(),
        user_id: user.id,
        subject_id: input.subjectId,
        topic: input.topic,
        mode: input.mode,
        planned_minutes: input.plannedMinutes,
        started_at: now,
        planned_end_at: new Date(Date.now() + input.plannedMinutes * 60000).toISOString(),
        ended_at: null,
        actual_seconds: 0,
        pause_seconds: 0,
        pauses: [],
        status: 'active',
        interruption_reason: null,
        task_id: input.taskId ?? null,
        entry_id: input.entryId ?? null,
        note: null,
        last_heartbeat_at: now,
        created_at: now,
      }
      await insert<FocusSession>('focus_sessions', session, (d, r) => ({ ...d, sessions: [r, ...d.sessions] }))
      return session
    },
    [data.sessions, insert, user],
  )

  const finalizeSession = useCallback(
    async (
      session: FocusSession,
      outcome: { status: 'completed' | 'interrupted'; reason?: string; note?: string; actualSeconds: number },
    ) => {
      const now = new Date().toISOString()
      const patch: Partial<FocusSession> = {
        status: outcome.status,
        ended_at: now,
        actual_seconds: Math.round(outcome.actualSeconds),
        interruption_reason: outcome.reason ?? null,
        note: outcome.note ?? null,
      }
      const closedPauses = session.pauses.map((p) => (p.ended_at ? p : { ...p, ended_at: now }))
      const pauseSeconds =
        session.pause_seconds +
        session.pauses.filter((p) => !p.ended_at).reduce((sum, p) => sum + Math.max(0, Date.now() - new Date(p.started_at).getTime()), 0)
      patch.pauses = closedPauses
      patch.pause_seconds = Math.round(pauseSeconds)

      await backend.update('focus_sessions', session.id, patch)
      patchDataset((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === session.id ? { ...s, ...patch } : s)),
      }))

      if (outcome.status === 'interrupted') {
        const interruption: SessionInterruption = {
          id: uid(),
          user_id: session.user_id,
          session_id: session.id,
          planned_minutes: session.planned_minutes,
          actual_minutes: Math.round(outcome.actualSeconds / 60),
          reason: outcome.reason ?? 'interrupted',
          note: outcome.note ?? null,
          created_at: now,
        }
        await insert<SessionInterruption>('session_interruptions', interruption, (d, r) => ({ ...d, interruptions: [...d.interruptions, r] }))
      }

      if (session.task_id) {
        const task = data.tasks.find((t) => t.id === session.task_id)
        if (task) {
          const minutes = Math.round(outcome.actualSeconds / 60)
          await backend.update('study_tasks', task.id, {
            actual_minutes: task.actual_minutes + minutes,
            updated_at: now,
          })
          patchDataset((d) => ({
            ...d,
            tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, actual_minutes: t.actual_minutes + minutes } : t)),
          }))
        }
      }

      // Reflect the outcome on the timetable entry that launched this session.
      const linkedEntry = session.entry_id ? data.entries.find((e) => e.id === session.entry_id) : null
      if (linkedEntry) {
        await backend.update('timetable_entries', linkedEntry.id, { status: 'completed', updated_at: now })
        patchDataset((d) => ({
          ...d,
          entries: d.entries.map((e) => (e.id === linkedEntry.id ? { ...e, status: 'completed' } : e)),
        }))
      }

      localStorage.removeItem(`ff.active.${session.id}`)
      localStorage.removeItem('ff.activeSessionId')

      if (outcome.status === 'completed') {
        await notify({
          type: 'session',
          title: 'Focus session complete',
          body: `${session.planned_minutes} minutes logged${session.topic ? ` · ${session.topic}` : ''}.`,
          link: '/analytics',
        })
        toast.success('Session recorded', `${session.planned_minutes} focused minutes added to your analytics.`)
      } else {
        await notify({
          type: 'session',
          title: 'Session interrupted',
          body: `You studied ${Math.round(outcome.actualSeconds / 60)} of ${session.planned_minutes} planned minutes.`,
          link: '/distractions',
        })
      }
    },
    [data.entries, data.tasks, insert, notify, patchDataset],
  )

  const resumeSession = useCallback(
    async (session: FocusSession) => {
      const now = new Date().toISOString()
      const openPause = session.pauses.find((p) => !p.ended_at)
      if (!openPause) return
      const extra = Math.max(0, Date.now() - new Date(openPause.started_at).getTime())
      const patch: Partial<FocusSession> = {
        pauses: session.pauses.map((p) => (p.ended_at ? p : { ...p, ended_at: now })),
        pause_seconds: session.pause_seconds + Math.round(extra / 1000),
        last_heartbeat_at: now,
      }
      await backend.update('focus_sessions', session.id, patch)
      patchDataset((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === session.id ? { ...s, ...patch } : s)),
      }))
    },
    [patchDataset],
  )

  const pauseSession = useCallback(
    async (session: FocusSession) => {
      const now = new Date().toISOString()
      const patch: Partial<FocusSession> = {
        pauses: [...session.pauses, { started_at: now, ended_at: null }],
        last_heartbeat_at: now,
      }
      await backend.update('focus_sessions', session.id, patch)
      patchDataset((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === session.id ? { ...s, ...patch } : s)),
      }))
    },
    [patchDataset],
  )

  const patchSession = useCallback(
    async (sessionId: string, patch: Partial<FocusSession>) => {
      await backend.update('focus_sessions', sessionId, patch)
      patchDataset((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
      }))
    },
    [patchDataset],
  )

  const heartbeat = useCallback(
    async (sessionId: string, extra?: Partial<FocusSession>) => {
      const now = new Date().toISOString()
      const active = stateRef.current.data.sessions.find((s) => s.id === sessionId)
      if (!active || active.status !== 'active') return
      const patch = { last_heartbeat_at: now, ...extra }
      try {
        await backend.update('focus_sessions', sessionId, patch)
      } catch {
        /* heartbeat is best-effort */
      }
      patchDataset((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
      }))
    },
    [patchDataset],
  )

  /* ------------------------------- daily goals ---------------------------- */

  const saveDailyGoal = useCallback(
    async (date: string, targetMinutes: number, targetSessions: number, targetTasks: number, note?: string) => {
      if (!user) return
      const existing = data.dailyGoals.find((g) => g.date === date)
      if (existing) {
        const patch = { target_minutes: targetMinutes, target_sessions: targetSessions, target_tasks: targetTasks, note: note ?? existing.note }
        await backend.update('daily_goals', existing.id, patch)
        patchDataset((d) => ({ ...d, dailyGoals: d.dailyGoals.map((g) => (g.id === existing.id ? { ...g, ...patch } : g)) }))
      } else {
        const row = {
          id: uid(),
          user_id: user.id,
          date,
          target_minutes: targetMinutes,
          target_sessions: targetSessions,
          target_tasks: targetTasks,
          note: note ?? null,
          created_at: new Date().toISOString(),
        }
        await insert('daily_goals', row, (d, r) => ({ ...d, dailyGoals: [...d.dailyGoals, r] }))
      }
    },
    [data.dailyGoals, insert, patchDataset, user],
  )

  /* -------------------------------- exams --------------------------------- */

  const addExam = useCallback(
    async (input: Omit<ExamSchedule, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) return
      const row: ExamSchedule = { ...input, id: uid(), user_id: user.id, created_at: new Date().toISOString() }
      await insert<ExamSchedule>('exam_schedule', row, (d, r) => ({ ...d, exams: [...d.exams, r] }))
      toast.success('Exam added', `${input.name} is now in your countdown.`)
    },
    [insert, user],
  )

  const updateExam = useCallback(
    async (id: string, patch: Partial<ExamSchedule>) => {
      await update<ExamSchedule>('exam_schedule', id, patch, (d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
    },
    [update],
  )

  const deleteExam = useCallback(
    async (id: string) => {
      await remove('exam_schedule', id, (d) => ({ ...d, exams: d.exams.filter((e) => e.id !== id) }))
    },
    [remove],
  )

  /* -------------------------------- challenge ----------------------------- */

  const createChallenge = useCallback(
    async (input: { name: string; startDate: string; days: number; dailyHours: number; weeklyRevisionTarget: number; subjectPriorities: string[] }) => {
      if (!user) return
      const start = input.startDate
      const end = new Date(`${start}T12:00:00`)
      end.setDate(end.getDate() + input.days - 1)
      const endKey = end.toISOString().slice(0, 10)
      const previous = data.challenges.filter((c) => c.active)
      for (const c of previous) {
        await backend.update('study_challenges', c.id, { active: false })
      }
      const row: StudyChallenge = {
        id: uid(),
        user_id: user.id,
        name: input.name,
        start_date: start,
        end_date: endKey,
        daily_hours: input.dailyHours,
        weekly_revision_target: input.weeklyRevisionTarget,
        subject_priorities: input.subjectPriorities,
        active: true,
        created_at: new Date().toISOString(),
      }
      patchDataset((d) => ({ ...d, challenges: d.challenges.map((c) => (c.active ? { ...c, active: false } : c)) }))
      await insert<StudyChallenge>('study_challenges', row, (d, r) => ({ ...d, challenges: [...d.challenges, r] }))
      toast.success('Challenge armed', `${input.days}-day challenge starts ${start}.`)
    },
    [data.challenges, insert, patchDataset, user],
  )

  const updateChallenge = useCallback(
    async (id: string, patch: Partial<StudyChallenge>) => {
      await update<StudyChallenge>('study_challenges', id, patch, (d) => ({
        ...d,
        challenges: d.challenges.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    [update],
  )

  /* ------------------------------ distractions ---------------------------- */

  const logDistraction = useCallback(
    async (platform: DistractionLog['platform'], minutes: number, note?: string, date?: string) => {
      if (!user) return
      const row: DistractionLog = {
        id: uid(),
        user_id: user.id,
        date: date ?? today,
        platform,
        minutes: Math.max(1, Math.round(minutes)),
        note: note?.trim() || null,
        created_at: new Date().toISOString(),
      }
      await insert<DistractionLog>('distraction_logs', row, (d, r) => ({ ...d, distractions: [...d.distractions, r] }))
      toast.warning('Distraction logged', `${row.minutes} minutes of ${platform} recorded. Awareness is step one.`)
    },
    [insert, today, user],
  )

  const deleteDistraction = useCallback(
    async (id: string) => {
      await remove('distraction_logs', id, (d) => ({ ...d, distractions: d.distractions.filter((x) => x.id !== id) }))
    },
    [remove],
  )

  /* ------------------------------ notifications --------------------------- */

  const markNotificationRead = useCallback(
    async (id: string) => {
      await update<AppNotification>('notifications', id, { read: true }, (d) => ({
        ...d,
        notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
    },
    [update],
  )

  const markAllNotificationsRead = useCallback(async () => {
    const unread = data.notifications.filter((n) => !n.read)
    await Promise.all(unread.map((n) => backend.update('notifications', n.id, { read: true })))
    patchDataset((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }))
  }, [data.notifications, patchDataset])

  /* -------------------------------- resources ----------------------------- */

  const uploadResource = useCallback(
    async (subjectId: string, file: File) => {
      if (!user) return
      const { resource, error } = await backend.uploadResource(user.id, subjectId, file)
      if (error || !resource) {
        toast.error('Upload failed', error)
        return
      }
      await insert<StudyResource>('study_resources', resource, (d, r) => ({ ...d, resources: [...d.resources, r] }))
      toast.success('Document uploaded', resource.name)
    },
    [insert, user],
  )

  const deleteResource = useCallback(
    async (id: string) => {
      await remove('study_resources', id, (d) => ({ ...d, resources: d.resources.filter((r) => r.id !== id) }))
    },
    [remove],
  )

  /* -------------------------------- challenge sync ------------------------ */

  const syncChallengeProgress = useCallback(async () => {
    if (!user) return
    const challenge = activeChallenge(stateRef.current.data)
    if (!challenge) return
    const current = stateRef.current.data
    const metrics = challengeMetrics(current, prefs)
    if (!metrics.challenge) return
    const rows: DailyChallengeProgress[] = []
    for (const day of metrics.days) {
      if (day.date > today) continue
      const stats = dayStats(current, day.date, prefs)
      const existing = current.challengeProgress.find((p) => p.challenge_id === challenge.id && p.date === day.date)
      const status: DailyChallengeProgress['status'] =
        day.date === today ? (stats.minutes >= stats.targetMinutes && stats.minutes > 0 ? 'completed' : 'pending') : day.status === 'completed' ? 'completed' : 'missed'
      rows.push({
        id: existing?.id ?? uid(),
        user_id: user.id,
        challenge_id: challenge.id,
        date: day.date,
        day_number: day.dayNumber,
        target_minutes: stats.targetMinutes,
        studied_minutes: Math.round(stats.minutes),
        sessions_completed: stats.completedSessions,
        tasks_completed: stats.tasksCompleted,
        status,
        focus_score: stats.focusScore,
        report: {
          studied_minutes: Math.round(stats.minutes),
          target_minutes: stats.targetMinutes,
          sessions_completed: stats.completedSessions,
          sessions_interrupted: stats.interruptedSessions,
          tasks_completed: stats.tasksCompleted,
          distraction_minutes: stats.distractionMinutes,
          focus_score: stats.focusScore,
          summary:
            stats.minutes >= stats.targetMinutes
              ? 'Target met. This day counts toward your challenge.'
              : `${Math.max(0, Math.round(stats.targetMinutes - stats.minutes))} minutes short of target.`,
        },
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
    for (const row of rows) {
      const existing = current.challengeProgress.find((p) => p.challenge_id === row.challenge_id && p.date === row.date)
      if (existing && existing.status === row.status && existing.studied_minutes === row.studied_minutes) continue
      try {
        await backend.upsertChallengeProgress(row)
        patchDataset((d) => ({
          ...d,
          challengeProgress: existing
            ? d.challengeProgress.map((p) => (p.id === existing.id ? row : p))
            : [...d.challengeProgress, row],
        }))
      } catch {
        /* progress sync will retry on the next session */
      }
    }
  }, [patchDataset, prefs, today, user])

  /* ------------------------------- achievements --------------------------- */

  const userAchievementIds = data.userAchievements.map((a) => a.achievement_id).join(',')

  useEffect(() => {
    if (!user || !state.ready || !prefs) return
    let cancelled = false
    const evaluate = async () => {
      const states = achievementState(stateRef.current.data, prefs)
      const fresh = states.filter((a) => a.unlocked === false && a.progress >= 1)
      for (const a of fresh) {
        if (cancelled) return
        const row = {
          id: uid(),
          user_id: user.id,
          achievement_id: a.id,
          unlocked_at: new Date().toISOString(),
        }
        try {
          await backend.insert('user_achievements', row)
          patchDataset((d) => ({ ...d, userAchievements: [...d.userAchievements, row] }))
          setCelebrationQueue((q) => [...q, a.id])
          await notify({ type: 'achievement', title: 'Achievement unlocked', body: `${a.title} — ${a.description}`, link: '/achievements' })
        } catch {
          /* ignore duplicate race */
        }
      }
    }
    evaluate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAchievementIds, user?.id, state.ready, prefs?.timezone])

  /* --------------------------------- reload ------------------------------- */

  const reload = useCallback(async () => {
    if (stateRef.current.user) await load(stateRef.current.user)
  }, [load])

  const signOut = useCallback(async () => {
    await backend.signOut()
    setState({ ready: true, loadingError: null, user: null, data: emptyDataset() })
  }, [])

  const signInAccount = useCallback(
    async (email: string, password: string) => {
      const result = await backend.signIn(email, password)
      if (!result.error && backend.mode === 'local') {
        const nextUser = await backend.getInitialUser()
        if (nextUser) await load(nextUser)
      }
      return result
    },
    [load],
  )

  const signUpAccount = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await backend.signUp(name, email, password)
      if (!result.error && backend.mode === 'local') {
        const nextUser = await backend.getInitialUser()
        if (nextUser) await load(nextUser)
      }
      return result
    },
    [load],
  )

  const deleteAccount = useCallback(async () => {
    if (!user) return { error: 'Not signed in' }
    const result = await backend.deleteAccount(user.id)
    if (result.error) return result
    setState({ ready: true, loadingError: null, user: null, data: emptyDataset() })
    return {}
  }, [user])

  return {
    ...state,
    mode: backend.mode,
    today,
    timezone,
    prefs,
    celebrationQueue,
    dismissCelebration: () => setCelebrationQueue((q) => q.slice(1)),
    actions: {
      updateProfile,
      updatePreferences,
      uploadAvatar,
      addSubject,
      updateSubject,
      deleteSubject,
      addUnit,
      deleteUnit,
      addTopic,
      updateTopic,
      deleteTopic,
      addTask,
      updateTask,
      setTaskStatus,
      deleteTask,
      addEntry,
      updateEntry,
      deleteEntry,
      startSession,
      finalizeSession,
      pauseSession,
      resumeSession,
      patchSession,
      heartbeat,
      saveDailyGoal,
      addExam,
      updateExam,
      deleteExam,
      createChallenge,
      updateChallenge,
      logDistraction,
      deleteDistraction,
      markNotificationRead,
      markAllNotificationsRead,
      uploadResource,
      deleteResource,
      syncChallengeProgress,
      notify,
      reload,
      signOut,
      deleteAccount,
      load,
      signInAccount,
      signUpAccount,
      signInWithGoogle: backend.signInWithGoogle.bind(backend),
      socialProviders: backend.socialProviders.bind(backend),
      sendPasswordReset: backend.sendPasswordReset.bind(backend),
      updatePassword: backend.updatePassword.bind(backend),
    },
  }
}

export type AppStore = ReturnType<typeof useAppStore>
