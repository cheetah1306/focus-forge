import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Search,
  Target,
  Trash2,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { useFocus } from '../lib/focus'
import type { StudyTask, TaskCategory } from '../lib/types'
import { addDaysKey, cn, formatMinutes, relativeDeadline, subjectColor, todayKey } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, SectionHeader, Select, Textarea } from '../components/ui'
import { SessionLauncher, type LaunchContext } from '../components/session-launcher'
import { toast } from '../lib/events'

type FilterKey = 'all' | 'must_do' | 'high' | 'normal' | 'revision' | 'completed' | 'overdue'

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  must_do: 'Must do',
  high: 'High priority',
  normal: 'Normal',
  revision: 'Revision',
  practice: 'Practice',
  mock: 'Mock exam',
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Planner() {
  const { data, actions, today } = useApp()
  const focus = useFocus()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StudyTask | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudyTask | null>(null)
  const [launch, setLaunch] = useState<LaunchContext | null>(null)
  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    unitId: '',
    topicId: '',
    description: '',
    category: 'normal' as TaskCategory,
    priority: 2 as 1 | 2 | 3,
    deadline: '',
    estimated: 45,
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', subjectId: '', unitId: '', topicId: '', description: '', category: 'normal', priority: 2, deadline: '', estimated: 45 })
    setModalOpen(true)
  }

  useEffect(() => {
    if (params.get('new') === '1') {
      openCreate()
      params.delete('new')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const openEdit = (task: StudyTask) => {
    setEditing(task)
    setForm({
      title: task.title,
      subjectId: task.subject_id ?? '',
      unitId: task.unit_id ?? '',
      topicId: task.topic_id ?? '',
      description: task.description ?? '',
      category: task.category,
      priority: task.priority,
      deadline: toLocalInput(task.deadline),
      estimated: task.estimated_minutes,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Task title required')
      return
    }
    const payload = {
      title: form.title.trim(),
      subject_id: form.subjectId || null,
      unit_id: form.unitId || null,
      topic_id: form.topicId || null,
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      estimated_minutes: Math.max(5, form.estimated),
    }
    if (editing) {
      await actions.updateTask(editing.id, payload)
      toast.success('Task updated')
    } else {
      await actions.addTask(payload)
      toast.success('Task created', 'It is now part of your study plan.')
    }
    setModalOpen(false)
  }

  const units = data.units.filter((u) => u.subject_id === form.subjectId)
  const topics = data.topics.filter((t) => t.unit_id === form.unitId)

  const filtered = useMemo(() => {
    return data.tasks.filter((task) => {
      if (subjectFilter && task.subject_id !== subjectFilter) return false
      if (search && !`${task.title} ${task.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'completed') return task.status === 'completed'
      if (task.status === 'completed') return false
      if (filter === 'overdue') return Boolean(task.deadline && task.deadline.slice(0, 10) < todayKey())
      if (filter === 'all') return true
      if (filter === 'must_do') return task.category === 'must_do' || task.priority === 1
      if (filter === 'high') return task.priority === 2 || task.category === 'high'
      if (filter === 'normal') return task.priority === 3 || task.category === 'normal'
      if (filter === 'revision') return task.category === 'revision' || task.category === 'practice' || task.category === 'mock'
      return true
    })
  }, [data.tasks, filter, search, subjectFilter])

  const pending = data.tasks.filter((t) => t.status === 'pending')
  const overdue = pending.filter((t) => t.deadline && t.deadline.slice(0, 10) < today)
  const dueToday = pending.filter((t) => t.deadline && t.deadline.slice(0, 10) === today)
  const dueSoon = pending.filter((t) => t.deadline && t.deadline.slice(0, 10) > today && t.deadline.slice(0, 10) <= addDaysKey(today, 7))
  const completionRate = data.tasks.length ? data.tasks.filter((t) => t.status === 'completed').length / data.tasks.length : 0
  const estimatedRemaining = pending.reduce((sum, t) => sum + t.estimated_minutes, 0)
  const completedThisWeek = data.tasks.filter((t) => t.status === 'completed' && t.completed_at && t.completed_at.slice(0, 10) >= addDaysKey(today, -6)).length

  return (
    <div>
      <PageHeader
        eyebrow="Academic task management"
        title="Study Planner"
        description="Chapters, revision blocks, practice sets and mock exams — each with a real deadline and tracked study time."
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            New task
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Pending work</p>
          <p className="mt-1 font-display text-xl font-semibold">{pending.length}</p>
          <p className="mt-0.5 text-[10px] muted">{formatMinutes(estimatedRemaining, true)} estimated</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Overdue</p>
          <p className={cn('mt-1 font-display text-xl font-semibold', overdue.length > 0 && 'text-rose-400')}>{overdue.length}</p>
          <p className="mt-0.5 text-[10px] muted">Clear before adding more</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Due today</p>
          <p className={cn('mt-1 font-display text-xl font-semibold', dueToday.length > 0 && 'text-amber-400')}>{dueToday.length}</p>
          <p className="mt-0.5 text-[10px] muted">{dueSoon.length} more this week</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Completion rate</p>
          <p className="mt-1 font-display text-xl font-semibold">{Math.round(completionRate * 100)}%</p>
          <ProgressBar value={completionRate} height="h-1" className="mt-2" tone="success" />
          <p className="mt-1 text-[10px] muted">{completedThisWeek} completed in 7 days</p>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 soft" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-8" />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 soft" />
            <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-[160px]">
              <option value="">All subjects</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
          {([
            ['all', 'All open'],
            ['must_do', 'Must do'],
            ['high', 'High priority'],
            ['normal', 'Normal'],
            ['revision', 'Revision & practice'],
            ['overdue', 'Overdue'],
            ['completed', 'Completed'],
          ] as [FilterKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
                filter === key ? 'border-brand-400/50 bg-brand-500/12 text-brand-200' : 'border-[var(--border)] surface-1 muted hover:surface-2',
              )}
            >
              {label}
              {key === 'overdue' && overdue.length > 0 && <span className="ml-1 text-rose-400">({overdue.length})</span>}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="p-5">
          <SectionHeader title={`${filtered.length} task${filtered.length === 1 ? '' : 's'}`} subtitle="Click the circle to complete. Every completion updates subject progress." />
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-5 w-5" />}
              title={filter === 'completed' ? 'No completed tasks yet' : 'Nothing here'}
              description={
                filter === 'completed'
                  ? 'Completed tasks appear here with the study time you logged against them.'
                  : 'Add your first academic task — a chapter, a revision block, a practice set or a mock exam.'
              }
              action={<Button size="sm" variant="secondary" onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>Add task</Button>}
              className="mt-4"
            />
          ) : (
            <div className="mt-3 space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((task) => {
                  const subject = data.subjects.find((s) => s.id === task.subject_id)
                  const unit = data.units.find((u) => u.id === task.unit_id)
                  const deadline = relativeDeadline(task.deadline)
                  const done = task.status === 'completed'
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        'group rounded-xl border p-3 transition',
                        done ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : deadline.tone === 'overdue' ? 'border-rose-500/25 bg-rose-500/[0.04]' : 'border-[var(--border)] surface-1 hover:border-[var(--border-strong)]',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => void actions.setTaskStatus(task.id, done ? 'pending' : 'completed')}
                          className={cn(
                            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                            done ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-400' : 'border-[var(--border-strong)] hover:border-emerald-400/60 hover:bg-emerald-500/10',
                          )}
                          aria-label={done ? 'Reopen task' : 'Complete task'}
                        >
                          {done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 opacity-0" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={cn('text-[12.5px] font-medium', done && 'text-[var(--text-muted)] line-through')}>{task.title}</p>
                            {(task.category === 'must_do' || task.priority === 1) && !done && <Badge tone="danger">must do</Badge>}
                            {task.category === 'revision' && <Badge tone="violet">revision</Badge>}
                            {task.category === 'mock' && <Badge tone="warning">mock</Badge>}
                            {done && <Badge tone="success">completed</Badge>}
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] muted">
                            <span className="flex items-center gap-1">
                              {subject && <span className={cn('h-1.5 w-1.5 rounded-full', subjectColor(subject.color).dot)} />}
                              {subject?.name ?? 'General'}
                            </span>
                            {unit && <span>· {unit.name}</span>}
                            <span>· {task.estimated_minutes}m estimated</span>
                            {task.actual_minutes > 0 && <span>· {task.actual_minutes}m studied</span>}
                            <span className={cn(deadline.tone === 'overdue' ? 'text-rose-400' : deadline.tone === 'soon' ? 'text-amber-400' : '')}>· {deadline.label}</span>
                          </p>
                          {task.description && <p className="mt-1 line-clamp-2 text-[10.5px] soft">{task.description}</p>}
                          {task.actual_minutes > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <ProgressBar value={Math.min(1, task.actual_minutes / Math.max(1, task.estimated_minutes))} height="h-1" tone="brand" />
                              <span className="text-[9px] soft">{Math.round((task.actual_minutes / Math.max(1, task.estimated_minutes)) * 100)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {!done && (
                            <button
                              onClick={() => setLaunch({ subjectId: task.subject_id, topic: task.title, minutes: Math.min(90, task.estimated_minutes || 25), taskId: task.id, mode: 'custom' })}
                              className="rounded p-1.5 text-brand-300 transition hover:surface-2"
                              aria-label={`Study ${task.title}`}
                              disabled={Boolean(focus.session)}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEdit(task)} className="rounded p-1.5 soft transition hover:surface-2 hover:text-[var(--text)]" aria-label="Edit task">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(task)} className="rounded p-1.5 soft transition hover:surface-2 hover:text-rose-400" aria-label="Delete task">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <SectionHeader title="Deadline radar" subtitle="Next 7 days" action={<CalendarClock className="h-4 w-4 soft" />} />
            <div className="mt-3 space-y-1.5">
              {[...overdue, ...dueToday, ...dueSoon].slice(0, 7).map((task) => {
                const dl = relativeDeadline(task.deadline)
                return (
                  <button
                    key={task.id}
                    onClick={() => openEdit(task)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] surface-1 px-2.5 py-2 text-left transition hover:surface-2"
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dl.tone === 'overdue' ? 'bg-rose-400' : dl.tone === 'soon' ? 'bg-amber-400' : 'bg-brand-400')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">{task.title}</span>
                      <span className="block text-[9px] soft">{dl.label}</span>
                    </span>
                    <span className="text-[9.5px] muted">{task.estimated_minutes}m</span>
                  </button>
                )
              })}
              {overdue.length + dueToday.length + dueSoon.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-5 text-center text-[10.5px] muted">
                  No deadlines in the next week. That is either excellent planning or missing data.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Planner discipline" />
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-[var(--border)] surface-1 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider soft">
                  <Target className="h-3 w-3" /> Today's task target
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {data.tasks.filter((t) => t
                    .completed_at && t.completed_at.slice(0, 10) === today).length} / {Math.max(1, dueToday.length)}
                </p>
                <p className="mt-0.5 text-[10px] muted">Completed vs due today</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] surface-1 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider soft">
                  <Clock className="h-3 w-3" /> Estimated remaining
                </p>
                <p className="mt-1 text-sm font-semibold">{formatMinutes(estimatedRemaining)}</p>
                <p className="mt-0.5 text-[10px] muted">Across {pending.length} open tasks</p>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3 text-[10.5px] leading-relaxed muted">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                Overdue tasks are highlighted, never auto-deleted. Reschedule them honestly instead of pretending they do not exist.
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit task' : 'New study task'}
        description="Break large chapters into concrete, estimable units of work."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{editing ? 'Save changes' : 'Create task'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Task title">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Finish Chapter 4 problem set" autoFocus />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject">
              <Select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value, unitId: '', topicId: '' }))}>
                <option value="">General</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit">
              <Select value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value, topicId: '' }))} disabled={!form.subjectId}>
                <option value="">None</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Topic">
              <Select value={form.topicId} onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))} disabled={!form.unitId}>
                <option value="">None</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TaskCategory }))}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) as 1 | 2 | 3 }))}>
                <option value={1}>Must do</option>
                <option value={2}>High</option>
                <option value={3}>Normal</option>
              </Select>
            </Field>
            <Field label="Estimated minutes">
              <Input type="number" min={5} max={600} step={5} value={form.estimated} onChange={(e) => setForm((f) => ({ ...f, estimated: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Deadline (optional)">
            <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </Field>
          <Field label="Description (optional)">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Scope, page numbers, references…" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this task?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. Focus sessions logged against it stay in your history.` : ''}
        confirmLabel="Delete task"
        onConfirm={async () => {
          if (!deleteTarget) return
          await actions.deleteTask(deleteTarget.id)
          setDeleteTarget(null)
          toast.success('Task deleted')
        }}
      />

      <SessionLauncher open={Boolean(launch)} onClose={() => setLaunch(null)} context={launch ?? undefined} />
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] soft">
        <CheckCircle2 className="h-3 w-3" /> Completing a task updates subject progress and today's focus score.
      </p>
    </div>
  )
}
