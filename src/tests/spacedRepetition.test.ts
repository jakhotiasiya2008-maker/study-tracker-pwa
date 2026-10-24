import { describe, it, expect } from 'vitest';
import {
  generateInitialRevisions,
  calculateNextRevisionDate,
  HARD_TOPIC_INTERVALS,
} from '../services/spacedRepetition';

describe('Spaced Repetition System', () => {
  it('generates standard intervals (+1, +3, +7, +14) for normal topics', () => {
    const revisions = generateInitialRevisions({
      topicId: 't-1',
      subjectId: 's-1',
      completedDate: '2026-10-01',
      examDate: '2026-11-01',
      isHard: false,
    });

    expect(revisions).toHaveLength(4);
    expect(revisions[0].scheduledDate).toBe('2026-10-02'); // +1 day
    expect(revisions[1].scheduledDate).toBe('2026-10-04'); // +3 days
    expect(revisions[2].scheduledDate).toBe('2026-10-08'); // +7 days
    expect(revisions[3].scheduledDate).toBe('2026-10-15'); // +14 days
  });

  it('stops scheduling revisions on or after the exam date', () => {
    // Exam is on 2026-10-06 (only +1 and +3 fit, +7 is 2026-10-08 which is after exam)
    const revisions = generateInitialRevisions({
      topicId: 't-2',
      subjectId: 's-1',
      completedDate: '2026-10-01',
      examDate: '2026-10-06',
    });

    expect(revisions).toHaveLength(2);
    expect(revisions[0].scheduledDate).toBe('2026-10-02');
    expect(revisions[1].scheduledDate).toBe('2026-10-04');
  });

  it('generates denser revisions for topics marked as hard', () => {
    const revisions = generateInitialRevisions({
      topicId: 't-hard',
      subjectId: 's-1',
      completedDate: '2026-10-01',
      examDate: '2026-11-01',
      isHard: true,
    });

    expect(revisions.length).toBe(HARD_TOPIC_INTERVALS.length);
    expect(revisions[0].scheduledDate).toBe('2026-10-02'); // +1
    expect(revisions[1].scheduledDate).toBe('2026-10-03'); // +2
    expect(revisions[2].scheduledDate).toBe('2026-10-05'); // +4
  });

  it('adjusts next revision interval based on ratings', () => {
    // Current interval is 6 days
    // 'easy' rating lengthens interval (6 * 1.5 = 9 days)
    const easyNext = calculateNextRevisionDate({
      lastDate: '2026-10-10',
      currentIntervalDays: 6,
      rating: 'easy',
      examDate: '2026-11-01',
    });
    expect(easyNext).toBe('2026-10-19'); // +9 days

    // 'hard' rating shortens interval (6 * 0.6 = 4 days)
    const hardNext = calculateNextRevisionDate({
      lastDate: '2026-10-10',
      currentIntervalDays: 6,
      rating: 'hard',
      examDate: '2026-11-01',
    });
    expect(hardNext).toBe('2026-10-14'); // +4 days

    // When next date hits or passes exam, returns null
    const examExceeded = calculateNextRevisionDate({
      lastDate: '2026-10-10',
      currentIntervalDays: 6,
      rating: 'easy',
      examDate: '2026-10-15',
    });
    expect(examExceeded).toBeNull();
  });
});
