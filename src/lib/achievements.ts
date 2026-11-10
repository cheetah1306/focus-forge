import type { Achievement } from './types'

/**
 * Achievement catalogue. Seeded into the database (see migration) and used by the
 * achievement engine to evaluate unlocked badges from real activity only.
 */
export const ACHIEVEMENT_CATALOG: Achievement[] = [
  { id: 'first_session', title: 'First Spark', description: 'Complete your first focus session.', icon: 'Zap', metric: 'sessions_completed', threshold: 1, tier: 'bronze' },
  { id: 'sessions_10', title: 'Momentum', description: 'Complete 10 focus sessions.', icon: 'Flame', metric: 'sessions_completed', threshold: 10, tier: 'silver' },
  { id: 'sessions_50', title: 'Deep Diver', description: 'Complete 50 focus sessions.', icon: 'Waves', metric: 'sessions_completed', threshold: 50, tier: 'gold' },
  { id: 'sessions_100', title: 'Forge Master', description: 'Complete 100 focus sessions.', icon: 'Anvil', metric: 'sessions_completed', threshold: 100, tier: 'platinum' },
  { id: 'hours_5', title: 'Five Hour Club', description: 'Study for 5 total hours.', icon: 'Clock', metric: 'total_hours', threshold: 5, tier: 'bronze' },
  { id: 'hours_20', title: 'Twenty Strong', description: 'Study for 20 total hours.', icon: 'Timer', metric: 'total_hours', threshold: 20, tier: 'silver' },
  { id: 'hours_50', title: 'Half Century', description: 'Study for 50 total hours.', icon: 'Trophy', metric: 'total_hours', threshold: 50, tier: 'gold' },
  { id: 'streak_3', title: 'Three in a Row', description: 'Maintain a 3-day study streak.', icon: 'Flame', metric: 'streak', threshold: 3, tier: 'bronze' },
  { id: 'streak_7', title: 'Week of Focus', description: 'Maintain a 7-day study streak.', icon: 'CalendarCheck', metric: 'streak', threshold: 7, tier: 'silver' },
  { id: 'streak_21', title: 'Habit Formed', description: 'Maintain a 21-day study streak.', icon: 'Sparkles', metric: 'streak', threshold: 21, tier: 'gold' },
  { id: 'perfect_day', title: 'Zero Missed Targets', description: 'Hit every daily target on a single day.', icon: 'Target', metric: 'perfect_days', threshold: 1, tier: 'silver' },
  { id: 'tasks_25', title: 'Task Slayer', description: 'Complete 25 study tasks.', icon: 'CheckCheck', metric: 'tasks_completed', threshold: 25, tier: 'silver' },
  { id: 'challenge_30', title: 'Challenge Conqueror', description: 'Complete all 30 days of a study challenge.', icon: 'Medal', metric: 'challenge_days', threshold: 30, tier: 'platinum' },
]
