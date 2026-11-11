import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion'
import { AlertTriangle, Check, ChevronDown, Info, Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'
import { toast, type ToastPayload } from '../lib/events'
import { formatMinutes } from '../lib/utils'

/* -------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-fab shadow-brand-500/25 hover:from-brand-400 hover:to-brand-500 active:from-brand-600 active:to-brand-700 border border-brand-300/20 font-semibold',
  secondary: 'surface-2 border border-[var(--border-strong)] text-[var(--text)] hover:surface-3 font-medium',
  ghost: 'text-[var(--text-muted)] hover:text-[var(--text)] hover:surface-2 font-medium',
  danger: 'bg-rose-500/16 text-rose-500 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/26 font-semibold',
  success: 'bg-emerald-500/16 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/26 font-semibold',
  outline: 'border border-[var(--border-strong)] text-[var(--text)] hover:surface-1 font-medium',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-11 px-5 text-sm gap-2 rounded-full',
  lg: 'h-13 px-7 text-[0.95rem] gap-2.5 rounded-full font-semibold',
  icon: 'h-10 w-10 rounded-full justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium tracking-tight transition-transform transition-opacity duration-150',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
        'focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)]',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  )
})

/* --------------------------------- Card ---------------------------------- */

export function Card({
  className,
  children,
  as = 'div',
  ...props
}: { className?: string; children: ReactNode; as?: 'div' | 'section' } & HTMLMotionProps<'div'>) {
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp className={cn('panel rounded-[26px] sm:rounded-[30px] hover:border-[var(--border-strong)] transition-all duration-200', className)} style={{ willChange: 'transform, opacity' }} {...props}>
      {children}
    </Comp>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11.5px] muted leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* --------------------------------- Inputs -------------------------------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn('field', className)} {...props} />
})

export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max)

  return (
    <input
      {...props}
      type="number"
      min={min}
      max={max}
      className={cn('field', className)}
      value={draft}
      onFocus={(e) => {
        setFocused(true)
        props.onFocus?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        // Keep whatever the user is typing, including "" and partial input like "-".
        setDraft(raw)
        if (raw.trim() === '') return
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && inRange(parsed)) onValueChange(parsed)
      }}
      onBlur={(e) => {
        setFocused(false)
        const parsed = Number(draft)
        const fallback = min ?? 0
        const next = draft.trim() === '' || !Number.isFinite(parsed) ? fallback : Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, parsed))
        setDraft(String(next))
        if (next !== value) onValueChange(next)
        props.onBlur?.(e)
      }}
    />
  )
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn('field min-h-[76px] resize-y', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn('field appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 soft" />
    </div>
  )
})

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] soft">{hint}</p>
      ) : null}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold tracking-tight cursor-pointer">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs muted leading-relaxed">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-250 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          checked ? 'border-brand-500 bg-brand-500' : 'border-[var(--border-strong)] surface-2',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full shadow-sm',
            checked ? 'left-[22px] bg-white' : 'left-[3px] bg-[var(--text-soft)]',
          )}
        />
      </button>
    </div>
  )
}

/* --------------------------------- Badges -------------------------------- */

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'violet'
  className?: string
  dot?: boolean
}) {
  const tones = {
    neutral: 'border-[var(--border-strong)] surface-1 text-[var(--text-muted)]',
    brand: 'border-brand-400/30 bg-brand-500/12 text-brand-400 dark:text-brand-300',
    success: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/12 text-amber-600 dark:text-amber-300',
    danger: 'border-rose-500/30 bg-rose-500/12 text-rose-600 dark:text-rose-300',
    violet: 'border-violet-400/30 bg-violet-500/12 text-violet-500 dark:text-violet-300',
  }
  const dots = {
    neutral: 'bg-[var(--text-muted)]',
    brand: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    violet: 'bg-violet-500',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
}

/* -------------------------------- Progress ------------------------------- */

export function ProgressBar({
  value,
  className,
  tone = 'brand',
  height = 'h-2',
  label,
}: {
  value: number
  className?: string
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'violet'
  height?: string
  label?: string
}) {
  const tones = {
    brand: 'from-brand-400 to-violet-400',
    success: 'from-emerald-400 to-emerald-500',
    warning: 'from-amber-400 to-orange-500',
    danger: 'from-rose-400 to-rose-500',
    violet: 'from-violet-400 to-fuchsia-400',
  }
  return (
    <div className={cn('w-full overflow-hidden rounded-full surface-2', height, className)} aria-label={label}>
      <motion.div
        className={cn('h-full rounded-full bg-gradient-to-r', tones[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      />
    </div>
  )
}

export function Ring({
  progress,
  size = 260,
  stroke = 10,
  children,
  tone = 'brand',
  trailOpacity = 0.14,
  className,
}: {
  progress: number
  size?: number
  stroke?: number
  children?: ReactNode
  tone?: 'brand' | 'success' | 'warning'
  trailOpacity?: number
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, progress))
  const gradientId = useId()
  const tones = {
    brand: ['#5b8cff', '#a78bfa'],
    success: ['#34d399', '#22c55e'],
    warning: ['#fbbf24', '#f97316'],
  }[tone]
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tones[0]} />
            <stop offset="100%" stopColor={tones[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-strong)"
          strokeOpacity={trailOpacity > 0.2 ? trailOpacity : 0.4}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ ease: 'linear', duration: 0.35 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/* ------------------------------ AnimatedNumber --------------------------- */

export function AnimatedNumber({
  value,
  format,
  className,
  duration = 0.9,
}: {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number>()

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (value - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fromRef.current = value
    }
  }, [value, duration, reduce])

  const shown = Math.abs(display - Math.round(display)) < 0.05 ? Math.round(display) : display
  return <span className={className}>{format ? format(shown) : shown}</span>
}

/* --------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dismissible?: boolean
}) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, dismissible])

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#04060c]/60 backdrop-blur-sm"
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className={cn(
              'relative w-full overflow-hidden rounded-t-[36px] border border-[var(--border-strong)] bg-[var(--panel-solid)] shadow-2xl sm:rounded-[32px]',
              sizes[size],
            )}
          >
            {/* Native Android bottom sheet drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
              <span className="h-1.5 w-12 rounded-full bg-[var(--text-soft)]/30" />
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
                {description && <p className="mt-1 text-xs muted leading-relaxed">{description}</p>}
              </div>
              {dismissible && (
                <button onClick={onClose} aria-label="Close dialog" className="rounded-full p-2 muted transition hover:surface-2 hover:text-[var(--text)] active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--border)] px-6 py-4 surface-1">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
  loading,
  requireText,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void | Promise<void>
  loading?: boolean
  /** When set, the user must type this exact phrase before the confirm button unlocks. */
  requireText?: string
}) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])
  const blocked = Boolean(requireText) && typed !== requireText

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} disabled={blocked} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs leading-relaxed muted">This action is recorded honestly in your accountability history so your analytics stay accurate.</p>
      </div>
      {requireText && (
        <div className="mt-3">
          <Field label={`Type ${requireText} to confirm`}>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-describedby={undefined}
            />
          </Field>
          <p className="mt-1 text-[11px] soft">{blocked ? `Confirm button unlocks when you type ${requireText}.` : 'Confirmed — you can proceed.'}</p>
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------- EmptyState ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--text)_2%,transparent)] px-6 py-10 text-center', className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl surface-2 text-[var(--text-muted)]">{icon}</div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-xs text-xs muted leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* -------------------------------- Skeleton ------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}

