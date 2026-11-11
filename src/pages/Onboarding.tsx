import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Bell, BookOpen, CalendarClock, Check, GraduationCap, Plus, Target, Trash2, User } from 'lucide-react'
import { useApp } from '../lib/app-context'
import { Button, Field, Input, Modal, NumberInput, ProgressBar, Select, Switch } from '../components/ui'
import { SUBJECT_COLORS, addMinutesToTime, cn, formatMinutes, todayKey } from '../lib/utils'
import { toast } from '../lib/events'
import type { ExamType, SubjectColor } from '../lib/types'

interface DraftSubject {
  key: string
  name: string
  code: string
  color: SubjectColor
}

interface DraftExam {
  key: string
  subjectKey: string
  name: string
  date: string
  time: string
  type: ExamType
}

const STEPS = [
  { id: 0, label: 'Identity', icon: <User className="h-4 w-4" />, hint: 'Who is studying' },
  { id: 1, label: 'Subjects', icon: <BookOpen className="h-4 w-4" />, hint: 'What you are preparing' },
  { id: 2, label: 'Exams', icon: <GraduationCap className="h-4 w-4" />, hint: 'Your real deadlines' },
  { id: 3, label: 'Rhythm', icon: <Target className="h-4 w-4" />, hint: 'Daily targets' },
]

