import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import type { ExamSchedule, ExamType } from '../lib/types'
import { examCountdown, examReadiness, subjectStats } from '../lib/metrics'
import { cn, formatClock12, formatDateLong, subjectColor } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, SectionHeader, Select, Textarea } from '../components/ui'
import { toast } from '../lib/events'

const TYPE_LABEL: Record<ExamType, string> = {
  midterm: 'Midterm',
  final: 'Final',
  quiz: 'Quiz',
  practical: 'Practical',
  viva: 'Viva',
  other: 'Other',
}

export default function Exams() {
  const { data, actions, timezone, today, prefs } = useApp()
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExamSchedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExamSchedule | null>(null)
  const [form, setForm] = useState({
    name: '',
    subjectId: '',
    date: today,
    time: '09:00',
    type: 'final' as ExamType,
    venue: '',
    notes: '',
  })

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', subjectId: data.subjects[0]?.id ?? '', date: today, time: '09:00', type: 'final', venue: '', notes: '' })
    setModalOpen(true)
  }

  const openEdit = (exam: ExamSchedule) => {
    setEditing(exam)
    setForm({
      name: exam.name,
      subjectId: exam.subject_id ?? '',
      date: exam.exam_date,
      time: exam.exam_time ?? '09:00',
      type: exam.exam_type,
      venue: exam.venue ?? '',
      notes: exam.notes ?? '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Exam name required')
      return
    }
    if (!form.date) {
      toast.error('Exam date required')
      return
    }
    const payload = {
      name: form.name.trim(),
      subject_id: form.subjectId || null,
      exam_date: form.date,
      exam_time: form.time,
      exam_type: form.type,
      venue: form.venue.trim() || null,
      notes: form.notes.trim() || null,
    }
    if (editing) {
      await actions.updateExam(editing.id, payload)
      toast.success('Exam updated')
    } else {
      await actions.addExam(payload)
    }
    setModalOpen(false)
  }

  // An exam stays "upcoming" until its start time today has passed, not just until midnight.
  const examMoment = (exam: ExamSchedule) => new Date(`${exam.exam_date}T${exam.exam_time ?? '23:59'}:00`).getTime()
  const upcoming = useMemo(
    () => data.exams.filter((e) => examMoment(e) >= now).sort((a, b) => a.exam_date.localeCompare(b.exam_date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.exams, now],
  )
  const past = useMemo(
    () => data.exams.filter((e) => examMoment(e) < now).sort((a, b) => b.exam_date.localeCompare(a.exam_date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.exams, now],
  )
  const subjects = subjectStats(data, prefs)
  const atRisk = subjects.filter((s) => s.daysToExam !== null && s.daysToExam <= 14 && s.progress < 60)
  const avgReadiness = upcoming.length
    ? Math.round(upcoming.reduce((sum, exam) => sum + examReadiness(data, exam).progress, 0) / upcoming.length)
    : 0

  const examCard = (exam: ExamSchedule, pastExam = false) => {
    const subject = data.subjects.find((s) => s.id === exam.subject_id)
    const countdown = examCountdown(exam, timezone, now)
    const readiness = examReadiness(data, exam)
    const risky = readiness.progress < 50 && countdown.days <= 10 && !pastExam
    const color = subjectColor(subject?.color)
    return (
      <motion.div key={exam.id} layout className={cn('panel overflow-hidden p-4', pastExam && 'opacity-70')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color.hex}1a`, color: color.hex }}>
              <GraduationCap className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{exam.name}</p>
              <p className="mt-0.5 text-[10.5px] muted">
                {subject?.name ?? 'General'} · {TYPE_LABEL[exam.exam_type]}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] soft">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {formatDateLong(exam.exam_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatClock12(exam.exam_time)}
                </span>
                {exam.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {exam.venue}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <div className="text-right">
              {pastExam ? (
                <Badge tone="neutral">Completed</Badge>
              ) : (
                <>
                  <p className={cn('font-display text-3xl font-semibold leading-none tracking-tight', countdown.days <= 3 && 'text-rose-400', countdown.days <= 7 && countdown.days > 3 && 'text-amber-400')}>
                    {countdown.days}
                  </p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-wider soft">days left</p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => openEdit(exam)} className="rounded p-1 soft hover:text-[var(--text)]" aria-label="Edit exam">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => setDeleteTarget(exam)} className="rounded p-1 soft hover:text-rose-400" aria-label="Delete exam">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] surface-1 px-2 py-1.5">
            <p className="soft">Hours left</p>
            <p className="font-semibold">{pastExam ? '—' : `${countdown.hours}h ${countdown.minutes}m`}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] surface-1 px-2 py-1.5">
            <p className="soft">Readiness</p>
            <p className="font-semibold">{readiness.progress}%</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] surface-1 px-2 py-1.5">
            <p className="soft">Pending chapters</p>
            <p className="font-semibold">{readiness.pendingTopics}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] surface-1 px-2 py-1.5">
            <p className="soft">Need revision</p>
            <p className="font-semibold">{readiness.revision}</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] muted">
            <span>Preparation coverage</span>
            <span>{readiness.progress}%</span>
          </div>
          <ProgressBar value={readiness.progress / 100} className="mt-1" height="h-1.5" tone={readiness.progress >= 75 ? 'success' : readiness.progress >= 40 ? 'brand' : 'warning'} />
        </div>

        {risky && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-[10px] leading-relaxed text-amber-600 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Low preparation with {countdown.days} days remaining. Prioritise unfinished chapters in your next focus blocks.
          </p>
        )}
        {exam.notes && <p className="mt-2 text-[10.5px] muted">{exam.notes}</p>}
        {!pastExam && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] soft">Exam at {formatClock12(exam.exam_time)} · {timezone}</span>
            <Button size="sm" variant="ghost" onClick={() => openEdit(exam)} icon={<ChevronRight className="h-3 w-3" />}>
              Update preparation
            </Button>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Countdown to performance"
        title="Examination Tracker"
        description="Only the dates you enter appear here. Readiness is derived from your real topic coverage, not an invented estimate."
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            Add examination
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Upcoming exams</p>
          <p className="mt-1 font-display text-xl font-semibold">{upcoming.length}</p>
          <p className="text-[10px] muted">{past.length} completed</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Next exam</p>
          <p className="mt-1 font-display text-xl font-semibold">{upcoming[0] ? `${examCountdown(upcoming[0], timezone, now).days}d` : '—'}</p>
          <p className="truncate text-[10px] muted">{upcoming[0]?.name ?? 'No upcoming exam'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Average readiness</p>
          <p className="mt-1 font-display text-xl font-semibold">{avgReadiness}%</p>
          <ProgressBar value={avgReadiness / 100} height="h-1" className="mt-2" tone={avgReadiness >= 60 ? 'success' : 'warning'} />
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">At risk</p>
          <p className={cn('mt-1 font-display text-xl font-semibold', atRisk.length > 0 && 'text-rose-400')}>{atRisk.length}</p>
          <p className="text-[10px] muted">Exam in ≤14d and &lt;60% ready</p>
        </Card>
      </div>

      {data.exams.length === 0 ? (
        <Card className="mt-4 p-6">
          <EmptyState
            icon={<GraduationCap className="h-5 w-5" />}
            title="No examinations added"
            description="Add your official exam dates. The countdown, preparation percentage and revision alerts all build from this list."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
                  Add examination
                </Button>
                {data.subjects.length === 0 && (
                  <Button variant="secondary" onClick={() => navigate('/subjects')} icon={<BookOpen className="h-4 w-4" />}>
                    Add subjects first
                  </Button>
                )}
              </div>
            }
          />
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <SectionHeader title="Upcoming" subtitle={`${upcoming.length} scheduled examinations`} />
            {upcoming.length === 0 ? (
              <Card className="p-6">
                <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No upcoming exams" description="All entered exams are in the past. Add your next examination when the schedule is published." action={<Button size="sm" variant="secondary" onClick={openCreate}>Add examination</Button>} />
              </Card>
            ) : (
              upcoming.map((exam) => examCard(exam))
            )}
            {past.length > 0 && (
              <>
                <div className="pt-2">
                  <SectionHeader title="Past examinations" subtitle="Kept for your academic record" />
                </div>
                {past.map((exam) => examCard(exam, true))}
              </>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Subject readiness" subtitle="Coverage and time to exam" />
              <div className="mt-3 space-y-2.5">
                {subjects.map((s) => {
                  const color = subjectColor(s.subject.color)
                  return (
                    <div key={s.subject.id}>
                      <div className="flex items-center justify-between gap-2 text-[10.5px]">
                        <span className="flex min-w-0 items-center gap-1.5 muted">
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', color.dot)} />
                          <span className="truncate">{s.subject.name}</span>
                        </span>
                        <span className={cn('shrink-0 font-medium', s.daysToExam !== null && s.daysToExam <= 7 && s.progress < 60 ? 'text-rose-400' : '')}>
                          {s.progress}% · {s.daysToExam !== null ? `${s.daysToExam}d` : 'no exam'}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full surface-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.progress}%` }} className="h-full rounded-full" style={{ backgroundColor: color.hex }} />
                      </div>
                    </div>
                  )
                })}
                {subjects.length === 0 && <p className="text-[11px] muted">Add subjects to see readiness.</p>}
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeader title="Preparation focus" subtitle="Automatically highlighted risks" />
              <div className="mt-3 space-y-2">
                {atRisk.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-4 text-[10.5px] muted">
                    No subjects currently at risk. Keep topic statuses updated for accurate readiness.
                  </p>
                ) : (
                  atRisk.map((s) => (
                    <div key={s.subject.id} className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] p-2.5">
                      <p className="text-[11px] font-semibold">{s.subject.name}</p>
                      <p className="mt-0.5 text-[10px] muted">
                        {s.progress}% coverage · exam in {s.daysToExam} days · {s.pendingTasks} tasks pending
                      </p>
                    </div>
                  ))
                )}
                <div className="flex items-start gap-2 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3 text-[10px] leading-relaxed muted">
                  <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
                  Readiness = topics completed or marked for revision, divided by total topics for the subject. Nothing is estimated or fabricated.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit examination' : 'Add examination'}
        description="Use the official schedule from your institution."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{editing ? 'Save changes' : 'Add examination'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Examination name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. End Semester Examination — Theory" autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
                <option value="">General</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Exam type">
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExamType }))}>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
            <Field label="Start time">
              <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </Field>
          </div>
          <Field label="Venue (optional)">
            <Input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="e.g. Block C — Hall 2" />
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Syllabus coverage, allowed materials, seating notes…" />
          </Field>
          <p className="text-[10.5px] soft">Timezone {timezone}. FOCUSFORGE never generates exam dates for you.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this examination?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed from your countdown.` : ''}
        confirmLabel="Delete exam"
        onConfirm={async () => {
          if (!deleteTarget) return
          await actions.deleteExam(deleteTarget.id)
          setDeleteTarget(null)
          toast.success('Exam deleted')
        }}
      />
    </div>
  )
}
