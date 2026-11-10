import type {
  Dataset,
  DateKey,
  DistractionLog,
  ExamSchedule,
  FocusSession,
  StudyChallenge,
  Subject,
  UserPreferences,
} from './types'
import { addDaysKey, daysBetweenKeys, formatMinutes, todayKey, toDateKey, weekdayOfKey } from './utils'
import { ACHIEVEMENT_CATALOG } from './achievements'

export const DEFAULT_PREFS: Omit<UserPreferences, 'user_id' | 'updated_at'> = {
  theme: 'dark',
  default_focus_minutes: 25,
  break_minutes: 5,
  long_break_minutes: 20,
  sessions_before_long_break: 4,
  sound_enabled: true,
  reduced_motion: false,
  timezone: 'Asia/Kolkata',
  daily_target_minutes: 240,
  weekly_target_minutes: 1680,
  notify: {
    session_end: true,
    session_start: true,
    breaks: true,
    deadlines: true,
    exams: true,
    missed_sessions: true,
    daily_target: true,
    daily_report: true,
  },
}

export function activeSessionSeconds(session: FocusSession, now = Date.now()): number {
  if (session.status !== 'active') return session.actual_seconds
  const started = new Date(session.started_at).getTime()
  let paused = session.pause_seconds
  const openPause = session.pauses.find((p) => !p.ended_at)
  if (openPause) paused += now - new Date(openPause.started_at).getTime()
  return Math.max(0, Math.floor((now - started - paused) / 1000))
}

export function sessionSeconds(session: FocusSession, now = Date.now()): number {
  return session.status === 'active' ? activeSessionSeconds(session, now) : session.actual_seconds
}

export function sessionMinutesOn(dataset: Dataset, date: DateKey, timezone: string, now = Date.now(), includeActive = true) {
  return dataset.sessions
    .filter((s) => s.status !== 'active' || includeActive)
    .filter((s) => toDateKey(s.started_at, timezone) === date)
    .reduce((sum, s) => sum + sessionSeconds(s, now) / 60, 0)
}

export interface DayStats {
  date: DateKey
  minutes: number
  completedSessions: number
  startedSessions: number
  interruptedSessions: number
  tasksCompleted: number
  distractionMinutes: number
  targetMinutes: number
  targetSessions: number
  focusScore: number
  scoreParts: { label: string; earned: number; max: number; detail: string }[]
  streak: number
  interruptions: number
}

export function getTargetMinutes(dataset: Dataset, prefs: UserPreferences | null, date: DateKey): number {
  const goal = dataset.dailyGoals.find((g) => g.date === date)
  if (goal) return goal.target_minutes
  const challenge = activeChallenge(dataset)
  if (challenge && date >= challenge.start_date && date <= challenge.end_date) {
    return Math.round(challenge.daily_hours * 60)
  }
  return prefs?.daily_target_minutes ?? 240
}

export function getTargetSessions(dataset: Dataset, date: DateKey): number {
  const goal = dataset.dailyGoals.find((g) => g.date === date)
  if (goal) return goal.target_sessions
  return 4
}

export function activeChallenge(dataset: Dataset): StudyChallenge | null {
  return dataset.challenges.find((c) => c.active) ?? null
}

