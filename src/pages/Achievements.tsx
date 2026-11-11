import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  CalendarCheck,
  CheckCheck,
  Clock,
  Flame,
  Lock,
  Medal,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react'
import { useApp } from '../lib/app-context'
import { achievementState, sessionSeconds, computeBestStreak, computeStreak } from '../lib/metrics'
import { cn, formatMinutes, toDateKey } from '../lib/utils'
import { PageHeader } from '../components/layout'
import { Badge, Card, ProgressBar, SectionHeader } from '../components/ui'

const ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap className="h-5 w-5" />,
  Flame: <Flame className="h-5 w-5" />,
  Waves: <Waves className="h-5 w-5" />,
  Anvil: <Trophy className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Timer: <Timer className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  CalendarCheck: <CalendarCheck className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  CheckCheck: <CheckCheck className="h-5 w-5" />,
  Medal: <Medal className="h-5 w-5" />,
}

const TIER_STYLE: Record<string, { ring: string; bg: string; text: string; label: string }> = {
  bronze: { ring: 'border-amber-600/30', bg: 'from-amber-600/15 to-amber-500/5', text: 'text-amber-500', label: 'Bronze' },
  silver: { ring: 'border-slate-400/30', bg: 'from-slate-400/15 to-slate-300/5', text: 'text-slate-300', label: 'Silver' },
  gold: { ring: 'border-amber-400/40', bg: 'from-amber-400/20 to-orange-500/5', text: 'text-amber-300', label: 'Gold' },
  platinum: { ring: 'border-violet-400/40', bg: 'from-violet-400/20 to-fuchsia-500/5', text: 'text-violet-300', label: 'Platinum' },
}

export default function Achievements() {
  const { data, prefs, timezone } = useApp()
  const achievements = useMemo(() => achievementState(data, prefs), [data, prefs])
  const unlocked = achievements.filter((a) => a.unlocked)
  const nextUp = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)

  const completed = data.sessions.filter((s) => s.status === 'completed')
  const longestSession = completed.reduce((max, s) => Math.max(max, s.actual_seconds), 0)
  const bestDay = data.sessions.reduce<Record<string, number>>((acc, s) => {
    const key = toDateKey(s.started_at, timezone)
    acc[key] = (acc[key] ?? 0) + sessionSeconds(s) / 60
    return acc
  }, {})
  const bestDayEntry = Object.entries(bestDay).sort((a, b) => b[1] - a[1])[0]
  const totalMinutes = data.sessions.reduce((sum, s) => sum + sessionSeconds(s) / 60, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Earned, never given"
        title="Achievements"
        description="Badges unlock only from persisted activity. No participation trophies, no simulated milestones."
        actions={<Badge tone="warning">{unlocked.length} of {achievements.length} unlocked</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total focused', value: formatMinutes(totalMinutes), icon: <Clock className="h-4 w-4" />, tone: 'brand' },
          { label: 'Current streak', value: `${computeStreak(data, timezone)} days`, icon: <Flame className="h-4 w-4" />, tone: 'warning' },
          { label: 'Best streak', value: `${computeBestStreak(data, timezone)} days`, icon: <Award className="h-4 w-4" />, tone: 'violet' },
          { label: 'Longest session', value: formatMinutes(longestSession / 60), icon: <Timer className="h-4 w-4" />, tone: 'success' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="flex items-center justify-between text-[10px] uppercase tracking-wider soft">
              {s.label}
              <span className="text-brand-300">{s.icon}</span>
            </p>
            <p className="mt-1.5 font-display text-lg font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Next achievements" subtitle="Closest unlocked milestones, based on live progress" action={<Star className="h-4 w-4 text-amber-400" />} />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {nextUp.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-4 text-center text-[11px] text-emerald-400">
              Every achievement unlocked. Extraordinary consistency — keep the record clean.
            </p>
          ) : (
            nextUp.map((a) => {
              const tier = TIER_STYLE[a.tier]
              return (
                <div key={a.id} className={cn('rounded-2xl border p-3', tier.ring, 'bg-gradient-to-br', tier.bg)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl surface-2', tier.text)}>{ICONS[a.icon] ?? <Trophy className="h-5 w-5" />}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">{a.title}</p>
                      <p className="truncate text-[9.5px] muted">{a.description}</p>
                    </div>
                  </div>
                  <ProgressBar value={a.progress} className="mt-2.5" height="h-1" />
                  <p className="mt-1 text-[9px] soft">
                    {a.remaining > 0 ? `${Math.round(a.remaining * 10) / 10} to go` : 'Almost there'} · {Math.round(a.progress * 100)}%
                  </p>
                </div>
              )
            })
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {achievements.map((a, i) => {
          const tier = TIER_STYLE[a.tier]
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.4) }}
              className={cn(
                'panel relative overflow-hidden p-4',
                a.unlocked ? cn('bg-gradient-to-br', tier.bg, tier.ring) : 'opacity-80',
              )}
            >
              {a.unlocked && <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />}
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                    a.unlocked ? cn('surface-2', tier.ring, tier.text) : 'border-[var(--border)] surface-1 soft',
                  )}
                >
                  {a.unlocked ? ICONS[a.icon] ?? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  {a.unlocked && <span className="absolute inset-0 animate-pulseRing rounded-2xl border border-current opacity-20" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12px] font-semibold">{a.title}</p>
                    <Badge tone={a.tier === 'platinum' ? 'violet' : a.tier === 'gold' ? 'warning' : 'neutral'}>{tier.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-relaxed muted">{a.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={a.progress} height="h-1" tone={a.unlocked ? 'success' : 'brand'} />
                    <span className="shrink-0 text-[9px] soft">{Math.round(a.progress * 100)}%</span>
                  </div>
                  <p className="mt-1 text-[9px] soft">
                    {a.unlocked
                      ? `Unlocked ${new Date(data.userAchievements.find((u) => u.achievement_id === a.id)?.unlocked_at ?? Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      : `Progress: ${Math.round(a.value * 10) / 10} / ${a.threshold}`}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <Card className="mt-4 p-5">
        <SectionHeader title="Personal records" subtitle="Computed from your complete history" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Best study day', value: bestDayEntry ? formatMinutes(bestDayEntry[1]) : '—', hint: bestDayEntry ? new Date(`${bestDayEntry[0]}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No sessions yet' },
            { label: 'Sessions completed', value: `${completed.length}`, hint: `${data.interruptions.length} interruptions recorded` },
            { label: 'Tasks completed', value: `${data.tasks.filter((t) => t.status === 'completed').length}`, hint: `${data.tasks.length} created in total` },
            { label: 'Challenge days', value: `${data.challengeProgress.filter((p) => p.status === 'completed').length}`, hint: 'Days that met their target' },
          ].map((r) => (
            <div key={r.label} className="rounded-2xl border border-[var(--border)] surface-1 p-3">
              <p className="text-[9.5px] uppercase tracking-wider soft">{r.label}</p>
              <p className="mt-1 font-display text-base font-semibold">{r.value}</p>
              <p className="mt-0.5 text-[9.5px] muted">{r.hint}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
