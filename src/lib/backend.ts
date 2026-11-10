import type {
  Achievement,
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
  UserAchievement,
  UserPreferences,
} from './types'
import { ACHIEVEMENT_CATALOG } from './achievements'
import { DEFAULT_PREFS } from './metrics'
import { supabase, isSupabaseConfigured, SUPABASE_URL } from './supabase'
import { todayKey, uid } from './utils'

export type BackendMode = 'supabase' | 'local'

export interface Backend {
  mode: BackendMode
  getInitialUser(): Promise<AppUser | null>
  onAuthChange(cb: (user: AppUser | null) => void): () => void
  signIn(email: string, password: string): Promise<{ error?: string }>
  signUp(fullName: string, email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<{ error?: string }>
  updatePassword(password: string): Promise<{ error?: string }>
  signInWithGoogle(): Promise<{ error?: string }>
  socialProviders(): Promise<{ google: boolean }>
  loadDataset(userId: string): Promise<Dataset>
  insert<T extends { id: string }>(table: string, row: T): Promise<T>
  update<T extends { id: string }>(table: string, id: string, patch: Record<string, unknown>): Promise<T>
  remove(table: string, id: string): Promise<void>
  upsertChallengeProgress(row: DailyChallengeProgress): Promise<DailyChallengeProgress>
  updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile>
  updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>
  uploadAvatar(userId: string, file: File): Promise<{ url?: string; error?: string }>
  uploadResource(userId: string, subjectId: string, file: File): Promise<{ resource?: StudyResource; error?: string }>
  deleteAccount(userId: string): Promise<{ error?: string }>
}

const TABLES = [
  'subjects',
  'units',
  'topics',
  'study_tasks',
  'timetable_entries',
  'focus_sessions',
  'session_interruptions',
  'daily_goals',
  'exam_schedule',
  'study_challenges',
  'daily_challenge_progress',
  'notifications',
  'user_achievements',
  'distraction_logs',
  'study_resources',
] as const

type TableKey = (typeof TABLES)[number]

const emptyDataset = (): Dataset => ({
  profile: null,
  preferences: null,
  subjects: [],
  units: [],
  topics: [],
  tasks: [],
  entries: [],
  sessions: [],
  interruptions: [],
  dailyGoals: [],
  exams: [],
  challenges: [],
  challengeProgress: [],
  notifications: [],
  achievements: ACHIEVEMENT_CATALOG,
  userAchievements: [],
  distractions: [],
  resources: [],
})

function hydrateDataset(raw: Record<string, unknown>): Dataset {
  const d = emptyDataset()
  const arr = <T>(key: string): T[] => (Array.isArray(raw[key]) ? (raw[key] as T[]) : [])
  d.profile = (raw.profile as Profile | null) ?? null
  d.preferences = (raw.preferences as UserPreferences | null) ?? null
  d.subjects = arr<Subject>('subjects')
  d.units = arr<Unit>('units')
  d.topics = arr<Topic>('topics')
  d.tasks = arr<StudyTask>('study_tasks')
  d.entries = arr<TimetableEntry>('timetable_entries')
  d.sessions = arr<FocusSession>('focus_sessions')
  d.interruptions = arr<SessionInterruption>('session_interruptions')
  d.dailyGoals = arr('daily_goals')
  d.exams = arr<ExamSchedule>('exam_schedule')
  d.challenges = arr<StudyChallenge>('study_challenges')
  d.challengeProgress = arr<DailyChallengeProgress>('daily_challenge_progress')
  d.notifications = arr<AppNotification>('notifications')
  d.userAchievements = arr<UserAchievement>('user_achievements')
  d.distractions = arr<DistractionLog>('distraction_logs')
  d.resources = arr<StudyResource>('study_resources')
  const catalog = arr<Achievement>('achievements')
  d.achievements = catalog.length ? catalog : ACHIEVEMENT_CATALOG
  return d
}

/* ------------------------------------------------------------------ */
/* Supabase adapter                                                    */
/* ------------------------------------------------------------------ */

interface SupabaseError {
  code?: string
  message?: string
  details?: string
}

function describeError(error: SupabaseError | null): string {
  if (!error) return 'Unknown error'
  if (error.code === '42P01' || /does not exist/i.test(error.message ?? '')) {
    return 'The FOCUSFORGE database is not initialised. Run supabase/migrations/0001_init.sql in your Supabase SQL editor, then reload.'
  }
  if (error.code === '23505') return 'That record already exists.'
  if (error.code === '42501') return 'Permission denied by row level security. Make sure you are signed in.'
  if (error.code === 'PGRST301' || /JWT/i.test(error.message ?? '')) return 'Your session has expired. Please sign in again.'
  return error.message ?? 'Request failed'
}

function mapUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AppUser | null {
  if (!u) return null
  const name = (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? null
  return { id: u.id, email: u.email ?? null, name }
}

export const supabaseBackend: Backend = {
  mode: 'supabase',

  async getInitialUser() {
    if (!supabase) return null
    const { data } = await supabase.auth.getUser()
    return mapUser(data.user)
  },

  onAuthChange(cb) {
    if (!supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(mapUser(session?.user ?? null)))
    return () => data.subscription.unsubscribe()
  },

  async signIn(email, password) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? { error: describeError(error) } : {}
  },

  async signUp(fullName, email, password) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (error) return { error: describeError(error) }
    return { needsConfirmation: !data.session }
  },

