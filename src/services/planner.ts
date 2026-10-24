import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  isBefore,
  parseISO,
  isValid,
} from 'date-fns';
import type {
  PlanGenerationResult,
  PlanSettings,
  RevisionSchedule,
  StudyTask,
  Subject,
  Topic,
} from '../types';

export const DIFFICULTY_WEIGHT: Record<string, number> = {
  hard: 3,
  medium: 2,
  easy: 1,
};

export const REVISION_ESTIMATED_HOURS = 0.5; // Estimated 30 minutes per revision

export interface PlannerInput {
  subjects: Subject[];
  topics: Topic[];
  revisions: RevisionSchedule[];
  startDateStr: string; // 'YYYY-MM-DD'
  settings: PlanSettings;
  backlogTasks?: StudyTask[];
}

export function generateDailyPlan(input: PlannerInput): PlanGenerationResult {
  const {
    subjects,
    topics,
    revisions,
    startDateStr,
    settings,
    backlogTasks = [],
  } = input;

  const startDate = parseISO(startDateStr);
  if (!isValid(startDate)) {
    throw new Error(`Invalid start date: ${startDateStr}`);
  }

  const subjectMap = new Map<string, Subject>();
  subjects.forEach((s) => subjectMap.set(s.id, s));

  // 1. Gather unfinished topics
  const unfinishedTopics = topics.filter((t) => t.status !== 'completed');

  // Also include backlog tasks that weren't completed
  const uncompletedBacklog = backlogTasks.filter((b) => !b.completed);

  // Calculate total workload
  const totalTopicHours = unfinishedTopics.reduce((sum, t) => sum + (t.estimatedHours || 1), 0);
  const totalBacklogHours = uncompletedBacklog.reduce((sum, b) => sum + (b.estimatedHours || 1), 0);
  const totalEstimatedHours = totalTopicHours + totalBacklogHours;

  // Find the latest exam date among all subjects to establish schedule horizon (min 14 days, max 90 days)
  let latestExamDate = addDays(startDate, 30);
  for (const sub of subjects) {
    if (sub.examDate) {
      const eDate = parseISO(sub.examDate);
      if (isValid(eDate) && isBefore(latestExamDate, eDate)) {
        latestExamDate = eDate;
      }
    }
  }

  const horizonDays = Math.max(
    14,
    Math.min(90, differenceInCalendarDays(latestExamDate, startDate) + 1)
  );

  // Pre-calculate daily capacity for the horizon
  interface DayCapacity {
    dateStr: string;
    date: Date;
    dayOfWeek: number;
    baseHours: number;
    maxHours: number;
    usedHours: number;
    tasks: StudyTask[];
    isRestDay: boolean;
  }

  const calendarDays: DayCapacity[] = [];
  let availableHoursTotal = 0;
  let restDaysCount = 0;

  for (let i = 0; i < horizonDays; i++) {
    const d = addDays(startDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayOfWeek = getDay(d); // 0 = Sunday, 6 = Saturday

    const hasOverride = settings.perDayOverrides && settings.perDayOverrides[dateStr] !== undefined;
    const isRest = settings.restDays.includes(dayOfWeek) && !hasOverride;

    if (isRest) {
      restDaysCount++;
    }

    const baseHours = hasOverride
      ? settings.perDayOverrides[dateStr]
      : isRest
      ? 0
      : settings.dailyStudyHours;

    const maxCapMultiplier = settings.maxDailyHoursCapMultiplier || 1.25;
    const maxHours = Math.round(baseHours * maxCapMultiplier * 10) / 10;

    calendarDays.push({
      dateStr,
      date: d,
      dayOfWeek,
      baseHours,
      maxHours,
      usedHours: 0,
      tasks: [],
      isRestDay: isRest,
    });

    availableHoursTotal += baseHours;
  }

  // 2. Schedule revisions first on their target dates
  const dayIndexMap = new Map<string, number>();
  calendarDays.forEach((cd, idx) => dayIndexMap.set(cd.dateStr, idx));

  for (const rev of revisions) {
    if (rev.completed) continue;
    const dayIdx = dayIndexMap.get(rev.scheduledDate);
    if (dayIdx !== undefined) {
      const matchingTopic = topics.find((t) => t.id === rev.topicId);
      const title = matchingTopic
        ? `Revision #${rev.revisionNumber}: ${matchingTopic.name}`
        : `Revision #${rev.revisionNumber}`;

      const revTask: StudyTask = {
        id: rev.id,
        type: 'revision',
        subjectId: rev.subjectId,
        topicId: rev.topicId,
        date: rev.scheduledDate,
        title,
        estimatedHours: REVISION_ESTIMATED_HOURS,
        completed: false,
        revisionNumber: rev.revisionNumber,
      };

      calendarDays[dayIdx].tasks.push(revTask);
      calendarDays[dayIdx].usedHours += REVISION_ESTIMATED_HOURS;
    }
  }

  // 3. Prepare backlog tasks with high priority
  const prioritizedBacklog: Array<{
    task: StudyTask;
    importance: number;
    difficultyWeight: number;
    deadlineDays: number;
  }> = [];

  for (const b of uncompletedBacklog) {
    const subject = subjectMap.get(b.subjectId);
    const importance = subject ? subject.importance : 3;
    let deadlineDays = 30;

    if (subject?.examDate) {
      const examD = parseISO(subject.examDate);
      if (isValid(examD)) {
        // Target finishing 2 days before exam
        const targetDeadline = addDays(examD, -2);
        deadlineDays = Math.max(0, differenceInCalendarDays(targetDeadline, startDate));
      }
    }

    prioritizedBacklog.push({
      task: { ...b, isBacklog: true },
      importance,
      difficultyWeight: 2,
      deadlineDays,
    });
  }

  // 4. Prepare unfinished topics with ranking
  const topicQueue: Array<{
    topic: Topic;
    subject?: Subject;
    deadlineDays: number;
    importance: number;
    difficultyWeight: number;
    estimatedHours: number;
  }> = [];

  for (const topic of unfinishedTopics) {
    const subject = subjectMap.get(topic.subjectId);
    let deadlineDays = 30;

    if (subject?.examDate) {
      const examD = parseISO(subject.examDate);
      if (isValid(examD)) {
        // Rule: Finish all new topics ~2 days before each exam; reserve the rest for revision
        const targetFinish = addDays(examD, -2);
        const daysDiff = differenceInCalendarDays(targetFinish, startDate);
        deadlineDays = Math.max(0, daysDiff);
      }
    }

    const importance = subject ? subject.importance : 3;
    const difficultyWeight = DIFFICULTY_WEIGHT[topic.difficulty] || 2;
    const isHardBonus = topic.isHard ? 1 : 0;

    topicQueue.push({
      topic,
      subject,
      deadlineDays,
      importance,
      difficultyWeight: difficultyWeight + isHardBonus,
      estimatedHours: topic.estimatedHours || 1,
    });
  }

  // Sort backlog and topics by:
  // 1) Closer deadline first
  // 2) Higher importance first
  // 3) Higher difficulty first
  topicQueue.sort((a, b) => {
    if (a.deadlineDays !== b.deadlineDays) {
      return a.deadlineDays - b.deadlineDays;
    }
    if (b.importance !== a.importance) {
      return b.importance - a.importance;
    }
    if (b.difficultyWeight !== a.difficultyWeight) {
      return b.difficultyWeight - a.difficultyWeight;
    }
    return b.estimatedHours - a.estimatedHours;
  });

  prioritizedBacklog.sort((a, b) => {
    if (a.deadlineDays !== b.deadlineDays) {
      return a.deadlineDays - b.deadlineDays;
    }
    return b.importance - a.importance;
  });

  // 5. Distribute backlog tasks first
  for (const item of prioritizedBacklog) {
    let placed = false;
    const taskHours = item.task.estimatedHours;

    for (let dayIdx = 0; dayIdx < calendarDays.length; dayIdx++) {
      const day = calendarDays[dayIdx];
      if (day.maxHours <= 0) continue; // Rest day with 0 capacity

      // Prevent 3x pile-ups: do not exceed maxHours
      if (day.usedHours + taskHours <= day.maxHours || day.usedHours === 0) {
        day.tasks.push({
          ...item.task,
          date: day.dateStr,
        });
        day.usedHours += taskHours;
        placed = true;
        break;
      }
    }

    if (!placed && calendarDays.length > 0) {
      // Place on earliest day with least load
      let minLoadDay = calendarDays[0];
      for (const d of calendarDays) {
        if (d.usedHours < minLoadDay.usedHours && d.maxHours > 0) {
          minLoadDay = d;
        }
      }
      minLoadDay.tasks.push({
        ...item.task,
        date: minLoadDay.dateStr,
      });
      minLoadDay.usedHours += taskHours;
    }
  }

  // 6. Distribute new topics across days before their deadlines
  const unplacedTopics: Topic[] = [];

  for (const item of topicQueue) {
    const taskHours = item.estimatedHours;
    let placed = false;

    // Must be placed on or before deadlineDays
    const maxDayIdx = Math.min(calendarDays.length - 1, item.deadlineDays);

    for (let dayIdx = 0; dayIdx <= maxDayIdx; dayIdx++) {
      const day = calendarDays[dayIdx];
      if (day.maxHours <= 0) continue; // Rest day

      // Check if day can fit this topic within capacity
      if (day.usedHours + taskHours <= day.maxHours) {
        day.tasks.push({
          id: `task-${item.topic.id}-${day.dateStr}`,
          type: 'topic',
          subjectId: item.topic.subjectId,
          topicId: item.topic.id,
          date: day.dateStr,
          title: item.topic.name,
          estimatedHours: taskHours,
          completed: false,
        });
        day.usedHours += taskHours;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Try any non-rest day up to deadline with smallest overload
      let bestDay: DayCapacity | null = null;
      let minOverload = Infinity;

      for (let dayIdx = 0; dayIdx <= maxDayIdx; dayIdx++) {
        const day = calendarDays[dayIdx];
        if (day.maxHours <= 0) continue;

        const currentOverload = day.usedHours + taskHours - day.maxHours;
        // Limit overload to max 1.5x of base hours to prevent unrealistic pile-ups
        if (day.usedHours + taskHours <= day.baseHours * 1.5 && currentOverload < minOverload) {
          minOverload = currentOverload;
          bestDay = day;
        }
      }

      if (bestDay) {
        bestDay.tasks.push({
          id: `task-${item.topic.id}-${bestDay.dateStr}`,
          type: 'topic',
          subjectId: item.topic.subjectId,
          topicId: item.topic.id,
          date: bestDay.dateStr,
          title: item.topic.name,
          estimatedHours: taskHours,
          completed: false,
        });
        bestDay.usedHours += taskHours;
        placed = true;
      } else {
        unplacedTopics.push(item.topic);
      }
    }
  }

  // 7. Check for impossible schedule and warnings
  const warnings: string[] = [];
  let isImpossible = false;

  if (unplacedTopics.length > 0) {
    isImpossible = true;
    const affectedSubjectIds = Array.from(new Set(unplacedTopics.map((t) => t.subjectId)));
    const affectedSubjects = affectedSubjectIds
      .map((id) => subjectMap.get(id)?.name || 'Subject')
      .join(', ');

    warnings.push(
      `Impossible Schedule: ${unplacedTopics.length} topic(s) in ${affectedSubjects} cannot fit before their exam dates (with 2 days reserved for revision).`
    );
  }

  // Total capacity check
  if (totalEstimatedHours > availableHoursTotal) {
    isImpossible = true;
    const deficit = Math.round((totalEstimatedHours - availableHoursTotal) * 10) / 10;
    warnings.push(
      `Total workload (${totalEstimatedHours}h) exceeds total scheduled study time (${availableHoursTotal}h) by ${deficit}h.`
    );
  }

  // Options to resolve impossible schedule
  let options: PlanGenerationResult['options'] = undefined;
  if (isImpossible) {
    const studyDays = calendarDays.filter((d) => !d.isRestDay).length || 1;
    const suggestedHours = Math.ceil((totalEstimatedHours / studyDays) * 10) / 10;

    // Droppable topics: lowest importance topics
    const droppableTopics = [...unfinishedTopics].sort((a, b) => {
      const impA = subjectMap.get(a.subjectId)?.importance ?? 3;
      const impB = subjectMap.get(b.subjectId)?.importance ?? 3;
      return impA - impB; // lowest first
    });

    options = {
      suggestedDailyHours: Math.max(settings.dailyStudyHours + 1, suggestedHours),
      droppableTopicIds: droppableTopics.slice(0, 3).map((t) => t.id),
      canMoveRestDays: restDaysCount > 0,
    };
  }

  // Flatten all tasks
  const allTasks = calendarDays.flatMap((d) => d.tasks);

  return {
    tasks: allTasks,
    impossible: isImpossible,
    warnings,
    options,
    totalEstimatedHours,
    availableHoursTotal,
  };
}
