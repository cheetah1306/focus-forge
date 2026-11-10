export type ID = string

export type ISO = string
export type DateKey = string // yyyy-MM-dd in the user's timezone

export type ThemeMode = 'dark' | 'light' | 'system'

export interface Profile {
  id: ID
  email: string | null
  full_name: string
  college: string | null
  academic_year: string | null
  semester: string | null
  avatar_url: string | null
  onboarded: boolean
  timezone: string
  created_at: ISO
  updated_at: ISO
}

export interface UserPreferences {
  user_id: ID
  theme: ThemeMode
  default_focus_minutes: number
  break_minutes: number
  long_break_minutes: number
  sessions_before_long_break: number
  sound_enabled: boolean
  reduced_motion: boolean
  timezone: string
  daily_target_minutes: number
  weekly_target_minutes: number
  notify: {
    session_end: boolean
    session_start: boolean
    breaks: boolean
    deadlines: boolean
    exams: boolean
    missed_sessions: boolean
    daily_target: boolean
    daily_report: boolean
  }
  updated_at: ISO
}

export type SubjectColor = 'blue' | 'violet' | 'mint' | 'amber' | 'rose' | 'cyan'

export interface Subject {
  id: ID
  user_id: ID
  name: string
  code: string | null
  color: SubjectColor
  position: number
  created_at: ISO
}

export interface Unit {
  id: ID
  user_id: ID
  subject_id: ID
  name: string
  position: number
  created_at: ISO
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_revision'

export interface Topic {
  id: ID
  user_id: ID
  subject_id: ID
  unit_id: ID
  name: string
  status: TopicStatus
  position: number
  created_at: ISO
  updated_at: ISO
}

export type TaskCategory = 'must_do' | 'high' | 'normal' | 'revision' | 'practice' | 'mock'

export interface StudyTask {
  id: ID
  user_id: ID
  subject_id: ID | null
  unit_id: ID | null
  topic_id: ID | null
  title: string
  description: string | null
  category: TaskCategory
  priority: 1 | 2 | 3
  deadline: ISO | null
  estimated_minutes: number
  actual_minutes: number
  status: 'pending' | 'completed'
  completed_at: ISO | null
  created_at: ISO
  updated_at: ISO
}

export type EntryStatus = 'pending' | 'completed' | 'missed' | 'rescheduled'
export type Recurrence = 'none' | 'daily' | 'weekly'

export interface TimetableEntry {
  id: ID
  user_id: ID
  subject_id: ID | null
  topic_id: ID | null
  title: string
  topic: string | null
  day_of_week: number // 0 = Sunday
  start_time: string // HH:mm
  end_time: string // HH:mm
  recurrence: Recurrence
  priority: 1 | 2 | 3
  description: string | null
  status: EntryStatus
  created_at: ISO
  updated_at: ISO
}

export type FocusMode = 'pomodoro' | 'deep' | 'exam' | 'custom' | 'emergency'
export type SessionStatus = 'active' | 'completed' | 'interrupted'

export interface PauseInterval {
  started_at: ISO
  ended_at: ISO | null
}

export interface FocusSession {
  id: ID
  user_id: ID
  subject_id: ID | null
  topic: string | null
  mode: FocusMode
  planned_minutes: number
  started_at: ISO
  planned_end_at: ISO
  ended_at: ISO | null
  actual_seconds: number
  pause_seconds: number
  pauses: PauseInterval[]
  status: SessionStatus
  interruption_reason: string | null
  task_id: ID | null
  entry_id: ID | null
  note: string | null
  last_heartbeat_at: ISO
  created_at: ISO
}

export interface SessionInterruption {
  id: ID
  user_id: ID
  session_id: ID
  planned_minutes: number
  actual_minutes: number
  reason: string
  note: string | null
  created_at: ISO
}

export interface DailyGoal {
  id: ID
  user_id: ID
  date: DateKey
  target_minutes: number
  target_sessions: number
  target_tasks: number
  note: string | null
  created_at: ISO
}

export type ExamType = 'midterm' | 'final' | 'quiz' | 'practical' | 'viva' | 'other'

export interface ExamSchedule {
  id: ID
  user_id: ID
  subject_id: ID | null
  name: string
  exam_date: DateKey
  exam_time: string | null
  exam_type: ExamType
  venue: string | null
  notes: string | null
  created_at: ISO
}

export interface StudyChallenge {
  id: ID
  user_id: ID
  name: string
  start_date: DateKey
  end_date: DateKey
  daily_hours: number
  weekly_revision_target: number
  subject_priorities: ID[]
  active: boolean
  created_at: ISO
}

export type ChallengeDayStatus = 'pending' | 'completed' | 'missed'

export interface ChallengeReport {
  studied_minutes: number
  target_minutes: number
  sessions_completed: number
  sessions_interrupted: number
  tasks_completed: number
  distraction_minutes: number
  focus_score: number
  summary: string
}

export interface DailyChallengeProgress {
  id: ID
  user_id: ID
  challenge_id: ID
  date: DateKey
  day_number: number
  target_minutes: number
  studied_minutes: number
  sessions_completed: number
  tasks_completed: number
  status: ChallengeDayStatus
  focus_score: number
  report: ChallengeReport | null
  created_at: ISO
  updated_at: ISO
}

export type NotificationType =
  | 'session'
  | 'break'
  | 'deadline'
  | 'exam'
  | 'target'
  | 'report'
  | 'achievement'

export interface AppNotification {
  id: ID
  user_id: ID
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: ISO
}

export type AchievementMetric =
  | 'sessions_completed'
  | 'total_hours'
  | 'streak'
  | 'challenge_days'
  | 'perfect_days'
  | 'tasks_completed'

export interface Achievement {
  id: ID
  title: string
  description: string
  icon: string
  metric: AchievementMetric
  threshold: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface UserAchievement {
  id: ID
  user_id: ID
  achievement_id: ID
  unlocked_at: ISO
}

export type DistractionPlatform =
  | 'instagram'
  | 'youtube'
  | 'browsing'
  | 'gaming'
  | 'chat'
  | 'other'

export interface DistractionLog {
  id: ID
  user_id: ID
  date: DateKey
  platform: DistractionPlatform
  minutes: number
  note: string | null
  created_at: ISO
}

export interface StudyResource {
  id: ID
  user_id: ID
  subject_id: ID
  name: string
  url: string
  size_bytes: number
  created_at: ISO
}

export interface Dataset {
  profile: Profile | null
  preferences: UserPreferences | null
  subjects: Subject[]
  units: Unit[]
  topics: Topic[]
  tasks: StudyTask[]
  entries: TimetableEntry[]
  sessions: FocusSession[]
  interruptions: SessionInterruption[]
  dailyGoals: DailyGoal[]
  exams: ExamSchedule[]
  challenges: StudyChallenge[]
  challengeProgress: DailyChallengeProgress[]
  notifications: AppNotification[]
  achievements: Achievement[]
  userAchievements: UserAchievement[]
  distractions: DistractionLog[]
  resources: StudyResource[]
}

export interface AppUser {
  id: ID
  email: string | null
  name: string | null
}

export type TableName =
  | 'subjects'
  | 'units'
  | 'topics'
  | 'study_tasks'
  | 'timetable_entries'
  | 'focus_sessions'
  | 'session_interruptions'
  | 'daily_goals'
  | 'exam_schedule'
  | 'study_challenges'
  | 'daily_challenge_progress'
  | 'notifications'
  | 'user_achievements'
  | 'distraction_logs'