/* ---------------------------------- Tabs --------------------------------- */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  className?: string
}) {
  const groupId = useId()
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full border border-[var(--border)] surface-1 p-1.5 shadow-sm', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 active:scale-95',
            value === opt.value ? 'text-white' : 'muted hover:text-[var(--text)]',
          )}
        >
          {value === opt.value && (
            <motion.span
              layoutId={`seg-${groupId}`}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 shadow-md"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {opt.icon}
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* -------------------------------- StatCard ------------------------------- */

export function StatCard({
  label,
  value,
  suffix,
  icon,
  hint,
  tone = 'brand',
  progress,
  delay = 0,
}: {
  label: string
  value: ReactNode
  suffix?: string
  icon: ReactNode
  hint?: string
  tone?: 'brand' | 'violet' | 'success' | 'warning' | 'danger'
  progress?: number
  delay?: number
}) {
  const tones = {
    brand: 'text-brand-400 dark:text-brand-300 bg-brand-500/12 border-brand-400/25',
    violet: 'text-violet-500 dark:text-violet-300 bg-violet-500/12 border-violet-400/25',
    success: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/12 border-emerald-400/25',
    warning: 'text-amber-600 dark:text-amber-300 bg-amber-500/12 border-amber-400/25',
    danger: 'text-rose-500 dark:text-rose-300 bg-rose-500/12 border-rose-400/25',
  }
  return (
    <Card
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="hover-lift rounded-[28px] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] soft">{label}</p>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', tones[tone])}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold tracking-tight">{value}</span>
        {suffix && <span className="text-xs font-semibold muted">{suffix}</span>}
      </div>
      {typeof progress === 'number' && <ProgressBar value={progress} height="h-1.5" className="mt-3.5" tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'brand'} />}
      {hint && <p className="mt-2.5 text-[11px] muted leading-snug">{hint}</p>}
    </Card>
  )
}

/* --------------------------------- Toaster ------------------------------- */

export function Toaster() {
  const [items, setItems] = useState<ToastPayload[]>([])
  useEffect(() => {
    const unsubscribe = toast.subscribe((payload) => {
      setItems((list) => [...list.slice(-3), payload])
      window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== payload.id)), 4600)
    })
    return () => {
      unsubscribe()
    }
  }, [])
  if (typeof document === 'undefined') return null
  const icons = {
    success: <Check className="h-4 w-4 text-emerald-400" />,
    error: <AlertTriangle className="h-4 w-4 text-rose-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    info: <Info className="h-4 w-4 text-brand-300" />,
  }
  return createPortal(
    <div className="pointer-events-none fixed bottom-20 right-3 z-[120] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--panel-solid)]/95 p-3.5 shadow-2xl backdrop-blur-xl"
          >
            <div className="mt-0.5 shrink-0">{icons[item.tone]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{item.title}</p>
              {item.description && <p className="mt-0.5 text-xs muted leading-snug">{item.description}</p>}
            </div>
            <button
              onClick={() => setItems((list) => list.filter((i) => i.id !== item.id))}
              className="rounded p-1 soft transition hover:surface-2 hover:text-[var(--text)]"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

/* -------------------------------- Misc ----------------------------------- */

export function KeyValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      <span className="text-xs muted">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

export function TimeBalance({ minutes, target }: { minutes: number; target: number }) {
  const remaining = Math.max(0, target - minutes)
  return (
    <span className={cn('text-xs font-medium', minutes >= target ? 'text-emerald-400' : 'muted')}>
      {minutes >= target ? `${formatMinutes(minutes - target)} above target` : `${formatMinutes(remaining)} remaining`}
    </span>
  )
}
