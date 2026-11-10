import { useEffect, useRef } from 'react'
import type { AppStore } from './store'
import { todayKey, toDateKey } from './utils'
import { daysBetweenKeys, weekdayOfKey } from './utils'

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as PermissionState
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!('Notification' in window)) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result as PermissionState
  } catch {
    return 'denied'
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

/**
 * Show a notification through the service worker when available so it also works
 * while the app is backgrounded but still open. Browsers cannot deliver these
 * notifications after the tab/browser is fully closed without a push server.
 */
export async function showBrowserNotification(title: string, body: string, tag?: string) {
  if (notificationPermission() !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' })
      return true
    }
    new Notification(title, { body, tag, icon: '/icon-192.png' })
    return true
  } catch {
    return false
  }
}

export function playChime(kind: 'complete' | 'break' | 'tick' | 'start' = 'complete') {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = kind === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'break' ? [659.25, 523.25] : kind === 'start' ? [440, 587.33] : [880]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.14
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.13, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.75)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.8)
    })
    setTimeout(() => ctx.close(), 1600)
  } catch {
    /* audio may be blocked by the browser */
  }
}

const seenKey = (key: string) => `ff.remind.${key}`

function onceToday(key: string, date = todayKey()): boolean {
  const full = seenKey(`${date}.${key}`)
  if (localStorage.getItem(full)) return false
  localStorage.setItem(full, '1')
  return true
}

/**
 * Client-side reminder engine. Runs while FOCUSFORGE is open. It never claims to
 * deliver reminders for a fully closed browser — that requires Web Push with a
 * server-side scheduler.
 */
export function useReminderEngine(store: AppStore) {
  const storeRef = useRef(store)
  storeRef.current = store

  useEffect(() => {
    if (!store.ready || !store.user) return
    const check = async () => {
      const s = storeRef.current
      const prefs = s.prefs
      if (!prefs) return
      const today = todayKey(prefs.timezone)
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const todaysEntries = s.data.entries.filter(
        (e) => e.day_of_week === weekdayOfKey(today) && e.status === 'pending' && e.recurrence !== 'none',
      )

      if (prefs.notify.session_start) {
        for (const entry of todaysEntries) {
          const [h, m] = entry.start_time.split(':').map(Number)
          const startMin = h * 60 + m
          if (startMin - minutes <= 10 && startMin - minutes > 0 && onceToday(`entry-${entry.id}`)) {
            await showBrowserNotification('Study session starting soon', `${entry.subject_id ? '' : ''}${entry.title} at ${entry.start_time}`, `entry-${entry.id}`)
            s.actions.notify({
              type: 'session',
              title: 'Session starting soon',
              body: `${entry.title} begins at ${entry.start_time}.`,
              link: '/timetable',
            })
          }
        }
      }

      if (prefs.notify.deadlines) {
        for (const task of s.data.tasks.filter((t) => t.status === 'pending' && t.deadline)) {
          const due = new Date(task.deadline as string)
          const hours = (due.getTime() - Date.now()) / 3600000
          if (hours > 0 && hours <= 24 && onceToday(`task-${task.id}`)) {
            await showBrowserNotification('Deadline approaching', `${task.title} is due within 24 hours.`, `task-${task.id}`)
          }
        }
      }

      if (prefs.notify.exams) {
        const upcoming = s.data.exams
          .filter((e) => e.exam_date >= today)
          .sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0]
        if (upcoming) {
          const days = daysBetweenKeys(today, upcoming.exam_date)
          if ([1, 3, 7].includes(days) && onceToday(`exam-${upcoming.id}-${days}`)) {
            await showBrowserNotification('Exam countdown', `${upcoming.name} is in ${days} day${days === 1 ? '' : 's'}.`, `exam-${upcoming.id}`)
          }
        }
      }

      if (prefs.notify.daily_report && minutes >= 21 * 60 && onceToday('daily-report', today)) {
        const stats = s.data.sessions.filter(
          (x) => x.status === 'completed' && x.ended_at && toDateKey(x.ended_at, prefs.timezone) === today,
        )
        if (stats.length > 0) {
          const text = `You completed ${stats.length} session${stats.length === 1 ? '' : 's'} and studied ${Math.round(
            stats.reduce((sum, x) => sum + x.actual_seconds, 0) / 60,
          )} minutes today.`
          await showBrowserNotification('Your end-of-day report', text, 'daily-report')
          s.actions.notify({ type: 'report', title: 'Daily accountability report', body: text, link: '/analytics' })
        }
      }
    }
    check()
    const id = window.setInterval(check, 60_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, store.user?.id, store.prefs?.timezone, store.data.entries.length, store.data.tasks.length])
}
