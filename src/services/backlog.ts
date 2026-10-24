import { isBefore, parseISO, isValid, startOfDay } from 'date-fns';
import type { PlanGenerationResult, PlanSettings, RevisionSchedule, StudyTask, Subject, Topic } from '../types';
import { generateDailyPlan } from './planner';

/**
 * Detects missed tasks from dates strictly before today.
 * Unfinished tasks from past days are flagged as backlog.
 */
export function identifyBacklogTasks(
  allScheduledTasks: StudyTask[],
  todayStr: string
): {
  backlogTasks: StudyTask[];
  activeTodayAndFutureTasks: StudyTask[];
} {
  const today = parseISO(todayStr);
  const todayStart = startOfDay(isValid(today) ? today : new Date());

  const backlogTasks: StudyTask[] = [];
  const activeTodayAndFutureTasks: StudyTask[] = [];

  for (const task of allScheduledTasks) {
    if (task.completed) {
      activeTodayAndFutureTasks.push(task);
      continue;
    }

    const taskDate = parseISO(task.date);
    if (isValid(taskDate) && isBefore(startOfDay(taskDate), todayStart)) {
      // Past uncompleted task becomes backlog
      backlogTasks.push({
        ...task,
        isBacklog: true,
      });
    } else {
      activeTodayAndFutureTasks.push(task);
    }
  }

  return {
    backlogTasks,
    activeTodayAndFutureTasks,
  };
}

/**
 * Re-runs the planner redistributing both backlog and remaining unfinished topics
 * across upcoming days respecting daily caps and exam deadlines.
 */
export function rebalanceScheduleWithBacklog(params: {
  subjects: Subject[];
  topics: Topic[];
  revisions: RevisionSchedule[];
  todayStr: string;
  settings: PlanSettings;
  existingBacklog: StudyTask[];
}): PlanGenerationResult {
  const { subjects, topics, revisions, todayStr, settings, existingBacklog } = params;

  return generateDailyPlan({
    subjects,
    topics,
    revisions,
    startDateStr: todayStr,
    settings,
    backlogTasks: existingBacklog,
  });
}