export function computeStreak(dataset: Dataset, timezone: string, today = todayKey(timezone)): number {
  const daysWithStudy = new Set<string>()
  for (const s of dataset.sessions) {
    if (s.status === 'interrupted') continue
    if (sessionSeconds(s) < 20 * 60) continue
    daysWithStudy.add(toDateKey(s.started_at, timezone))
  }
  let streak = 0
  let cursor = today
  // Today only counts once the user has studied; the streak is not broken until the day ends.
  if (!daysWithStudy.has(cursor)) cursor = addDaysKey(cursor, -1)
  while (daysWithStudy.has(cursor)) {
    streak += 1
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}

export function computeBestStreak(dataset: Dataset, timezone: string): number {
  const days = new Set<string>()
  for (const s of dataset.sessions) {
    if (s.status === 'interrupted') continue
    if (sessionSeconds(s) < 20 * 60) continue
    days.add(toDateKey(s.started_at, timezone))
  }
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev && daysBetweenKeys(prev, d) === 1) run += 1
    else run = 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

function isTaskDueOn(dataset: Dataset, date: DateKey, timezone: string): boolean {
  if (!date) return false
  return dataset.tasks.some((t) => t.deadline && toDateKey(t.deadline, timezone) === date)
}

export function dayStats(dataset: Dataset, date: DateKey, prefs: UserPreferences | null, now = Date.now()): DayStats {
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const sessions = dataset.sessions.filter((s) => toDateKey(s.started_at, timezone) === date)
  const minutes = sessions.reduce((sum, s) => sum + sessionSeconds(s, now) / 60, 0)
  const completedSessions = sessions.filter((s) => s.status === 'completed').length
  const startedSessions = sessions.length
  const interruptedSessions = sessions.filter((s) => s.status === 'interrupted').length
  const tasksCompleted = dataset.tasks.filter(
    (t) => t.status === 'completed' && t.completed_at && toDateKey(t.completed_at, timezone) === date,
  ).length
  const distractionMinutes = dataset.distractions
    .filter((d) => d.date === date)
    .reduce((sum, d) => sum + d.minutes, 0)
  const targetMinutes = getTargetMinutes(dataset, prefs, date)
  const targetSessions = getTargetSessions(dataset, date)

  const volumeParts = Math.min(1, targetMinutes > 0 ? minutes / targetMinutes : 0) * 40
  const sessionRate = startedSessions === 0 ? 0 : completedSessions / startedSessions
  const sessionParts = sessionRate * 25
  const tasksDue = isTaskDueOn(dataset, date, timezone)
  const tasksDone = dataset.tasks.filter(
    (t) => t.status === 'completed' && t.completed_at && toDateKey(t.completed_at, timezone) === date,
  ).length
  const tasksDueToday = dataset.tasks.filter((t) => t.deadline && toDateKey(t.deadline, timezone) === date)
  const tasksParts = tasksDueToday.length === 0 ? (tasksDone > 0 ? 15 : 0) : Math.min(1, tasksDone / tasksDueToday.length) * 15
  const last7 = Array.from({ length: 7 }, (_, i) => addDaysKey(date, -i))
  const activeDays = last7.filter((d) => sessionMinutesOn(dataset, d, timezone, now) >= 0.6 * getTargetMinutes(dataset, prefs, d)).length
  const consistencyParts = (activeDays / 7) * 10
  const interruptionParts = Math.max(0, 10 - interruptedSessions * 2.5)
  const interruptions = dataset.interruptions.filter((i) => toDateKey(i.created_at, timezone) === date).length

  const scoreParts = [
    {
      label: 'Study volume',
      earned: round1(volumeParts),
      max: 40,
      detail: `${formatMinutes(minutes)} of ${formatMinutes(targetMinutes)} target`,
    },
    {
      label: 'Session completion',
      earned: round1(sessionParts),
      max: 25,
      detail: `${completedSessions}/${startedSessions || 0} started sessions completed`,
    },
    {
      label: 'Academic tasks',
      earned: round1(tasksParts),
      max: 15,
      detail: tasksDue
        ? `${tasksDone}/${tasksDueToday.length} tasks due today completed`
        : tasksDone > 0
          ? `${tasksDone} extra tasks completed`
          : 'No tasks due today — keep the momentum',
    },
    {
      label: 'Consistency',
      earned: round1(consistencyParts),
      max: 10,
      detail: `${activeDays}/7 recent days reached 60% of target`,
    },
    {
      label: 'Focus discipline',
      earned: round1(interruptionParts),
      max: 10,
      detail: `${interruptedSessions} interrupted session${interruptedSessions === 1 ? '' : 's'} today`,
    },
  ]

  const focusScore = Math.round(Math.min(100, scoreParts.reduce((s, p) => s + p.earned, 0)))

  return {
    date,
    minutes,
    completedSessions,
    startedSessions,
    interruptedSessions,
    tasksCompleted,
    distractionMinutes,
    targetMinutes,
    targetSessions,
    focusScore,
    scoreParts,
    streak: computeStreak(dataset, timezone, date),
    interruptions,
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function seriesLastNDays(
  dataset: Dataset,
  prefs: UserPreferences | null,
  days: number,
  today = todayKey(prefs?.timezone ?? 'Asia/Kolkata'),
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysKey(today, -(days - 1 - i))
    const stats = dayStats(dataset, date, prefs)
    const planned = dataset.entries
      .filter((e) => e.day_of_week === weekdayOfKey(date) && (e.recurrence !== 'none' || e.day_of_week === weekdayOfKey(date)))
      .reduce((sum, e) => {
        const [sh, sm] = e.start_time.split(':').map(Number)
        const [eh, em] = e.end_time.split(':').map(Number)
        return sum + Math.max(0, eh * 60 + em - (sh * 60 + sm))
      }, 0)
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      minutes: Math.round(stats.minutes),
      hours: round1(stats.minutes / 60),
      target: stats.targetMinutes,
      planned,
      focusScore: stats.focusScore,
      sessions: stats.completedSessions,
      distractions: stats.distractionMinutes,
      tasks: stats.tasksCompleted,
    }
  })
}

