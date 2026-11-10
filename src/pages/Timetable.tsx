import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  GripVertical,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import type { Recurrence, TimetableEntry } from '../lib/types'
import { useFocus } from '../lib/focus'
import {
  addMinutesToTime,
  cn,
  formatClock12,
  formatMinutes,
  keyToDate,
  minutesBetweenTimes,
  nowTimeHHMM,
  overlaps,
  subjectColor,
  todayKey,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  weekdayOfKey,
} from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, SectionHeader, SegmentedControl, Select, StatCard, Textarea } from '../components/ui'
import { SessionLauncher, type LaunchContext } from '../components/session-launcher'
import { toast } from '../lib/events'

type View = 'day' | 'week' | 'month'

const EMPTY_FORM = {
  title: '',
  subjectId: '',
  topic: '',
  dayOfWeek: new Date().getDay(),
  start: '18:00',
  end: '19:00',
  recurrence: 'weekly' as Recurrence,
  priority: 3 as 1 | 2 | 3,
  description: '',
}

export default function Timetable() {
  const { data, today, actions, prefs } = useApp()
  const focus = useFocus()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>('week')
  const [selectedDay, setSelectedDay] = useState(weekdayOfKey(today))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TimetableEntry | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [dragging, setDragging] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null)
  const [launch, setLaunch] = useState<LaunchContext | null>(null)
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = keyToDate(today)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  useEffect(() => {
    if (params.get('new') === '1') {
      openCreate()
      params.delete('new')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  function openCreate(day?: number) {
    setEditing(null)
    setForm({ ...EMPTY_FORM, dayOfWeek: day ?? (view === 'day' ? selectedDay : new Date().getDay()), start: nowTimeHHMM(30), end: nowTimeHHMM(85) })
    setConflict(null)
    setModalOpen(true)
  }

  function openEdit(entry: TimetableEntry) {
    setEditing(entry)
    setForm({
      title: entry.title,
      subjectId: entry.subject_id ?? '',
      topic: entry.topic ?? '',
      dayOfWeek: entry.day_of_week,
      start: entry.start_time,
      end: entry.end_time,
      recurrence: entry.recurrence,
      priority: entry.priority,
      description: entry.description ?? '',
    })
    setConflict(null)
    setModalOpen(true)
  }

  const weekdayEntries = (day: number) =>
    data.entries
      .filter((e) => e.day_of_week === day || e.recurrence === 'daily')
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const scheduledMinutes = useMemo(
    () => data.entries.reduce((sum, e) => sum + minutesBetweenTimes(e.start_time, e.end_time), 0),
    [data.entries],
  )
  const completedCount = data.entries.filter((e) => e.status === 'completed').length
  const completionRate = data.entries.length ? completedCount / data.entries.length : 0
  const availableWeekly = 17 * 60 * 7
  const subjectHours = data.subjects
    .map((s) => ({
      subject: s,
      minutes: data.entries.filter((e) => e.subject_id === s.id).reduce((sum, e) => sum + minutesBetweenTimes(e.start_time, e.end_time), 0),
    }))
    .filter((x) => x.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

  const findConflict = (): string | null => {
    const others = data.entries.filter((e) => e.id !== editing?.id)
    for (const other of others) {
      const sameDay = other.day_of_week === form.dayOfWeek || other.recurrence === 'daily' || form.recurrence === 'daily'
      if (sameDay && overlaps(form.start, form.end, other.start_time, other.end_time)) {
        return `"${other.title}" already occupies ${formatClock12(other.start_time)}–${formatClock12(other.end_time)} on ${WEEKDAYS[other.day_of_week]}.`
      }
    }
    return null
  }

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Title required', 'Give this block a clear name.')
      return
    }
    if (form.end <= form.start) {
      toast.error('Invalid time range', 'End time must be after start time.')
      return
    }
    const clash = findConflict()
    if (clash && !conflict) {
      setConflict(clash)
      return
    }
    const payload = {
      title: form.title.trim(),
      subject_id: form.subjectId || null,
      topic_id: null,
      topic: form.topic.trim() || null,
      day_of_week: form.dayOfWeek,
      start_time: form.start,
      end_time: form.end,
      recurrence: form.recurrence,
      priority: form.priority,
      description: form.description.trim() || null,
    }
    if (editing) {
      await actions.updateEntry(editing.id, payload)
      toast.success('Schedule updated', 'Your timetable changes are saved.')
    } else {
      await actions.addEntry(payload)
      toast.success('Session scheduled', `${payload.title} added to ${WEEKDAYS[form.dayOfWeek]}.`)
    }
    setModalOpen(false)
    setConflict(null)
  }

  const copyToDay = async (entry: TimetableEntry, day: number) => {
    await actions.addEntry({
      title: entry.title,
      subject_id: entry.subject_id,
      topic_id: entry.topic_id,
      topic: entry.topic,
      day_of_week: day,
      start_time: entry.start_time,
      end_time: entry.end_time,
      recurrence: 'weekly',
      priority: entry.priority,
      description: entry.description,
    })
    toast.success('Session duplicated', `Copied to ${WEEKDAYS[day]}.`)
  }

  const monthDays = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const first = new Date(year, month, 1)
    const startOffset = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ date: Date | null; key: string | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      cells.push({ date, key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: null })
    return cells
  }, [monthCursor])

  const dayEntries = weekdayEntries(selectedDay)
  const dayMinutes = dayEntries.reduce((s, e) => s + minutesBetweenTimes(e.start_time, e.end_time), 0)

  const renderEntry = (entry: TimetableEntry, compact = false) => {
    const subject = data.subjects.find((s) => s.id === entry.subject_id)
    const color = subjectColor(subject?.color)
    return (
      <motion.div
        key={entry.id}
        layout
        draggable
        onDragStart={() => setDragging(entry.id)}
        onDragEnd={() => setDragging(null)}
        className={cn(
          'group relative cursor-grab rounded-xl border px-2.5 py-2 transition active:cursor-grabbing',
          dragging === entry.id ? 'opacity-40' : '',
          entry.status === 'completed'
            ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
            : entry.status === 'missed'
              ? 'border-rose-500/20 bg-rose-500/[0.05]'
              : 'border-[var(--border)] surface-1 hover:border-[var(--border-strong)]',
        )}
      >
        <div className="flex items-start gap-1.5">
          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', color.dot)} />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-[11px] font-medium leading-snug', entry.status === 'completed' && 'line-through opacity-60')}>{entry.title}</p>
            <p className="truncate text-[9px] muted">
              {formatClock12(entry.start_time)}–{formatClock12(entry.end_time)}
              {!compact && entry.topic ? ` · ${entry.topic}` : ''}
            </p>
            {!compact && (
              <div className="mt-1 flex items-center gap-1">
                {entry.priority === 1 && <Badge tone="danger">must do</Badge>}
                {entry.recurrence === 'daily' && <Badge tone="neutral">daily</Badge>}
                {entry.status === 'completed' && <Badge tone="success">done</Badge>}
                {entry.status === 'missed' && <Badge tone="danger">missed</Badge>}
              </div>
            )}
          </div>
        </div>
        {!compact && (
          <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() =>
                setLaunch({
                  entryId: entry.id,
                  subjectId: entry.subject_id,
                  topic: entry.topic ?? entry.title,
                  minutes: minutesBetweenTimes(entry.start_time, entry.end_time) || 25,
                  mode: 'custom',
                })
              }
              className="rounded p-1 text-brand-300 transition hover:surface-2"
              aria-label="Start session"
              disabled={Boolean(focus.session)}
            >
              <Play className="h-3 w-3" />
            </button>
            <button onClick={() => openEdit(entry)} className="rounded p-1 soft transition hover:surface-2 hover:text-[var(--text)]" aria-label="Edit entry">
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => void actions.updateEntry(entry.id, { status: entry.status === 'completed' ? 'pending' : 'completed' })}
              className="rounded p-1 soft transition hover:surface-2 hover:text-emerald-400"
              aria-label="Toggle completion"
            >
              <Check className="h-3 w-3" />
            </button>
            <button onClick={() => copyToDay(entry, (entry.day_of_week + 1) % 7)} className="rounded p-1 soft transition hover:surface-2 hover:text-[var(--text)]" aria-label="Duplicate to next day">
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={() => setDeleteTarget(entry)} className="ml-auto rounded p-1 soft transition hover:surface-2 hover:text-rose-400" aria-label="Delete entry">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Design your week"
        title="Timetable"
        description="Build a realistic weekly plan. Conflicts are detected, drag a block to another day to reschedule it, and launch any session directly."
        actions={
          <>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
            />
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              Add session
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scheduled weekly" value={formatMinutes(scheduledMinutes, true)} icon={<CalendarDays className="h-4 w-4" />} hint={`${data.entries.length} recurring blocks`} />
        <StatCard label="Unscheduled waking time" value={formatMinutes(Math.max(0, availableWeekly - scheduledMinutes), true)} icon={<Clock className="h-4 w-4" />} hint="Based on a 17-hour waking day" tone="violet" />
        <StatCard label="Completion" value={`${Math.round(completionRate * 100)}%`} icon={<Check className="h-4 w-4" />} hint={`${completedCount} of ${data.entries.length} blocks completed`} tone="success" progress={completionRate} />
        <StatCard label="Subjects scheduled" value={subjectHours.length} icon={<RefreshCw className="h-4 w-4" />} hint="Subjects with timetable time" tone="warning" />
      </div>

      {data.entries.length === 0 ? (
        <Card className="mt-4 p-6">
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="Your timetable is empty"
            description="Add recurring study blocks for each subject. A plan you can see is a plan you can follow."
            action={<Button onClick={() => openCreate()} icon={<Plus className="h-4 w-4" />}>Create your first block</Button>}
          />
        </Card>
      ) : view === 'week' ? (
        <Card className="mt-4 overflow-hidden p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionHeader title="Weekly board" subtitle="Drag any block onto another day to reschedule it instantly." />
            <Badge tone="brand">{formatMinutes(scheduledMinutes, true)} planned</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {WEEKDAYS.map((day, index) => {
              const entries = weekdayEntries(index)
              const isToday = index === weekdayOfKey(today)
              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragging) return
                    const entry = data.entries.find((e) => e.id === dragging)
                    setDragging(null)
                    if (entry && entry.day_of_week !== index) {
                      void actions.updateEntry(entry.id, { day_of_week: index })
                      toast.success('Session rescheduled', `${entry.title} moved to ${day}.`)
                    }
                  }}
                  className={cn(
                    'min-h-[220px] rounded-xl border p-2 transition',
                    isToday ? 'border-brand-400/35 bg-brand-500/[0.05]' : 'border-[var(--border)] surface-1',
                    dragging && 'border-dashed border-brand-400/40',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between px-0.5">
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wider', isToday ? 'text-brand-300' : 'soft')}>{WEEKDAYS_SHORT[index]}</span>
                    <button onClick={() => openCreate(index)} className="rounded p-0.5 soft hover:text-[var(--text)]" aria-label={`Add block on ${day}`}>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {entries.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-2 py-4 text-center text-[9.5px] soft">No blocks</p>
                    ) : (
                      entries.map((entry) => renderEntry(entry, true))
                    )}
                  </div>
                  {entries.length > 0 && (
                    <p className="mt-2 px-0.5 text-[9px] soft">
                      {formatMinutes(entries.reduce((s, e) => s + minutesBetweenTimes(e.start_time, e.end_time), 0), true)} planned
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ) : view === 'day' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setSelectedDay((d) => (d + 6) % 7)} className="rounded-lg border border-[var(--border)] p-1.5 transition hover:surface-2" aria-label="Previous day">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <h2 className="min-w-[130px] px-2 text-sm font-semibold">
                  {WEEKDAYS[selectedDay]}
                  {selectedDay === weekdayOfKey(today) && <span className="ml-1.5 text-[10px] font-medium text-brand-300">today</span>}
                </h2>
                <button onClick={() => setSelectedDay((d) => (d + 1) % 7)} className="rounded-lg border border-[var(--border)] p-1.5 transition hover:surface-2" aria-label="Next day">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{formatMinutes(dayMinutes, true)} planned</Badge>
                <Button size="sm" variant="secondary" onClick={() => openCreate(selectedDay)} icon={<Plus className="h-3.5 w-3.5" />}>
                  Add
                </Button>
              </div>
            </div>
            {dayEntries.length === 0 ? (
              <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={`Nothing planned for ${WEEKDAYS[selectedDay]}`} description="Add a block or drag one over from another day on the weekly board." className="py-10" />
            ) : (
              <div className="relative space-y-2">
                {dayEntries.map((entry) => {
                  const subject = data.subjects.find((s) => s.id === entry.subject_id)
                  const color = subjectColor(subject?.color)
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="w-16 shrink-0 pt-2 text-right">
                        <p className="text-[10.5px] font-semibold">{formatClock12(entry.start_time)}</p>
                        <p className="text-[9px] soft">{formatClock12(entry.end_time)}</p>
                      </div>
                      <div className="relative w-2 shrink-0">
                        <span className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: color.hex }} />
                        <span className="absolute left-1/2 top-5 h-[calc(100%-12px)] w-px -translate-x-1/2" style={{ backgroundColor: `${color.hex}33` }} />
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] surface-1 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn('truncate text-xs font-semibold', entry.status === 'completed' && 'line-through opacity-60')}>{entry.title}</p>
                              {entry.priority === 1 && <Badge tone="danger">must do</Badge>}
                              {entry.status === 'missed' && <Badge tone="danger">missed</Badge>}
                              {entry.status === 'completed' && <Badge tone="success">done</Badge>}
                            </div>
                            <p className="mt-0.5 text-[10px] muted">
                              {subject?.name ?? 'General'} · {minutesBetweenTimes(entry.start_time, entry.end_time)} min
                              {entry.recurrence === 'daily' ? ' · every day' : ''}
                            </p>
                            {entry.topic && <p className="mt-1 text-[10.5px] muted">{entry.topic}</p>}
                            {entry.description && <p className="mt-1 text-[10px] soft">{entry.description}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                setLaunch({
                                  entryId: entry.id,
                                  subjectId: entry.subject_id,
                                  topic: entry.topic ?? entry.title,
                                  minutes: minutesBetweenTimes(entry.start_time, entry.end_time) || 25,
                                  mode: 'custom',
                                })
                              }
                              icon={<Play className="h-3 w-3" />}
                              disabled={Boolean(focus.session)}
                            >
                              Start
                            </Button>
                            <button onClick={() => openEdit(entry)} className="rounded-lg border border-[var(--border)] p-2 transition hover:surface-2" aria-label="Edit">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => void actions.updateEntry(entry.id, { status: 'missed' })} className="rounded-lg border border-[var(--border)] p-2 soft transition hover:text-rose-400" aria-label="Mark missed">
                              <AlertTriangle className="h-3 w-3" />
                            </button>
                            <button onClick={() => setDeleteTarget(entry)} className="rounded-lg border border-[var(--border)] p-2 soft transition hover:text-rose-400" aria-label="Delete">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <ProgressBar value={entry.status === 'completed' ? 1 : 0} height="h-1" tone={entry.status === 'completed' ? 'success' : 'brand'} />
                          <span className="text-[9px] soft">{entry.status}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <SectionHeader title="Subject balance" subtitle="Weekly scheduled minutes per subject" />
              <div className="mt-3 space-y-2.5">
                {subjectHours.length === 0 ? (
                  <p className="text-[11px] muted">No subject-linked blocks yet.</p>
                ) : (
                  subjectHours.map(({ subject, minutes }) => (
                    <div key={subject.id}>
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="flex items-center gap-1.5 muted">
                          <span className={cn('h-1.5 w-1.5 rounded-full', subjectColor(subject.color).dot)} /> {subject.name}
                        </span>
                        <span className="font-medium">{formatMinutes(minutes, true)}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full surface-2">
                        <div className="h-full rounded-full" style={{ width: `${(minutes / Math.max(...subjectHours.map((s) => s.minutes), 1)) * 100}%`, backgroundColor: subjectColor(subject.color).hex }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Planning guidance" />
              <ul className="mt-3 space-y-2 text-[11px] muted leading-relaxed">
                <li>• Keep blocks between 25 and 90 minutes; beyond 90, returns diminish sharply.</li>
                <li>• Front-load difficult subjects into your highest-energy hours.</li>
                <li>• Leave at least 25% of waking hours unscheduled for recovery and slippage.</li>
                <li>• Revision blocks deserve their own slots, not leftover time.</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="mt-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded-lg border border-[var(--border)] p-1.5 transition hover:surface-2"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">{monthCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] soft">Click any date to open that day's plan</p>
            </div>
            <button
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded-lg border border-[var(--border)] p-1.5 transition hover:surface-2"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="pb-1 text-center text-[9.5px] font-semibold uppercase tracking-wider soft">
                {d}
              </div>
            ))}
            {monthDays.map((cell, i) => {
              if (!cell.date || !cell.key) return <div key={`empty-${i}`} className="min-h-[64px] rounded-lg" />
              const weekday = cell.date.getDay()
              const entries = weekdayEntries(weekday)
              const minutes = entries.reduce((s, e) => s + minutesBetweenTimes(e.start_time, e.end_time), 0)
              const isToday = cell.key === today
              const isPast = cell.key < today
              return (
                <button
                  key={cell.key}
                  onClick={() => {
                    setSelectedDay(weekday)
                    setView('day')
                  }}
                  className={cn(
                    'min-h-[64px] rounded-lg border p-1.5 text-left transition hover:border-brand-400/40',
                    isToday ? 'border-brand-400/50 bg-brand-500/[0.08]' : isPast ? 'border-[var(--border)] opacity-70' : 'border-[var(--border)] surface-1',
                  )}
                >
                  <span className={cn('text-[10.5px] font-semibold', isToday ? 'text-brand-300' : 'muted')}>{cell.date.getDate()}</span>
                  {entries.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[9px] font-medium">{formatMinutes(minutes, true)}</p>
                      <div className="flex gap-0.5">
                        {entries.slice(0, 4).map((e) => (
                          <span key={e.id} className="h-1 w-1 rounded-full" style={{ backgroundColor: subjectColor(data.subjects.find((s) => s.id === e.subject_id)?.color).hex }} />
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] soft">The month view visualises your recurring weekly plan. One-off academic work belongs in the Study Planner.</p>
        </Card>
      )}

      {data.entries.length > 0 && (
        <Card className="mt-4 p-5">
          <SectionHeader
            title="All timetable blocks"
            subtitle={`${data.entries.length} blocks · ${formatMinutes(scheduledMinutes, true)} each week`}
            action={
              <div className="flex items-center gap-1 text-[10px] soft">
                <GripVertical className="h-3 w-3" /> drag on the weekly board
              </div>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[9.5px] uppercase tracking-wider soft">
                  <th className="pb-2 font-medium">Block</th>
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium">Day</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {[...data.entries]
                    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                    .map((entry) => {
                      const subject = data.subjects.find((s) => s.id === entry.subject_id)
                      return (
                        <motion.tr key={entry.id} layout exit={{ opacity: 0 }} className="border-b border-[var(--border)]/60">
                          <td className="py-2 pr-2">
                            <p className="font-medium">{entry.title}</p>
                            {entry.topic && <p className="text-[9.5px] soft">{entry.topic}</p>}
                          </td>
                          <td className="py-2 pr-2 muted">{subject?.name ?? 'General'}</td>
                          <td className="py-2 pr-2 muted">{entry.recurrence === 'daily' ? 'Every day' : WEEKDAYS_SHORT[entry.day_of_week]}</td>
                          <td className="py-2 pr-2 muted">
                            {entry.start_time}–{entry.end_time}
                          </td>
                          <td className="py-2 pr-2 muted">{minutesBetweenTimes(entry.start_time, entry.end_time)}m</td>
                          <td className="py-2 pr-2">
                            <Badge tone={entry.priority === 1 ? 'danger' : entry.priority === 2 ? 'warning' : 'neutral'}>{entry.priority === 1 ? 'Must do' : entry.priority === 2 ? 'High' : 'Normal'}</Badge>
                          </td>
                          <td className="py-2 pr-2">
                            <Badge tone={entry.status === 'completed' ? 'success' : entry.status === 'missed' ? 'danger' : entry.status === 'rescheduled' ? 'warning' : 'neutral'}>{entry.status}</Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEdit(entry)} className="rounded p-1 soft hover:text-[var(--text)]" aria-label="Edit">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button onClick={() => setDeleteTarget(entry)} className="rounded p-1 soft hover:text-rose-400" aria-label="Delete">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit timetable block' : 'Add study block'}
        description="Recurring blocks build routines. Specific tasks belong in the planner."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{conflict ? 'Save anyway' : editing ? 'Save changes' : 'Add to timetable'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {conflict && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Schedule conflict detected</p>
                <p className="mt-0.5">
                  {conflict} You can still save — but overlapping blocks split your attention and your analytics will show it.
                </p>
              </div>
            </div>
          )}
          <Field label="Block title">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Thermodynamics problem solving" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}>
                <option value="">General study</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Topic">
              <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Unit / chapter / objective" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Day">
              <Select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start time">
              <Input type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
            </Field>
            <Field label="End time">
              <Input type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Recurrence">
              <Select value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as Recurrence }))}>
                <option value="weekly">Every week</option>
                <option value="daily">Every day</option>
                <option value="none">One weekday only</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) as 1 | 2 | 3 }))}>
                <option value={1}>Must do</option>
                <option value={2}>High</option>
                <option value={3}>Normal</option>
              </Select>
            </Field>
            <Field label="Duration">
              <div className="field flex items-center justify-between text-xs">
                <span>{minutesBetweenTimes(form.start, form.end)} min</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, end: addMinutesToTime(f.start, 60) }))}
                  className="text-[10px] font-medium text-brand-300 hover:underline"
                  type="button"
                >
                  1 hour
                </button>
              </div>
            </Field>
          </div>
          <Field label="Description (optional)">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What does success look like in this block?" />
          </Field>
          <p className="flex items-center gap-1.5 text-[10.5px] soft">
            <Clock className="h-3 w-3" /> Timezone: {prefs?.timezone ?? 'Asia/Kolkata'} · sessions started from this block are linked to it automatically.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this block?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed from your timetable. Completed focus history is kept.` : ''}
        confirmLabel="Delete block"
        onConfirm={async () => {
          if (!deleteTarget) return
          await actions.deleteEntry(deleteTarget.id)
          setDeleteTarget(null)
          toast.success('Block deleted')
        }}
      />

      <SessionLauncher open={Boolean(launch)} onClose={() => setLaunch(null)} context={launch ?? undefined} />
      <p className="mt-4 text-center text-[10px] soft">
        Today is {new Date(`${todayKey(prefs?.timezone)}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Sessions are scheduled by
        weekday and repeat until you change them.
      </p>
    </div>
  )
}
