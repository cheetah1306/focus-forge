import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import type { Subject, SubjectColor, TopicStatus } from '../lib/types'
import { subjectStats, subjectDistribution } from '../lib/metrics'
import { cn, formatDateShort, formatMinutes, SUBJECT_COLORS, subjectColor } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, ProgressBar, Ring, SectionHeader } from '../components/ui'
import { toast } from '../lib/events'
import { isSupabaseConfigured } from '../lib/supabase'

const STATUS_OPTIONS: { value: TopicStatus; label: string; tone: 'neutral' | 'brand' | 'success' | 'warning' }[] = [
  { value: 'not_started', label: 'Not started', tone: 'neutral' },
  { value: 'in_progress', label: 'In progress', tone: 'brand' },
  { value: 'completed', label: 'Completed', tone: 'success' },
  { value: 'needs_revision', label: 'Needs revision', tone: 'warning' },
]

function StatusSelect({ status, onChange }: { status: TopicStatus; onChange: (s: TopicStatus) => void }) {
  const current = STATUS_OPTIONS.find((s) => s.value === status)!
  return (
    <div className="relative">
      <Badge tone={current.tone} className="cursor-pointer pr-4">
        {current.label}
      </Badge>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as TopicStatus)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Topic status"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function Subjects() {
  const { data, actions, prefs, today, timezone } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', color: 'blue' as SubjectColor })
  const [selected, setSelected] = useState<Subject | null>(null)
  const [unitName, setUnitName] = useState('')
  const [unitTopics, setUnitTopics] = useState('')
  const [topicDrafts, setTopicDrafts] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', code: '', color: 'blue' as SubjectColor })
  const fileInput = useRef<HTMLInputElement>(null)

  const stats = subjectStats(data, prefs)
  const distribution = subjectDistribution(data)
  const totalTopics = data.topics.length
  const completedTopics = data.topics.filter((t) => t.status === 'completed').length

  useEffect(() => {
    if (selected) {
      const fresh = data.subjects.find((s) => s.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
  }, [data.subjects, selected])

  const addSubject = async () => {
    if (!form.name.trim()) {
      toast.error('Subject name required')
      return
    }
    const created = await actions.addSubject({ name: form.name, code: form.code, color: form.color })
    setForm({ name: '', code: '', color: 'blue' })
    setAddOpen(false)
    if (created) {
      toast.success('Subject added', 'Now build its units and topics.')
      setSelected(created)
    }
  }

  const addUnit = async () => {
    if (!selected) return
    await actions.addUnit(selected.id, unitName, unitTopics.split(',').map((t) => t.trim()).filter(Boolean))
    setUnitName('')
    setUnitTopics('')
    toast.success('Unit added')
  }

  const currentStats = selected ? stats.find((s) => s.subject.id === selected.id) : null
  const units = selected ? data.units.filter((u) => u.subject_id === selected.id) : []
  const resources = selected ? data.resources.filter((r) => r.subject_id === selected.id) : []

  return (
    <div>
      <PageHeader
        eyebrow="Syllabus command"
        title="Subjects"
        description="Track every subject from units down to topics. Progress here feeds your exam readiness and dashboard recommendations."
        actions={
          <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Add subject
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Subjects</p>
          <p className="mt-1 font-display text-xl font-semibold">{data.subjects.length}</p>
          <p className="text-[10px] muted">{data.units.length} units tracked</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Topic coverage</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0}%
          </p>
          <ProgressBar value={totalTopics ? completedTopics / totalTopics : 0} height="h-1" className="mt-2" tone="success" />
          <p className="mt-1 text-[10px] muted">
            {completedTopics}/{totalTopics} topics completed
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider soft">Needs revision</p>
          <p className="mt-1 font-display text-xl font-semibold text-amber-400">{data.topics.filter((t) => t.status === 'needs_revision').length}</p>
          <p className="text-[10px] muted">Marked for a second pass</p>
        </Card>
      </div>

      {data.subjects.length === 0 ? (
        <Card className="mt-4 p-6">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No subjects yet"
            description="Add the subjects in your semester. Then create units and topics to unlock progress tracking and exam readiness."
            action={<Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Add your first subject</Button>}
          />
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s, i) => {
            const color = subjectColor(s.subject.color)
            return (
              <motion.button
                key={s.subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(s.subject)}
                className="group panel hover-lift p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', color.dot)} />
                      <p className="truncate text-sm font-semibold">{s.subject.name}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] muted">
                      {s.subject.code || 'No code'} · {s.units} units
                    </p>
                  </div>
                  <div className="relative">
                    <Ring progress={s.progress / 100} size={54} stroke={4}>
                      <span className="text-[10px] font-semibold">{s.progress}%</span>
                    </Ring>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="soft">Topics</p>
                    <p className="font-semibold">
                      {s.completedTopics}/{s.totalTopics}
                    </p>
                  </div>
                  <div>
                    <p className="soft">Studied</p>
                    <p className="font-semibold">{formatMinutes(s.minutes, true)}</p>
                  </div>
                  <div>
                    <p className="soft">Pending</p>
                    <p className="font-semibold">{s.pendingTasks}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={s.progress / 100} height="h-1" tone={s.progress >= 80 ? 'success' : s.progress >= 40 ? 'brand' : 'warning'} />
                </div>
                {s.revisionTopics > 0 && (
                  <p className="mt-2 text-[9.5px] text-amber-400">
                    {s.revisionTopics} topic{s.revisionTopics === 1 ? '' : 's'} need revision
                  </p>
                )}
                {s.nextExam && (
                  <p className="mt-1.5 flex items-center gap-1 text-[9.5px] muted">
                    <GraduationCap className="h-3 w-3" /> {s.nextExam.name} · {formatDateShort(s.nextExam.exam_date)} ({s.daysToExam}d)
                  </p>
                )}
                <span className="mt-3 flex items-center gap-1 text-[10px] font-medium text-brand-300 opacity-0 transition group-hover:opacity-100">
                  Manage syllabus <ChevronRight className="h-3 w-3" />
                </span>
              </motion.button>
            )
          })}
        </div>
      )}

      {distribution.length > 0 && (
        <Card className="mt-4 p-5">
          <SectionHeader title="Where your study time goes" subtitle="Subject-wise focused minutes from real session records" />
          <div className="mt-3 space-y-2.5">
            {[...distribution]
              .sort((a, b) => b.minutes - a.minutes)
              .map((row) => (
                <div key={row.name}>
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="muted">{row.name}</span>
                    <span className="font-medium">{formatMinutes(row.minutes, true)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full surface-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.minutes / Math.max(...distribution.map((d) => d.minutes))) * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: row.fill }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Subject manager */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Subject'}
        description={selected ? `${selected.code || 'No code'} · ${currentStats?.completedTopics ?? 0}/${currentStats?.totalTopics ?? 0} topics complete · ${formatMinutes(currentStats?.minutes ?? 0)} studied` : ''}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              variant="secondary"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => {
                if (!selected) return
                setEditForm({ name: selected.name, code: selected.code ?? '', color: selected.color })
                setEditOpen(true)
              }}
            >
              Edit subject
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] surface-1 p-3">
              <Ring progress={(currentStats?.progress ?? 0) / 100} size={64} stroke={5}>
                <span className="text-[11px] font-semibold">{currentStats?.progress ?? 0}%</span>
              </Ring>
              <div className="grid flex-1 grid-cols-2 gap-2 text-[10.5px] sm:grid-cols-4">
                <div>
                  <p className="soft">Units</p>
                  <p className="text-sm font-semibold">{units.length}</p>
                </div>
                <div>
                  <p className="soft">Topics</p>
                  <p className="text-sm font-semibold">{currentStats?.totalTopics ?? 0}</p>
                </div>
                <div>
                  <p className="soft">Study time</p>
                  <p className="text-sm font-semibold">{formatMinutes(currentStats?.minutes ?? 0, true)}</p>
                </div>
                <div>
                  <p className="soft">Sessions</p>
                  <p className="text-sm font-semibold">{currentStats?.sessions ?? 0}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(selected)} icon={<Trash2 className="h-3.5 w-3.5" />}>
                Delete
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="New unit">
                <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="e.g. Unit 3 — Thermodynamics" />
              </Field>
              <Field label="Topics (comma separated, optional)">
                <Input value={unitTopics} onChange={(e) => setUnitTopics(e.target.value)} placeholder="Entropy, Gibbs free energy, Cycles" />
              </Field>
              <div className="flex items-end">
                <Button onClick={() => void addUnit()} icon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
                  Add unit
                </Button>
              </div>
            </div>

            {units.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-[11px] muted">
                No units yet. Add unit names above — topics can be added inline as you go.
              </p>
            ) : (
              <div className="space-y-2">
                {units.map((unit) => {
                  const topics = data.topics.filter((t) => t.unit_id === unit.id)
                  const done = topics.filter((t) => t.status === 'completed').length
                  return (
                    <div key={unit.id} className="rounded-xl border border-[var(--border)] surface-1">
                      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
                        <Layers className="h-3.5 w-3.5 text-brand-300" />
                        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">{unit.name}</p>
                        <span className="text-[10px] soft">
                          {done}/{topics.length} done
                        </span>
                        <div className="w-16">
                          <ProgressBar value={topics.length ? done / topics.length : 0} height="h-1" tone={done === topics.length && topics.length > 0 ? 'success' : 'brand'} />
                        </div>
                        <button
                          onClick={async () => {
                            await actions.deleteUnit(unit.id)
                            toast.success('Unit deleted')
                          }}
                          className="rounded p-1 soft transition hover:text-rose-400"
                          aria-label={`Delete ${unit.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="space-y-1 p-2">
                        {topics.map((topic) => (
                          <div key={topic.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', topic.status === 'completed' ? 'bg-emerald-400' : topic.status === 'needs_revision' ? 'bg-amber-400' : topic.status === 'in_progress' ? 'bg-brand-400' : 'bg-[var(--text-soft)]')} />
                            <p className={cn('min-w-0 flex-1 truncate text-[11px]', topic.status === 'completed' && 'line-through opacity-60')}>{topic.name}</p>
                            <StatusSelect status={topic.status} onChange={(status) => void actions.updateTopic(topic.id, { status })} />
                            <button onClick={() => void actions.deleteTopic(topic.id)} className="rounded p-1 soft hover:text-rose-400" aria-label={`Delete ${topic.name}`}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-1 pt-1">
                          <Input
                            value={topicDrafts[unit.id] ?? ''}
                            onChange={(e) => setTopicDrafts((d) => ({ ...d, [unit.id]: e.target.value }))}
                            placeholder="Add a topic…"
                            className="field-sm h-8"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (topicDrafts[unit.id] ?? '').trim()) {
                                void actions.addTopic(unit.id, selected.id, topicDrafts[unit.id])
                                setTopicDrafts((d) => ({ ...d, [unit.id]: '' }))
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => {
                              const value = (topicDrafts[unit.id] ?? '').trim()
                              if (!value) return
                              void actions.addTopic(unit.id, selected.id, value)
                              setTopicDrafts((d) => ({ ...d, [unit.id]: '' }))
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                    <FolderOpen className="h-3.5 w-3.5 text-brand-300" /> Study documents
                  </p>
                  <p className="mt-0.5 text-[10px] muted">
                    {isSupabaseConfigured
                      ? 'PDFs, notes and formula sheets, uploaded to your private study-documents bucket.'
                      : 'Local mode keeps documents in this browser only — files up to 1.5 MB.'}
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && selected) void actions.uploadResource(selected.id, file)
                    e.target.value = ''
                  }}
                />
                <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => fileInput.current?.click()}>
                  Upload
                </Button>
              </div>
              {resources.length > 0 && (
                <div className="mt-2 space-y-1">
                  {resources.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-brand-300" />
                      <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[11px] hover:underline">
                        {r.name}
                      </a>
                      <span className="text-[9px] soft">{(r.size_bytes / 1024).toFixed(0)} KB</span>
                      <button onClick={() => void actions.deleteResource(r.id)} className="rounded p-1 soft hover:text-rose-400" aria-label="Delete document">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-brand-400/20 bg-brand-500/[0.06] p-3 text-[10.5px] leading-relaxed muted">
              <p className="flex items-center gap-1.5 font-semibold text-brand-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> How progress is calculated
              </p>
              <p className="mt-1">
                Subject progress = completed topics ÷ total topics. Unit completion requires every topic to be completed or marked for revision. Study time comes only from
                recorded focus sessions linked to this subject.
              </p>
              <p className="mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Timezone {timezone} · today {today}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add subject"
        description="Subjects are the backbone of your analytics and exam readiness."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void addSubject()}>Add subject</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Subject name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Engineering Mathematics II" autoFocus />
          </Field>
          <Field label="Subject code (optional)">
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MA102" />
          </Field>
          <div>
            <span className="label">Accent colour</span>
            <div className="flex gap-2">
              {(Object.keys(SUBJECT_COLORS) as SubjectColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={c}
                  className={cn('h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[var(--panel-solid)] transition', SUBJECT_COLORS[c].dot, form.color === c ? 'ring-white/40' : 'ring-transparent')}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit subject"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selected) return
                await actions.updateSubject(selected.id, { name: editForm.name.trim() || selected.name, code: editForm.code.trim() || null, color: editForm.color })
                setEditOpen(false)
                toast.success('Subject updated')
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Subject name">
            <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Subject code">
            <Input value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
          </Field>
          <div>
            <span className="label">Accent colour</span>
            <div className="flex gap-2">
              {(Object.keys(SUBJECT_COLORS) as SubjectColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setEditForm((f) => ({ ...f, color: c }))}
                  aria-label={c}
                  className={cn('h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-[var(--panel-solid)]', SUBJECT_COLORS[c].dot, editForm.color === c ? 'ring-white/40' : 'ring-transparent')}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this subject?"
        description={deleteTarget ? `${deleteTarget.name}, its units and topics will be removed. Linked sessions and exams keep their history but lose the subject link.` : ''}
        confirmLabel="Delete subject"
        onConfirm={async () => {
          if (!deleteTarget) return
          await actions.deleteSubject(deleteTarget.id)
          setSelected(null)
          setDeleteTarget(null)
          toast.success('Subject deleted')
        }}
      />
    </div>
  )
}