export interface SubjectStats {
  subject: Subject
  minutes: number
  sessions: number
  totalTopics: number
  completedTopics: number
  revisionTopics: number
  progress: number
  units: number
  completedUnits: number
  pendingTasks: number
  nextExam: ExamSchedule | null
  daysToExam: number | null
}

export function subjectStats(dataset: Dataset, prefs: UserPreferences | null): SubjectStats[] {
  const now = Date.now()
  return dataset.subjects.map((subject) => {
    const sessions = dataset.sessions.filter((s) => s.subject_id === subject.id)
    const minutes = sessions.reduce((sum, s) => sum + sessionSeconds(s, now) / 60, 0)
    const units = dataset.units.filter((u) => u.subject_id === subject.id)
    const topics = dataset.topics.filter((t) => t.subject_id === subject.id)
    const completedTopics = topics.filter((t) => t.status === 'completed').length
    const completedUnits = units.filter(
      (u) =>
        topics.filter((t) => t.unit_id === u.id).length > 0 &&
        topics.filter((t) => t.unit_id === u.id).every((t) => t.status === 'completed' || t.status === 'needs_revision'),
    ).length
    const exams = dataset.exams
      .filter((e) => e.subject_id === subject.id && e.exam_date >= todayKey(prefs?.timezone))
      .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    return {
      subject,
      minutes,
      sessions: sessions.length,
      totalTopics: topics.length,
      completedTopics,
      revisionTopics: topics.filter((t) => t.status === 'needs_revision').length,
      progress: topics.length ? Math.round((completedTopics / topics.length) * 100) : 0,
      units: units.length,
      completedUnits,
      pendingTasks: dataset.tasks.filter((t) => t.subject_id === subject.id && t.status === 'pending').length,
      nextExam: exams[0] ?? null,
      daysToExam: exams[0] ? daysBetweenKeys(todayKey(prefs?.timezone), exams[0].exam_date) : null,
    }
  })
}

export function examCountdown(exam: ExamSchedule, timezone: string, now = Date.now()) {
  const [h, m] = (exam.exam_time ?? '09:00').split(':').map(Number)
  const [y, mo, d] = exam.exam_date.split('-').map(Number)
  // Interpret exam time in the configured timezone by approximating with the local offset.
  const target = new Date(y, mo - 1, d, h, m, 0, 0)
  const diff = target.getTime() - now
  const calendarDays = daysBetweenKeys(todayKey(timezone), exam.exam_date)
  return {
    ms: diff,
    days: Math.max(0, calendarDays),
    hours: Math.max(0, Math.floor((diff % 86400000) / 3600000)),
    minutes: Math.max(0, Math.floor((diff % 3600000) / 60000)),
    past: diff < 0,
    date: target,
    timezone,
  }
}

export function examReadiness(dataset: Dataset, exam: ExamSchedule): { progress: number; pendingTopics: number; revision: number } {
  const subjectTopics = dataset.topics.filter((t) => t.subject_id === exam.subject_id)
  const pending = subjectTopics.filter((t) => t.status !== 'completed' && t.status !== 'needs_revision').length
  const revision = subjectTopics.filter((t) => t.status === 'needs_revision').length
  const progress = subjectTopics.length
    ? Math.round(((subjectTopics.length - pending) / subjectTopics.length) * 100)
    : 0
  return { progress, pendingTopics: pending, revision }
}

export function distractionStats(dataset: Dataset, prefs: UserPreferences | null, days = 14) {
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)
  const series = Array.from({ length: days }, (_, i) => {
    const date = addDaysKey(today, -(days - 1 - i))
    const logs = dataset.distractions.filter((d) => d.date === date)
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      minutes: logs.reduce((s, l) => s + l.minutes, 0),
    }
  })
  const byPlatform = new Map<string, number>()
  for (const log of dataset.distractions) byPlatform.set(log.platform, (byPlatform.get(log.platform) ?? 0) + log.minutes)
  const totalToday = dataset.distractions.filter((d) => d.date === today).reduce((s, d) => s + d.minutes, 0)
  const totalAll = dataset.distractions.reduce((s, d) => s + d.minutes, 0)
  return {
    series,
    byPlatform: [...byPlatform.entries()].map(([platform, minutes]) => ({ platform, minutes })),
    totalToday,
    totalAll,
  }
}

