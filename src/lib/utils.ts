import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))

export function toDateKey(date: Date | string | number, timeZone = 'Asia/Kolkata'): string {
  const d = date instanceof Date ? date : new Date(date)
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function todayKey(timeZone = 'Asia/Kolkata') {
  return toDateKey(new Date(), timeZone)
}

export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / 86400000)
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function weekdayOfKey(key: string): number {
  return keyToDate(key).getDay()
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatMinutes(mins: number, compact = false): string {
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (compact) {
    if (h === 0) return `${rest}m`
    if (rest === 0) return `${h}h`
    return `${h}h ${rest}m`
  }
  if (h === 0) return `${rest} min`
  if (rest === 0) return `${h} hr`
  return `${h} hr ${rest} min`
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatClock12(hhmm: string | null | undefined): string {
  if (!hhmm) return '—'
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${mStr ?? '00'} ${suffix}`
}

export function minutesBetweenTimes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

export function nowTimeHHMM(offsetMinutes = 0): string {
  const d = new Date(Date.now() + offsetMinutes * 60000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h * 60 + m + minutes + 1440 * 2) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd)
}

export function formatDateLong(key: string): string {
  return keyToDate(key).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(key: string): string {
  return keyToDate(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function relativeDeadline(deadline: string | null, now = Date.now()): { label: string; tone: 'overdue' | 'soon' | 'normal' } {
  if (!deadline) return { label: 'No deadline', tone: 'normal' }
  const t = new Date(deadline).getTime()
  const diff = t - now
  const days = Math.floor(diff / 86400000)
  if (diff < 0) return { label: 'Overdue', tone: 'overdue' }
  if (diff < 86400000) return { label: 'Due today', tone: 'soon' }
  if (days < 3) return { label: `Due in ${days + 1}d`, tone: 'soon' }
  return { label: `Due ${new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, tone: 'normal' }
}

export const SUBJECT_COLORS: Record<string, { dot: string; text: string; bg: string; ring: string; hex: string }> = {
  blue: { dot: 'bg-brand-400', text: 'text-brand-300', bg: 'bg-brand-500/12', ring: 'ring-brand-400/30', hex: '#5b8cff' },
  violet: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-500/12', ring: 'ring-violet-400/30', hex: '#a78bfa' },
  mint: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/12', ring: 'ring-emerald-400/30', hex: '#34d399' },
  amber: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/12', ring: 'ring-amber-400/30', hex: '#fbbf24' },
  rose: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-500/12', ring: 'ring-rose-400/30', hex: '#fb7185' },
  cyan: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-500/12', ring: 'ring-cyan-400/30', hex: '#22d3ee' },
}

export function subjectColor(color?: string | null) {
  return SUBJECT_COLORS[color ?? 'blue'] ?? SUBJECT_COLORS.blue
}

export function downloadFile(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function pluralize(n: number, word: string, plural?: string) {
  return `${n} ${n === 1 ? word : plural ?? `${word}s`}`
}

export function greetingForHour(hour: number) {
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}
