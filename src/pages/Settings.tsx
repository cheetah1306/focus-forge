import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Database,
  Download,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Timer,
  Trash2,
  Upload,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { isSupabaseConfigured } from '../lib/supabase'
import { cn, downloadFile, formatMinutes, todayKey } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, Field, Input, Modal, SectionHeader, SegmentedControl, Select, Switch } from '../components/ui'
import { toast } from '../lib/events'
import { notificationPermission, requestNotificationPermission, showBrowserNotification } from '../lib/notifications'
import type { ThemeMode, UserPreferences } from '../lib/types'

const TIMEZONES = (() => {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone')
    if (list?.length) return list
  } catch {
    /* fall through */
  }
  return ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC']
})()

export default function Settings() {
  const { data, prefs, user, actions, mode, today, timezone } = useApp()
  const navigate = useNavigate()
  const [profileForm, setProfileForm] = useState({
    full_name: data.profile?.full_name ?? '',
    college: data.profile?.college ?? '',
    academic_year: data.profile?.academic_year ?? '',
    semester: data.profile?.semester ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [permission, setPermission] = useState(notificationPermission())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await actions.updateProfile({
        full_name: profileForm.full_name.trim() || 'Student',
        college: profileForm.college.trim() || null,
        academic_year: profileForm.academic_year || null,
        semester: profileForm.semester || null,
      })
      toast.success('Profile saved')
    } finally {
      setSavingProfile(false)
    }
  }

  const datasetExport = () => ({
    exported_at: new Date().toISOString(),
    mode,
    profile: data.profile,
    preferences: data.preferences,
    subjects: data.subjects,
    units: data.units,
    topics: data.topics,
    tasks: data.tasks,
    timetable_entries: data.entries,
    focus_sessions: data.sessions,
    interruptions: data.interruptions,
    daily_goals: data.dailyGoals,
    exams: data.exams,
    challenges: data.challenges,
    challenge_progress: data.challengeProgress,
    distractions: data.distractions,
    achievements: data.userAchievements,
    notifications: data.notifications,
  })

  return (
    <div>
      <PageHeader
        eyebrow="Your system, your rules"
        title="Settings"
        description="Profile, appearance, timer defaults, targets and notification preferences. Everything persists to your workspace."
        actions={<Badge tone={mode === 'supabase' ? 'success' : 'warning'}>{mode === 'supabase' ? 'Supabase connected' : 'Local workspace'}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Profile" subtitle="Used across greetings, reports and your academic context" />
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-gradient-to-br from-brand-500/25 to-violet-500/25 text-sm font-bold">
                {data.profile?.avatar_url ? <img src={data.profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : (data.profile?.full_name ?? 'S').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void actions.uploadAvatar(file)
                    e.target.value = ''
                  }}
                />
                <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => avatarInput.current?.click()}>
                  Change photo
                </Button>
                <p className="mt-1 text-[9.5px] soft">{mode === 'supabase' ? 'Stored in Supabase Storage' : 'Stored locally in this browser'}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <Input
                  value={user?.email ?? ''}
                  placeholder={mode === 'local' ? 'Not set — browser-only workspace' : ''}
                  disabled
                />
              </Field>
              <Field label="College / institution">
                <Input value={profileForm.college} onChange={(e) => setProfileForm((f) => ({ ...f, college: e.target.value }))} placeholder="Optional" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Year">
                  <Select value={profileForm.academic_year} onChange={(e) => setProfileForm((f) => ({ ...f, academic_year: e.target.value }))}>
                    <option value="">Select</option>
                    {['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Semester">
                  <Select value={profileForm.semester} onChange={(e) => setProfileForm((f) => ({ ...f, semester: e.target.value }))}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button loading={savingProfile} onClick={() => void saveProfile()} icon={<Check className="h-4 w-4" />}>
                Save profile
              </Button>
              {mode === 'supabase' && (
                <Button variant="secondary" onClick={() => setPasswordOpen(true)} icon={<KeyRound className="h-4 w-4" />}>
                  Change password
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Appearance" subtitle="Dark mode is the default. Light mode is fully supported." />
            <div className="mt-4">
              <span className="label">Theme</span>
              <SegmentedControl<ThemeMode>
                value={prefs?.theme ?? 'dark'}
                onChange={(theme) => void actions.updatePreferences({ theme })}
                options={[
                  { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
                  { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
                  { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
                ]}
              />
            </div>
            <div className="mt-2 divide-y divide-[var(--border)]">
              <Switch
                checked={prefs?.reduced_motion ?? false}
                onChange={(reduced_motion) => void actions.updatePreferences({ reduced_motion })}
                label="Reduce motion"
                description="Minimise transitions and animated celebrations. Your operating-system reduced-motion setting is always respected."
              />
              <Switch
                checked={prefs?.sound_enabled ?? true}
                onChange={(sound_enabled) => void actions.updatePreferences({ sound_enabled })}
                label="Completion sound"
                description="A short chime when a session or break ends. Generated in-browser; no audio files required."
              />
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Focus defaults" subtitle="Applied when you start a new session" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Default focus minutes">
                <Select value={prefs?.default_focus_minutes ?? 25} onChange={(e) => void actions.updatePreferences({ default_focus_minutes: Number(e.target.value) })}>
                  {[15, 25, 30, 45, 50, 60, 90].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Short break minutes">
                <Input type="number" min={1} max={30} value={prefs?.break_minutes ?? 5} onChange={(e) => void actions.updatePreferences({ break_minutes: Math.max(1, Number(e.target.value) || 5) })} />
              </Field>
              <Field label="Long break minutes">
                <Input type="number" min={5} max={60} value={prefs?.long_break_minutes ?? 20} onChange={(e) => void actions.updatePreferences({ long_break_minutes: Math.max(5, Number(e.target.value) || 20) })} />
              </Field>
              <Field label="Sessions before a long break">
                <Input type="number" min={2} max={10} value={prefs?.sessions_before_long_break ?? 4} onChange={(e) => void actions.updatePreferences({ sessions_before_long_break: Math.max(2, Number(e.target.value) || 4) })} />
              </Field>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] soft">
              <Timer className="h-3 w-3" /> Breaks are never counted as study time.
            </p>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Targets & timezone" subtitle="Challenge targets and analytics use these values" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Daily target (hours)" hint={formatMinutes((prefs?.daily_target_minutes ?? 240), true)}>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  step={0.5}
                  value={(prefs?.daily_target_minutes ?? 240) / 60}
                  onChange={(e) => void actions.updatePreferences({ daily_target_minutes: Math.round((Number(e.target.value) || 1) * 60) })}
                />
              </Field>
              <Field label="Weekly target (hours)">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={Math.round((prefs?.weekly_target_minutes ?? 1680) / 60)}
                  onChange={(e) => void actions.updatePreferences({ weekly_target_minutes: Math.round((Number(e.target.value) || 1) * 60) })}
                />
              </Field>
              <Field label="Timezone">
                <Select value={prefs?.timezone ?? 'Asia/Kolkata'} onChange={(e) => void actions.updatePreferences({ timezone: e.target.value })}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] soft">
              <span>Today is {today} in {timezone}.</span>
              <Link to="/challenge" className="font-medium text-brand-300 hover:underline">
                Configure the 30-day challenge →
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title="Notifications"
              subtitle="Browser notifications only while the app or service worker can run"
              action={
                <Badge tone={permission === 'granted' ? 'success' : permission === 'denied' ? 'danger' : 'neutral'}>{permission}</Badge>
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<Bell className="h-3.5 w-3.5" />}
                onClick={async () => {
                  const result = await requestNotificationPermission()
                  setPermission(result)
                  if (result === 'granted') {
                    toast.success('Notifications enabled')
                    await showBrowserNotification('FOCUSFORGE notifications are on', 'Session completion, deadlines and daily reports will arrive here.', 'welcome')
                  } else if (result === 'denied') {
                    toast.warning('Notifications blocked', 'Enable them from your browser site settings.')
                  }
                }}
              >
                {permission === 'granted' ? 'Test notification' : 'Request permission'}
              </Button>
              <span className="text-[10px] soft">Permission state: {permission}</span>
            </div>
            <div className="mt-2 divide-y divide-[var(--border)]">
              {(
                [
                  ['session_end', 'Session completion', 'When a focus block reaches zero.'],
                  ['session_start', 'Upcoming scheduled sessions', 'Ten minutes before a timetable block.'],
                  ['breaks', 'Break completion', 'When an authorised break ends.'],
                  ['deadlines', 'Deadline reminders', 'When a task is due within 24 hours.'],
                  ['exams', 'Exam milestones', 'At 7, 3 and 1 days before an exam.'],
                  ['missed_sessions', 'Missed timetable blocks', 'Surfaced on the Focus Guardian page.'],
                  ['daily_target', 'Daily target reminders', 'When you are behind target in the evening.'],
                  ['daily_report', 'Daily report', 'An end-of-day accountability summary.'],
                ] as const
              ).map(([key, label, description]) => (
                <Switch
                  key={key}
                  checked={prefs?.notify?.[key] ?? true}
                  onChange={(value) => void actions.updatePreferences({ notify: { ...(prefs?.notify ?? {}), [key]: value } as UserPreferences['notify'] })}
                  label={label}
                  description={description}
                />
              ))}
            </div>
            <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[10px] leading-relaxed muted">
              <strong className="font-semibold">Browser limitation:</strong> reminders are generated while FOCUSFORGE is open (foreground or background tab) and rely on the browser
              Notification API and service worker. They cannot be guaranteed after the browser or operating system has fully closed the app, and iOS Safari requires the PWA to
              be installed to the home screen before notifications are permitted.
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Data & account" subtitle="Export everything or remove your data permanently" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={() => downloadFile(`focusforge-backup-${todayKey(timezone)}.json`, JSON.stringify(datasetExport(), null, 2))}
              >
                Export all data (JSON)
              </Button>
              <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={() => void actions.signOut()}>
                Sign out
              </Button>
            </div>
            <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
                <Trash2 className="h-3.5 w-3.5" /> Delete account & data
              </p>
              <p className="mt-1 text-[10px] leading-relaxed muted">
                Removes every study record owned by this account. In Supabase mode your auth record remains unless the project owner enables the deletion function; the
                service-role key can never be safely used in the browser.
              </p>
              <Button variant="danger" size="sm" className="mt-2" onClick={() => setDeleteOpen(true)}>
                Delete my data
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Workspace status" subtitle="Where your data actually lives" action={<Database className="h-4 w-4 soft" />} />
            <div className="mt-3 space-y-2 text-[10.5px]">
              {[
                ['Mode', mode === 'supabase' ? 'Supabase (cloud)' : 'Local browser workspace'],
                ['User ID', user?.id?.slice(0, 12) ?? '—'],
                ['Timezone', timezone],
                ['Sessions stored', `${data.sessions.length}`],
                ['Subjects', `${data.subjects.length}`],
                ['Tasks', `${data.tasks.length}`],
                ['Documents', `${data.resources.length}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-1.5">
                  <span className="muted">{k}</span>
                  <span className="truncate font-medium">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className={cn('p-5', mode === 'local' && 'border-amber-500/30')}>
            <SectionHeader
              title={isSupabaseConfigured ? 'Supabase connected' : 'Connect Supabase'}
              subtitle={isSupabaseConfigured ? 'Cloud accounts, RLS and multi-device sync are active.' : 'Required for secure accounts and real data isolation.'}
              action={<ShieldCheck className={cn('h-4 w-4', isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400')} />}
            />
            {isSupabaseConfigured ? (
              <ul className="mt-3 space-y-1.5 text-[10.5px] muted">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Email/password and Google authentication</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Row Level Security on every table</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Storage buckets for avatars and study documents</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" /> Password recovery enabled</li>
              </ul>
            ) : (
              <div className="mt-3 space-y-2 text-[10.5px] leading-relaxed muted">
                <p>Your current data lives in this browser only. To go live:</p>
                <ol className="ml-3 list-decimal space-y-1">
                  <li>Create a Supabase project.</li>
                  <li>Run <code className="rounded bg-black/20 px-1">supabase/migrations/0001_init.sql</code> in the SQL editor.</li>
                  <li>Create the <code className="rounded bg-black/20 px-1">avatars</code> and <code className="rounded bg-black/20 px-1">study-documents</code> storage buckets.</li>
                  <li>Copy <code className="rounded bg-black/20 px-1">.env.example</code> to <code className="rounded bg-black/20 px-1">.env</code> and set the two values below.</li>
                  <li>Restart the dev server and sign up.</li>
                </ol>
                <pre className="overflow-x-auto rounded-lg border border-[var(--border)] surface-1 p-2 text-[9.5px] leading-relaxed">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}
                </pre>
                <p className="text-[9.5px] soft">
                  Never place a service-role key in frontend environment variables. The anon key is safe only when RLS policies are in place — the migration includes them.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title="Keyboard & shortcuts" />
            <div className="mt-3 space-y-1.5 text-[10.5px]">
              {[
                ['Ctrl / ⌘ + K', 'Jump to any section'],
                ['Space', 'Pause or resume an active timer'],
                ['Enter', 'Confirm the open dialog'],
                ['Esc', 'Close dialogs without ending sessions'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <kbd className="rounded border border-[var(--border-strong)] surface-1 px-1.5 py-0.5 font-mono text-[9.5px]">{k}</kbd>
                  <span className="muted">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] soft">Shortcuts are additive; every action also has a visible control.</p>
          </Card>

          <Card className="p-5">
            <SectionHeader title="About FOCUSFORGE" />
            <p className="mt-2 text-[10.5px] leading-relaxed muted">
              A personal study operating system built for exam season. Timestamp-accurate sessions, honest accountability and analytics derived only from your persisted records.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="brand">v1.0.0</Badge>
              <Badge tone="neutral">PWA</Badge>
              <Badge tone="success">RLS ready</Badge>
              <Badge tone="violet">Timestamp engine</Badge>
            </div>
            <p className="mt-2 text-[9.5px] soft">Built with React, TypeScript, Vite, Tailwind, Framer Motion, Recharts and Supabase.</p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteConfirm('')
        }}
        title="Delete all your FOCUSFORGE data?"
        description="Type DELETE below to confirm. This cannot be undone unless you have exported a backup."
        confirmLabel={deleteConfirm === 'DELETE' ? 'Delete permanently' : 'Type DELETE to confirm'}
        onConfirm={async () => {
          if (deleteConfirm !== 'DELETE') {
            toast.error('Confirmation required', 'Type DELETE exactly to proceed.')
            return
          }
          const result = await actions.deleteAccount()
          if (result.error) toast.error('Deletion failed', result.error)
          else {
            toast.success('Workspace deleted')
            setDeleteOpen(false)
            navigate('/login')
          }
        }}
      />

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        description="Uses Supabase Auth. You will stay signed in on this device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={passwordBusy}
              onClick={async () => {
                setPasswordBusy(true)
                const res = await actions.updatePassword(newPassword)
                setPasswordBusy(false)
                if (res.error) toast.error('Could not update password', res.error)
                else {
                  toast.success('Password updated')
                  setPasswordOpen(false)
                  setNewPassword('')
                }
              }}
            >
              Update password
            </Button>
          </>
        }
      >
        <Field label="New password" hint="At least 6 characters.">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </Field>
      </Modal>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] soft">
        <Palette className="h-3 w-3" /> Settings save immediately. Profile fields require the Save button.
      </p>
    </div>
  )
}
