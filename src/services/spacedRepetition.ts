import { addDays, parseISO, format, isBefore, isValid } from 'date-fns';
import type { RevisionRating, RevisionSchedule } from '../types';

/** Standard spaced repetition intervals in days */
export const DEFAULT_INTERVALS = [1, 3, 7, 14];

/** For topics marked as hard, intervals are denser and more frequent */
export const HARD_TOPIC_INTERVALS = [1, 2, 4, 7, 12, 18];

/**
 * Generates spaced repetition revisions for a completed topic.
 * Stops scheduling revisions if they fall on or after the exam date.
 */
export function generateInitialRevisions(params: {
  topicId: string;
  subjectId: string;
  completedDate: string; // 'YYYY-MM-DD'
  examDate?: string;     // 'YYYY-MM-DD'
  isHard?: boolean;
}): RevisionSchedule[] {
  const { topicId, subjectId, completedDate, examDate, isHard } = params;
  const baseDate = parseISO(completedDate);
  if (!isValid(baseDate)) return [];

  const intervals = isHard ? HARD_TOPIC_INTERVALS : DEFAULT_INTERVALS;
  const examDateTime = examDate ? parseISO(examDate) : null;
  const validExam = examDateTime && isValid(examDateTime) ? examDateTime : null;

  const revisions: RevisionSchedule[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const daysToAdd = intervals[i];
    const targetDate = addDays(baseDate, daysToAdd);
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // Stop scheduling if the revision is on or after the exam date
    if (validExam && !isBefore(targetDate, validExam)) {
      break;
    }

    revisions.push({
      id: `rev-${topicId}-${i + 1}-${dateStr}`,
      topicId,
      subjectId,
      revisionNumber: i + 1,
      scheduledDate: dateStr,
      completed: false,
    });
  }

  return revisions;
}

/**
 * Adjust the next revision interval based on user rating:
 * - 'easy': lengthens the interval by 1.5x
 * - 'okay': keeps current interval pace
 * - 'hard': shortens the interval by ~40% (or schedules a quick follow-up in 1-2 days)
 */
export function calculateNextRevisionDate(params: {
  lastDate: string; // 'YYYY-MM-DD'
  currentIntervalDays: number;
  rating: RevisionRating;
  examDate?: string;
}): string | null {
  const { lastDate, currentIntervalDays, rating, examDate } = params;
  const base = parseISO(lastDate);
  if (!isValid(base)) return null;

  let multiplier = 1.0;
  if (rating === 'easy') {
    multiplier = 1.5;
  } else if (rating === 'hard') {
    multiplier = 0.6;
  }

  const nextInterval = Math.max(1, Math.round(currentIntervalDays * multiplier));
  const nextDate = addDays(base, nextInterval);
  const nextDateStr = format(nextDate, 'yyyy-MM-dd');

  if (examDate) {
    const exam = parseISO(examDate);
    if (isValid(exam) && !isBefore(nextDate, exam)) {
      return null; // Exam date reached or passed
    }
  }

  return nextDateStr;
}