  async signOut() {
    await supabase?.auth.signOut()
  },

  async sendPasswordReset(email) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return error ? { error: describeError(error) } : {}
  },

  async updatePassword(password) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.updateUser({ password })
    return error ? { error: describeError(error) } : {}
  },

  async signInWithGoogle() {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    return error ? { error: describeError(error) } : {}
  },

  async socialProviders() {
    if (!isSupabaseConfigured) return { google: false }
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      })
      if (!res.ok) return { google: false }
      const settings = (await res.json()) as { external?: Record<string, boolean> }
      return { google: Boolean(settings.external?.google) }
    } catch {
      return { google: false }
    }
  },

  async loadDataset(userId) {
    const client = supabase
    if (!client) throw new Error('Supabase is not configured.')
    const results = await Promise.all(
      TABLES.map(async (table) => {
        const { data, error } = await client.from(table).select('*').eq('user_id', userId)
        return { table, data: data ?? [], error }
      }),
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) throw new Error(describeError(failed.error))

    const [{ data: profile, error: profileError }, { data: prefs, error: prefError }, { data: achievements }] = await Promise.all([
      client.from('profiles').select('*').eq('id', userId).maybeSingle(),
      client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      client.from('achievements').select('*'),
    ])
    if (profileError) throw new Error(describeError(profileError))
    if (prefError) throw new Error(describeError(prefError))

    const raw: Record<string, unknown> = {
      profile,
      preferences: prefs,
      achievements: achievements ?? [],
    }
    for (const r of results) raw[r.table] = r.data
    return hydrateDataset(raw)
  },

  async insert(table, row) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (error) throw new Error(describeError(error))
    return data as typeof row
  },

  async update(table, id, patch) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
    if (error) throw new Error(describeError(error))
    return data as never
  },

  async remove(table, id) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw new Error(describeError(error))
  },

  async upsertChallengeProgress(row) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase
      .from('daily_challenge_progress')
      .upsert(row, { onConflict: 'challenge_id,date' })
      .select()
      .single()
    if (error) throw new Error(describeError(error))
    return data as DailyChallengeProgress
  },

  async updateProfile(userId, patch) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(describeError(error))
    return data as Profile
  },

  async updatePreferences(userId, patch) {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase
      .from('user_preferences')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(describeError(error))
    return data as UserPreferences
  },

  async uploadAvatar(userId, file) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const ext = file.name.split('.').pop() || 'png'
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) return { error: describeError(error) }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return { url: data.publicUrl }
  },

  async uploadResource(userId, subjectId, file) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    const path = `${userId}/${subjectId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const { error } = await supabase.storage.from('study-documents').upload(path, file, { upsert: false })
    if (error) return { error: describeError(error) }
    // The study-documents bucket is private, so issue a week-long signed URL.
    const { data: signed, error: signedError } = await supabase.storage.from('study-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
    if (signedError || !signed) return { error: signedError ? describeError(signedError) : 'Could not create a document link.' }
    const resource = {
      id: uid(),
      user_id: userId,
      subject_id: subjectId,
      name: file.name,
      url: signed.signedUrl,
      size_bytes: file.size,
      created_at: new Date().toISOString(),
    }
    return { resource }
  },

  async deleteAccount(userId) {
    if (!supabase) return { error: 'Supabase is not configured.' }
    // Deleting auth users requires the service role key. The client can remove all
    // user-owned rows (RLS-scoped) and then sign out; the auth record is removed by
    // the account-deletion SQL function when enabled by the project owner.
    for (const table of TABLES) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error && error.code !== '42P01') return { error: describeError(error) }
    }
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) return { error: describeError(error) }
    await supabase.auth.signOut()
    return {}
  },
}

/* ------------------------------------------------------------------ */
/* Local workspace adapter                                             */
/* ------------------------------------------------------------------ */

const LS_USER = 'ff.local.user'
const lsTable = (userId: string, table: string) => `ff.local.${userId}.${table}`

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLS(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

const localUser = (): AppUser | null => readLS<AppUser | null>(LS_USER, null)

export const localBackend: Backend = {
  mode: 'local',

  async getInitialUser() {
    return localUser()
  },

  onAuthChange() {
    return () => {}
  },

  async signIn() {
    return { error: 'Local mode has no remote account. Use "Open local workspace".' }
  },

  async signUp(fullName, email) {
    const existing = localUser()
    const user: AppUser = {
      id: existing?.id ?? uid(),
      email: email || null,
      name: fullName || existing?.name || 'Student',
    }
    writeLS(LS_USER, user)
    return {}
  },

  async signOut() {
    localStorage.removeItem(LS_USER)
  },

  async sendPasswordReset() {
    return { error: 'Password recovery requires Supabase authentication.' }
  },

  async updatePassword() {
    return { error: 'Password management requires Supabase authentication.' }
  },

  async signInWithGoogle() {
    return { error: 'Google sign-in requires Supabase authentication.' }
  },

  async socialProviders() {
    return { google: false }
  },

  async loadDataset(userId) {
    const raw: Record<string, unknown> = {}
    const existingUser = localUser()
    let profile = readLS<Profile | null>(`ff.local.${userId}.profile`, null)
    if (!profile) {
      const now = new Date().toISOString()
      profile = {
        id: userId,
        email: existingUser?.email ?? null,
        full_name: existingUser?.name ?? 'Student',
        college: null,
        academic_year: null,
        semester: null,
        avatar_url: null,
        onboarded: false,
        timezone: 'Asia/Kolkata',
        created_at: now,
        updated_at: now,
      }
      writeLS(`ff.local.${userId}.profile`, profile)
    }
    let preferences = readLS<UserPreferences | null>(`ff.local.${userId}.preferences`, null)
    if (!preferences) {
      preferences = { ...DEFAULT_PREFS, user_id: userId, updated_at: new Date().toISOString() }
      writeLS(`ff.local.${userId}.preferences`, preferences)
    }
    raw.profile = profile
    raw.preferences = preferences
    for (const table of TABLES) raw[table] = readLS(`ff.local.${userId}.${table}`, [])
    return hydrateDataset(raw)
  },

  async insert(table, row) {
    const user = localUser()
    const rows = readLS<Array<{ id: string }>>(lsTable(user?.id ?? '', table), [])
    if (!rows.some((r) => r.id === row.id)) rows.push(row)
    writeLS(lsTable(user?.id ?? '', table), rows)
    return row
  },

  async update(table, id, patch) {
    const user = localUser()
    const rows = readLS<Array<{ id: string }>>(lsTable(user?.id ?? '', table), [])
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    writeLS(lsTable(user?.id ?? '', table), next)
    return next.find((r) => r.id === id) as never
  },

  async remove(table, id) {
    const user = localUser()
    const rows = readLS<Array<{ id: string }>>(lsTable(user?.id ?? '', table), [])
    writeLS(lsTable(user?.id ?? '', table), rows.filter((r) => r.id !== id))
  },

  async upsertChallengeProgress(row) {
    const user = localUser()
    const rows = readLS<DailyChallengeProgress[]>(lsTable(user?.id ?? '', 'daily_challenge_progress'), [])
    const existing = rows.find((r) => r.challenge_id === row.challenge_id && r.date === row.date)
    const merged = existing ? { ...existing, ...row, id: existing.id } : row
    const next = existing ? rows.map((r) => (r.id === existing.id ? merged : r)) : [...rows, merged]
    writeLS(lsTable(user?.id ?? '', 'daily_challenge_progress'), next)
    return merged
  },

  async updateProfile(userId, patch) {
    const current = readLS<Profile | null>(`ff.local.${userId}.profile`, null)
    const next = { ...(current as Profile), ...patch, updated_at: new Date().toISOString() }
    writeLS(`ff.local.${userId}.profile`, next)
    return next
  },

  async updatePreferences(userId, patch) {
    const current = readLS<UserPreferences | null>(`ff.local.${userId}.preferences`, null)
    const next = { ...(current as UserPreferences), ...patch, user_id: userId, updated_at: new Date().toISOString() }
    writeLS(`ff.local.${userId}.preferences`, next)
    return next
  },

  async uploadAvatar(_userId, file) {
    const url = await fileToDataUrl(file)
    return { url }
  },

  async uploadResource(userId, subjectId, file) {
    // Local storage is capped around 5 MB by the browser, and a data URL is ~33%
    // larger than the file. Refuse instead of corrupting the workspace.
    if (file.size > 1_500_000) {
      return { error: 'Local workspace keeps documents in this browser, which limits files to about 1.5 MB. Configure Supabase Storage for larger files.' }
    }
    try {
      const url = await fileToDataUrl(file)
      return {
        resource: {
          id: uid(),
          user_id: userId,
          subject_id: subjectId,
          name: file.name,
          url,
          size_bytes: file.size,
          created_at: new Date().toISOString(),
        },
      }
    } catch {
      return { error: 'This browser refused to store the document. Try a smaller file or configure Supabase Storage.' }
    }
  },

  async deleteAccount(userId) {
    for (const table of TABLES) localStorage.removeItem(`ff.local.${userId}.${table}`)
    localStorage.removeItem(`ff.local.${userId}.profile`)
    localStorage.removeItem(`ff.local.${userId}.preferences`)
    localStorage.removeItem(LS_USER)
    return {}
  },
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })
}

export const backend: Backend = isSupabaseConfigured ? supabaseBackend : localBackend
export const backendMode: BackendMode = isSupabaseConfigured ? 'supabase' : 'local'
export type { TableKey }
export { emptyDataset, describeError }
export const localToday = () => todayKey()
