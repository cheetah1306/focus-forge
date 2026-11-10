import type { Achievement } from './types'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'
export interface ToastPayload {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type Listener<T> = (value: T) => void

function channel<T>() {
  const listeners = new Set<Listener<T>>()
  return {
    subscribe(fn: Listener<T>) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    emit(value: T) {
      listeners.forEach((fn) => fn(value))
    },
  }
}

const toastChannel = channel<ToastPayload>()
export const celebrateChannel = channel<Achievement>()

export const toast = {
  show(title: string, description?: string, tone: ToastTone = 'info') {
    toastChannel.emit({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, description, tone })
  },
  success(title: string, description?: string) {
    this.show(title, description, 'success')
  },
  error(title: string, description?: string) {
    this.show(title, description, 'error')
  },
  info(title: string, description?: string) {
    this.show(title, description, 'info')
  },
  warning(title: string, description?: string) {
    this.show(title, description, 'warning')
  },
  subscribe: toastChannel.subscribe,
}

export const celebrate = celebrateChannel.emit
export const onCelebrate = celebrateChannel.subscribe
