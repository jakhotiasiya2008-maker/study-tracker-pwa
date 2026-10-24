import type { Difficulty } from '../types';

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
};

export const REVISION_BONUS_POINTS = 10;
export const BACKLOG_BONUS_POINTS = 15;

/** Daily points caps to prevent farming */
export const DAILY_POINTS_CAP = 250;
export const DAILY_POMODORO_BONUS_CAP = 60;
export const DAILY_REWARD_SPEND_CAP = 200;

/**
 * Returns streak multiplier based on streak days.
 * Consistency beats cramming!
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 14) return 1.4;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

/**
 * Calculates raw points for completing a study task.
 */
export function calculateTaskPoints(params: {
  estimatedHours: number;
  difficulty: Difficulty;
  isRevision?: boolean;
  isBacklog?: boolean;
  streak: number;
}): { basePoints: number; bonusPoints: number; totalPoints: number } {
  const { estimatedHours, difficulty, isRevision, isBacklog, streak } = params;
  const rate = DIFFICULTY_MULTIPLIERS[difficulty] || 15;
  const basePoints = Math.round(estimatedHours * rate);

  let bonus = 0;
  if (isRevision) bonus += REVISION_BONUS_POINTS;
  if (isBacklog) bonus += BACKLOG_BONUS_POINTS;

  const multiplier = getStreakMultiplier(streak);
  const total = Math.round((basePoints + bonus) * multiplier);

  return {
    basePoints,
    bonusPoints: bonus,
    totalPoints: total,
  };
}

/**
 * Anti-farming safe point award: Ensures today's total points do not exceed the daily cap.
 */
export function awardPointsSafely(
  currentTodayPoints: number,
  earnedPoints: number
): { pointsAwarded: number; newTodayTotal: number; capped: boolean } {
  const remainingAllowance = Math.max(0, DAILY_POINTS_CAP - currentTodayPoints);
  const pointsAwarded = Math.min(remainingAllowance, earnedPoints);
  return {
    pointsAwarded,
    newTodayTotal: currentTodayPoints + pointsAwarded,
    capped: pointsAwarded < earnedPoints,
  };
}

/**
 * Pomodoro focus bonus: 5 bonus points per 25-minute Pomodoro session.
 */
export function calculatePomodoroBonus(focusMinutes: number, currentTodayBonus: number): number {
  const possibleBonus = Math.floor(focusMinutes / 25) * 5;
  const allowed = Math.max(0, DAILY_POMODORO_BONUS_CAP - currentTodayBonus);
  return Math.min(possibleBonus, allowed);
}

/**
 * Calculates updated streak when a user finishes a study activity today.
 */
export function computeStreakUpdate(lastActiveDate: string | undefined, todayDate: string, currentStreak: number): {
  newStreak: number;
  isMaintained: boolean;
  isReset: boolean;
} {
  if (!lastActiveDate) {
    return { newStreak: 1, isMaintained: false, isReset: false };
  }

  if (lastActiveDate === todayDate) {
    // Already studied today
    return { newStreak: currentStreak, isMaintained: true, isReset: false };
  }

  // Calculate day difference
  const last = new Date(lastActiveDate);
  const today = new Date(todayDate);
  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) {
    // Consecutive day
    return { newStreak: currentStreak + 1, isMaintained: true, isReset: false };
  } else if (diffDays > 1) {
    // Broken streak
    return { newStreak: 1, isMaintained: false, isReset: true };
  }

  return { newStreak: currentStreak, isMaintained: true, isReset: false };
}
