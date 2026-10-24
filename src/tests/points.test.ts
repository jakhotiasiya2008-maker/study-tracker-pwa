import { describe, it, expect } from 'vitest';
import {
  calculateTaskPoints,
  awardPointsSafely,
  calculatePomodoroBonus,
  computeStreakUpdate,
  getStreakMultiplier,
  DAILY_POINTS_CAP,
  DAILY_POMODORO_BONUS_CAP,
} from '../services/points';

describe('Points, Streaks & Anti-farming System', () => {
  it('calculates points accurately based on hours, difficulty and streak', () => {
    // 2 hours, medium difficulty (15 pts/hr) -> 30 pts base, streak 1 (1.0x)
    const result1 = calculateTaskPoints({
      estimatedHours: 2,
      difficulty: 'medium',
      streak: 1,
    });
    expect(result1.basePoints).toBe(30);
    expect(result1.bonusPoints).toBe(0);
    expect(result1.totalPoints).toBe(30);

    // Hard difficulty (20 pts/hr), 1.5 hours -> 30 pts base
    // Revision bonus (+10), streak 7 (1.25x multiplier)
    const result2 = calculateTaskPoints({
      estimatedHours: 1.5,
      difficulty: 'hard',
      isRevision: true,
      streak: 7,
    });
    expect(result2.basePoints).toBe(30);
    expect(result2.bonusPoints).toBe(10);
    expect(result2.totalPoints).toBe(Math.round((30 + 10) * 1.25)); // 50

    // Backlog clearing bonus (+15 pts)
    const result3 = calculateTaskPoints({
      estimatedHours: 1,
      difficulty: 'easy',
      isBacklog: true,
      streak: 1,
    });
    expect(result3.basePoints).toBe(10);
    expect(result3.bonusPoints).toBe(15);
    expect(result3.totalPoints).toBe(25);
  });

  it('correctly maps streak multiplier tiers', () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
    expect(getStreakMultiplier(2)).toBe(1.0);
    expect(getStreakMultiplier(3)).toBe(1.1);
    expect(getStreakMultiplier(6)).toBe(1.1);
    expect(getStreakMultiplier(7)).toBe(1.25);
    expect(getStreakMultiplier(13)).toBe(1.25);
    expect(getStreakMultiplier(14)).toBe(1.4);
    expect(getStreakMultiplier(29)).toBe(1.4);
    expect(getStreakMultiplier(30)).toBe(1.5);
    expect(getStreakMultiplier(100)).toBe(1.5);
  });

  it('enforces anti-farming daily points cap', () => {
    // User already has 240 points today; daily cap is 250
    const award1 = awardPointsSafely(240, 20);
    expect(award1.pointsAwarded).toBe(10);
    expect(award1.newTodayTotal).toBe(250);
    expect(award1.capped).toBe(true);

    // User at cap receives 0 more points
    const award2 = awardPointsSafely(DAILY_POINTS_CAP, 30);
    expect(award2.pointsAwarded).toBe(0);
    expect(award2.newTodayTotal).toBe(DAILY_POINTS_CAP);
    expect(award2.capped).toBe(true);
  });

  it('caps Pomodoro focus bonuses at daily limit', () => {
    expect(DAILY_POMODORO_BONUS_CAP).toBe(60);
    // 50 focus minutes = 2 blocks of 25 min = 10 pts
    const bonus1 = calculatePomodoroBonus(50, 0);
    expect(bonus1).toBe(10);

    // When approaching cap of 60 pts
    const bonus2 = calculatePomodoroBonus(100, 55); // normally 20 pts, but only 5 allowed
    expect(bonus2).toBe(5);
  });

  it('calculates streaks correctly across consecutive days, same day, and missed days', () => {
    // Same day activity maintains streak
    const sameDay = computeStreakUpdate('2026-10-24', '2026-10-24', 5);
    expect(sameDay.newStreak).toBe(5);
    expect(sameDay.isMaintained).toBe(true);
    expect(sameDay.isReset).toBe(false);

    // Consecutive day increments streak
    const nextDay = computeStreakUpdate('2026-10-23', '2026-10-24', 5);
    expect(nextDay.newStreak).toBe(6);
    expect(nextDay.isMaintained).toBe(true);
    expect(nextDay.isReset).toBe(false);

    // Missed days (>1 day gap) resets streak to 1
    const missedDay = computeStreakUpdate('2026-10-20', '2026-10-24', 12);
    expect(missedDay.newStreak).toBe(1);
    expect(missedDay.isReset).toBe(true);
  });
});