export function subjectDistribution(dataset: Dataset) {
  const now = Date.now()
  const rows = dataset.subjects.map((s) => ({
    name: s.name,
    minutes: Math.round(
      dataset.sessions
        .filter((session) => session.subject_id === s.id)
        .reduce((sum, session) => sum + sessionSeconds(session, now) / 60, 0),
    ),
    fill: {
      blue: '#5b8cff',
      violet: '#a78bfa',
      mint: '#34d399',
      amber: '#fbbf24',
      rose: '#fb7185',
      cyan: '#22d3ee',
    }[s.color],
  }))
  return rows.filter((r) => r.minutes > 0)
}

export interface ChallengeMetrics {
  challenge: StudyChallenge | null
  currentDay: number
  totalDays: number
  elapsedDays: number
  completedDays: number
  missedDays: number
  remainingDays: number
  consistency: number
  totalMinutes: number
  targetMinutes: number
  todayStats: DayStats
  days: {
    date: DateKey
    dayNumber: number
    status: 'completed' | 'missed' | 'pending' | 'future'
    minutes: number
    target: number
    focusScore: number
  }[]
  bestStreak: number
  streak: number
}

export function challengeMetrics(dataset: Dataset, prefs: UserPreferences | null): ChallengeMetrics {
  const challenge = activeChallenge(dataset)
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)
  const emptyStats = dayStats(dataset, today, prefs)
  if (!challenge) {
    return {
      challenge: null,
      currentDay: 0,
      totalDays: 0,
      elapsedDays: 0,
      completedDays: 0,
      missedDays: 0,
      remainingDays: 0,
      consistency: 0,
      totalMinutes: 0,
      targetMinutes: 0,
      todayStats: emptyStats,
      days: [],
      bestStreak: 0,
      streak: 0,
    }
  }
  const totalDays = daysBetweenKeys(challenge.start_date, challenge.end_date) + 1
  const rawDay = daysBetweenKeys(challenge.start_date, today) + 1
  const currentDay = Math.min(Math.max(rawDay, 1), totalDays)
  const elapsedDays = Math.min(Math.max(rawDay, 0), totalDays)
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysKey(challenge.start_date, i)
    const stats = dayStats(dataset, date, prefs)
    const recorded = dataset.challengeProgress.find((p) => p.challenge_id === challenge.id && p.date === date)
    let status: 'completed' | 'missed' | 'pending' | 'future' = 'future'
    if (date < today) status = stats.minutes >= stats.targetMinutes && stats.minutes > 0 ? 'completed' : 'missed'
    else if (date === today) status = 'pending'
    if (recorded && date < today) status = recorded.status === 'completed' ? 'completed' : 'missed'
    return {
      date,
      dayNumber: i + 1,
      status,
      minutes: Math.round(stats.minutes),
      target: stats.targetMinutes,
      focusScore: stats.focusScore,
    }
  })
  const past = days.filter((d) => d.status !== 'pending' && d.status !== 'future')
  const completedDays = past.filter((d) => d.status === 'completed').length
  const missedDays = past.filter((d) => d.status === 'missed').length
  return {
    challenge,
    currentDay,
    totalDays,
    elapsedDays,
    completedDays,
    missedDays,
    remainingDays: Math.max(0, totalDays - currentDay),
    consistency: elapsedDays > 0 ? Math.round((completedDays / elapsedDays) * 100) : 0,
    totalMinutes: days.filter((d) => d.date <= today).reduce((s, d) => s + d.minutes, 0),
    targetMinutes: totalDays * Math.round(challenge.daily_hours * 60),
    todayStats: emptyStats,
    days,
    bestStreak: computeBestStreak(dataset, timezone),
    streak: computeStreak(dataset, timezone),
  }
}

export function achievementState(dataset: Dataset, prefs: UserPreferences | null) {
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)
  const now = Date.now()
  const totalMinutes = dataset.sessions.reduce((s, x) => s + sessionSeconds(x, now) / 60, 0)
  const completedSessions = dataset.sessions.filter((s) => s.status === 'completed').length
  const streak = computeStreak(dataset, timezone)
  const tasksCompleted = dataset.tasks.filter((t) => t.status === 'completed').length
  const perfectDays = Array.from({ length: 60 }, (_, i) => addDaysKey(today, -i)).filter((d) => {
    const s = dayStats(dataset, d, prefs)
    return s.minutes > 0 && s.minutes >= s.targetMinutes && s.completedSessions >= s.targetSessions
  }).length
  const challenge = activeChallenge(dataset)
  const challengeCompleteDays = challenge
    ? dataset.challengeProgress.filter((p) => p.challenge_id === challenge.id && p.status === 'completed').length
    : 0
  const values: Record<string, number> = {
    sessions_completed: completedSessions,
    total_hours: totalMinutes / 60,
    streak,
    tasks_completed: tasksCompleted,
    perfect_days: perfectDays,
    challenge_days: challengeCompleteDays,
  }
  const unlocked = new Set(dataset.userAchievements.map((a) => a.achievement_id))
  const catalog = dataset.achievements.length ? dataset.achievements : ACHIEVEMENT_CATALOG
  return catalog.map((a) => {
    const value = values[a.metric] ?? 0
    return {
      ...a,
      value,
      unlocked: unlocked.has(a.id),
      progress: Math.min(1, a.threshold > 0 ? value / a.threshold : 0),
      remaining: Math.max(0, a.threshold - value),
    }
  })
}