export default function Onboarding() {
  const { data, prefs, actions } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(data.profile?.full_name ?? '')
  const [college, setCollege] = useState(data.profile?.college ?? '')
  const [year, setYear] = useState(data.profile?.academic_year ?? '')
  const [semester, setSemester] = useState(data.profile?.semester ?? '')

  const [subjects, setSubjects] = useState<DraftSubject[]>([])
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', color: 'blue' as SubjectColor })
  const [exams, setExams] = useState<DraftExam[]>([])
  const [examOpen, setExamOpen] = useState(false)
  const [examForm, setExamForm] = useState<{ subjectKey: string; name: string; date: string; time: string; type: ExamType }>({
    subjectKey: '',
    name: '',
    date: todayKey(),
    time: '09:00',
    type: 'final',
  })
  const [dailyHours, setDailyHours] = useState(Math.round((prefs?.daily_target_minutes ?? 240) / 60))
  const [focusMinutes, setFocusMinutes] = useState(prefs?.default_focus_minutes ?? 25)
  const [startChallenge, setStartChallenge] = useState(true)
  const [notifyEnabled, setNotifyEnabled] = useState(prefs?.notify.session_end ?? true)

  const totalGoal = useMemo(() => dailyHours * 60, [dailyHours])

  const addSubject = () => {
    if (!subjectForm.name.trim()) return
    setSubjects((s) => [
      ...s,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
        color: subjectForm.color,
      },
    ])
    setSubjectForm((f) => ({ ...f, name: '', code: '', color: (['blue', 'violet', 'mint', 'amber', 'rose', 'cyan'] as SubjectColor[])[(subjects.length + 1) % 6] }))
  }

  const removeSubject = (key: string) => {
    setSubjects((s) => s.filter((x) => x.key !== key))
    setExams((e) => e.filter((x) => x.subjectKey !== key))
  }

  const addExam = () => {
    const subject = subjects.find((s) => s.key === examForm.subjectKey)
    if (!subject) return
    setExams((e) => [
      ...e,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subjectKey: examForm.subjectKey,
        name: examForm.name.trim() || `${subject.name} examination`,
        date: examForm.date,
        time: examForm.time,
        type: examForm.type,
      },
    ])
    setExamForm({ subjectKey: '', name: '', date: todayKey(), time: '09:00', type: 'final' })
    setExamOpen(false)
  }

  const finish = async (skip = false) => {
    if (!skip && !name.trim()) {
      setError('Add your name so your dashboard can greet you properly.')
      setStep(0)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await actions.updateProfile({
        full_name: name.trim() || data.profile?.full_name || 'Student',
        college: college.trim() || null,
        academic_year: year || null,
        semester: semester || null,
        onboarded: true,
      })
      if (!skip) {
        const idMap = new Map<string, string>()
        for (const draft of subjects) {
          const created = await actions.addSubject({ name: draft.name, code: draft.code, color: draft.color })
          if (created) idMap.set(draft.key, created.id)
        }
        for (const exam of exams) {
          await actions.addExam({
            subject_id: idMap.get(exam.subjectKey) ?? null,
            name: exam.name,
            exam_date: exam.date,
            exam_time: exam.time,
            exam_type: exam.type,
            venue: null,
            notes: null,
          })
        }
        await actions.updatePreferences({
          daily_target_minutes: dailyHours * 60,
          weekly_target_minutes: dailyHours * 60 * 7,
          default_focus_minutes: focusMinutes,
          break_minutes: focusMinutes >= 50 ? 10 : 5,
          timezone: prefs?.timezone ?? 'Asia/Kolkata',
          notify: {
            ...(prefs?.notify ?? {
              session_end: true,
              session_start: true,
              breaks: true,
              deadlines: true,
              exams: true,
              missed_sessions: true,
              daily_target: true,
              daily_report: true,
            }),
            session_end: notifyEnabled,
          },
        })
        if (startChallenge) {
          await actions.createChallenge({
            name: '30-Day Exam Preparation Challenge',
            startDate: todayKey(prefs?.timezone),
            days: 30,
            dailyHours,
            weeklyRevisionTarget: 3,
            subjectPriorities: [...idMap.values()].slice(0, 3),
          })
        }
        await actions.syncChallengeProgress()
      }
      toast.success('Workspace ready', skip ? 'You can finish setup any time in Settings.' : 'Your study system is configured.')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish onboarding.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-bg min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">Welcome to FOCUSFORGE</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Let's configure your study system</h1>
            <p className="mt-1 text-[13px] muted">Four short steps. Nothing is hardcoded — this is your semester, your dates, your targets.</p>
          </div>
          <Button variant="ghost" onClick={() => void finish(true)} loading={saving}>
            Skip for now
          </Button>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-4">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                step === s.id ? 'border-brand-400/40 bg-brand-500/10' : step > s.id ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-[var(--border)] surface-1',
              )}
            >
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', step === s.id ? 'bg-brand-500/20 text-brand-300' : step > s.id ? 'bg-emerald-500/15 text-emerald-400' : 'surface-2 muted')}>
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-semibold">{s.label}</span>
                <span className="block truncate text-[9.5px] soft">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="panel overflow-hidden">
          <ProgressBar value={(step + 1) / STEPS.length} height="h-1" className="rounded-none" />
          <div className="p-5 sm:p-7">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
                {step === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Student profile</h2>
                      <p className="mt-1 text-xs muted">Used for greetings, reports and your academic context.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name" className="sm:col-span-2">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoFocus />
                      </Field>
                      <Field label="College / institution (optional)">
                        <Input value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. NIT Trichy" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Academic year">
                          <Select value={year} onChange={(e) => setYear(e.target.value)}>
                            <option value="">Select</option>
                            {['1st year', '2nd year', '3rd year', '4th year', 'Postgraduate'].map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Semester">
                          <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={String(s)}>
                                Semester {s}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    </div>
                    <p className="text-[11px] soft">Timezone is set to {prefs?.timezone ?? 'Asia/Kolkata'} and can be changed later in Settings.</p>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Your subjects</h2>
                      <p className="mt-1 text-xs muted">Add the subjects in this semester. You can build units and topics later.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                      <Input value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="Subject name (e.g. Thermodynamics)" onKeyDown={(e) => e.key === 'Enter' && addSubject()} />
                      <Input value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} placeholder="Code (optional)" />
                      <Button variant="secondary" onClick={addSubject} icon={<Plus className="h-4 w-4" />}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(SUBJECT_COLORS) as SubjectColor[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setSubjectForm((f) => ({ ...f, color: c }))}
                          aria-label={c}
                          className={cn('h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-[var(--panel-solid)] transition', SUBJECT_COLORS[c].dot, subjectForm.color === c ? 'ring-white/40' : 'ring-transparent')}
                        />
                      ))}
                    </div>
                    {subjects.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-xs muted">
                        No subjects yet. Add at least one to unlock subject analytics — or skip and add them later.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {subjects.map((s) => (
                          <div key={s.key} className="flex items-center gap-3 rounded-xl border border-[var(--border)] surface-1 px-3 py-2.5">
                            <span className={cn('h-2.5 w-2.5 rounded-full', SUBJECT_COLORS[s.color].dot)} />
                            <span className="text-sm font-medium">{s.name}</span>
                            {s.code && <span className="text-[11px] soft">{s.code}</span>}
                            <button onClick={() => removeSubject(s.key)} className="ml-auto rounded p-1 soft transition hover:text-rose-400" aria-label={`Remove ${s.name}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold">Examination dates</h2>
                        <p className="mt-1 text-xs muted">Only real dates you enter are shown. FOCUSFORGE never invents a timetable.</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={subjects.length === 0}
                        onClick={() => {
                          setExamForm((f) => ({ ...f, subjectKey: subjects[0]?.key ?? '' }))
                          setExamOpen(true)
                        }}
                        icon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Add exam
                      </Button>
                    </div>
                    {subjects.length === 0 && (
                      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-600 dark:text-amber-300">
                        Add a subject first so each exam can be linked to it.
                      </p>
                    )}
                    {exams.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-xs muted">
                        No exams added. You can add or edit them from the Examination Tracker at any time.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {exams.map((e) => {
                          const subject = subjects.find((s) => s.key === e.subjectKey)
                          return (
                            <div key={e.key} className="flex items-center gap-3 rounded-xl border border-[var(--border)] surface-1 px-3 py-2.5">
                              <CalendarClock className="h-4 w-4 text-brand-300" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{e.name}</p>
                                <p className="text-[10px] muted">
                                  {e.date} · {e.time} · {subject?.name ?? 'General'}
                                </p>
                              </div>
                              <button onClick={() => setExams((list) => list.filter((x) => x.key !== e.key))} className="rounded p-1 soft hover:text-rose-400" aria-label="Remove exam">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-display text-lg font-semibold">Your daily rhythm</h2>
                      <p className="mt-1 text-xs muted">Realistic targets beat heroic ones. You can tune these any day.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Daily study target (hours)" hint={`That is ${formatMinutes(totalGoal)} per day.`}>
                        <NumberInput min={1} max={16} value={dailyHours} onValueChange={setDailyHours} />
                      </Field>
                      <Field label="Preferred focus block" hint="Used as the default timer duration.">
                        <Select value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value))}>
                          {[15, 25, 30, 45, 50, 60, 90].map((m) => (
                            <option key={m} value={m}>
                              {m} minutes
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] surface-1 px-3 py-2 text-[11px] muted">
                      A {focusMinutes}-minute block starting now ends at {addMinutesToTime(new Date().toTimeString().slice(0, 5), focusMinutes)}.
                    </div>
                    <Switch checked={startChallenge} onChange={setStartChallenge} label="Start the 30-day exam preparation challenge" description="Day 1 begins today with your daily target. Missed days are recorded honestly but never reset the challenge." />
                    <Switch checked={notifyEnabled} onChange={setNotifyEnabled} label="Session completion notifications" description="Requires browser permission. Notifications cannot be guaranteed after the browser is fully closed." />
                    <div className="flex items-start gap-2 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3 text-[11px] muted leading-relaxed">
                      <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                      You can grant notification permission from Settings or the Focus Room. FOCUSFORGE never sends fake reminders.
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {error && <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-400">{error}</p>}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-[11px] soft sm:block">
                  Step {step + 1} of {STEPS.length}
                </span>
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} iconRight={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                ) : (
                  <Button onClick={() => void finish(false)} loading={saving} icon={<Check className="h-4 w-4" />}>
                    Enter FOCUSFORGE
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={examOpen}
        onClose={() => setExamOpen(false)}
        title="Add an examination"
        description="Use the official date from your exam schedule."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExamOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addExam}>Add exam</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Subject">
            <Select value={examForm.subjectKey} onChange={(e) => setExamForm((f) => ({ ...f, subjectKey: e.target.value }))}>
              {subjects.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam name">
            <Input value={examForm.name} onChange={(e) => setExamForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. End Semester Theory" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <Input type="date" value={examForm.date} onChange={(e) => setExamForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Time">
              <Input type="time" value={examForm.time} onChange={(e) => setExamForm((f) => ({ ...f, time: e.target.value }))} />
            </Field>
          </div>
          <Field label="Exam type">
            <Select value={examForm.type} onChange={(e) => setExamForm((f) => ({ ...f, type: e.target.value as ExamType }))}>
              {['midterm', 'final', 'quiz', 'practical', 'viva', 'other'].map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