export function datasetSummary(dataset: Dataset, prefs: UserPreferences | null) {
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)
  const now = Date.now()
  const totalMinutes = dataset.sessions.reduce((s, x) => s + sessionSeconds(x, now) / 60, 0)
  return {
    totalMinutes,
    totalSessions: dataset.sessions.filter((s) => s.status === 'completed').length,
    interruptions: dataset.interruptions.length,
    tasksDone: dataset.tasks.filter((t) => t.status === 'completed').length,
    distractions: dataset.distractions.reduce((s, d) => s + d.minutes, 0),
    today: dayStats(dataset, today, prefs),
  }
}

export function buildInsights(dataset: Dataset, prefs: UserPreferences | null): string[] {
  const timezone = prefs?.timezone ?? 'Asia/Kolkata'
  const today = todayKey(timezone)
  const now = Date.now()
  const stats = dayStats(dataset, today, prefs)
  const insights: string[] = []
  const diff = Math.round(stats.minutes - stats.targetMinutes)
  if (stats.minutes > 0) {
    insights.push(
      diff >= 0
        ? `You have studied ${formatMinutes(stats.minutes)} today — ${formatMinutes(diff)} above your ${formatMinutes(stats.targetMinutes)} target.`
        : `You have studied ${formatMinutes(stats.minutes)} today — ${formatMinutes(Math.abs(diff))} short of your ${formatMinutes(stats.targetMinutes)} target.`,
    )
  } else {
    insights.push(`No study time logged yet today. Your target is ${formatMinutes(stats.targetMinutes)}.`)
  }
  const subs = subjectStats(dataset, prefs).filter((s) => s.totalTopics > 0).sort((a, b) => a.progress - b.progress)
  if (subs[0] && subs[0].progress < 100) {
    insights.push(`${subs[0].subject.name} is your least-prepared subject at ${subs[0].progress}% topic coverage.`)
  }
  const upcoming = dataset.exams
    .filter((e) => e.exam_date >= today)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0]
  if (upcoming) {
    insights.push(
      `${upcoming.name} is in ${daysBetweenKeys(today, upcoming.exam_date)} day${daysBetweenKeys(today, upcoming.exam_date) === 1 ? '' : 's'}.`,
    )
  }
  const overdue = dataset.tasks.filter((t) => t.status === 'pending' && t.deadline && t.deadline.slice(0, 10) < today).length
  if (overdue > 0) insights.push(`${overdue} task${overdue === 1 ? '' : 's'} are overdue — clear them before adding new work.`)
  const weekly = dataset.sessions
    .filter((s) => toDateKey(s.started_at, timezone) >= addDaysKey(today, -6))
    .reduce((sum, s) => sum + sessionSeconds(s, now) / 60, 0)
  if (prefs?.weekly_target_minutes) {
    insights.push(`This week: ${formatMinutes(weekly)} of your ${formatMinutes(prefs.weekly_target_minutes)} weekly target.`)
  }
  return insights
}

export function dailyReportText(dataset: Dataset, prefs: UserPreferences | null, date = todayKey(prefs?.timezone)): string {
  const stats = dayStats(dataset, date, prefs)
  const missed = dataset.tasks.filter((t) => t.status === 'pending' && t.deadline && toDateKey(t.deadline, prefs?.timezone) === date).length
  return [
    `${formatMinutes(stats.minutes)} studied against a ${formatMinutes(stats.targetMinutes)} target.`,
    `${stats.completedSessions} session${stats.completedSessions === 1 ? '' : 's'} completed, ${stats.interruptedSessions} interrupted.`,
    `${stats.tasksCompleted} task${stats.tasksCompleted === 1 ? '' : 's'} completed${missed ? `, ${missed} still pending today` : ''}.`,
    `${stats.distractionMinutes} min reported distraction time.`,
    `Focus score ${stats.focusScore}/100.`,
  ].join(' ')
}

export type DistractionRow = DistractionLog
