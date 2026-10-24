import { describe, it, expect } from 'vitest';
import { generateDailyPlan } from '../services/planner';
import { identifyBacklogTasks, rebalanceScheduleWithBacklog } from '../services/backlog';
import type { PlanSettings, Subject, Topic, StudyTask } from '../types';

describe('Planner & Smart Backlog Engine', () => {
  const baseSettings: PlanSettings = {
    dailyStudyHours: 4,
    perDayOverrides: {},
    restDays: [0], // Sunday
    maxDailyHoursCapMultiplier: 1.25, // max 5 hours / day
  };

  const sampleSubjects: Subject[] = [
    {
      id: 'sub-math',
      name: 'Advanced Mathematics',
      color: '#3B82F6',
      examDate: '2026-11-10', // 17 days away
      importance: 5,
      createdAt: '2026-10-24T00:00:00Z',
    },
    {
      id: 'sub-history',
      name: 'World History',
      color: '#10B981',
      examDate: '2026-11-20', // 27 days away
      importance: 3,
      createdAt: '2026-10-24T00:00:00Z',
    },
  ];

  it('distributes topics across days and finishes new topics ~2 days before exam', () => {
    const topics: Topic[] = [
      { id: 't-1', subjectId: 'sub-math', name: 'Calculus III', estimatedHours: 3, difficulty: 'hard', isHard: true, status: 'not_started', createdAt: '2026-10-24' },
      { id: 't-2', subjectId: 'sub-math', name: 'Linear Algebra', estimatedHours: 2, difficulty: 'medium', status: 'not_started', createdAt: '2026-10-24' },
      { id: 't-3', subjectId: 'sub-history', name: 'Industrial Revolution', estimatedHours: 2, difficulty: 'easy', status: 'not_started', createdAt: '2026-10-24' },
    ];

    const plan = generateDailyPlan({
      subjects: sampleSubjects,
      topics,
      revisions: [],
      startDateStr: '2026-10-24',
      settings: baseSettings,
    });

    expect(plan.impossible).toBe(false);
    expect(plan.tasks.length).toBe(3);

    // Mathematics topics (exam 2026-11-10) must be scheduled on or before 2026-11-08 (2 days before exam)
    const mathTasks = plan.tasks.filter((t) => t.subjectId === 'sub-math');
    mathTasks.forEach((task) => {
      expect(task.date <= '2026-11-08').toBe(true);
    });
  });

  it('prioritizes nearer exams, harder topics and higher importance', () => {
    const topics: Topic[] = [
      { id: 't-easy-far', subjectId: 'sub-history', name: 'Easy History Topic', estimatedHours: 2, difficulty: 'easy', status: 'not_started', createdAt: '2026-10-24' },
      { id: 't-hard-near', subjectId: 'sub-math', name: 'Hard Math Topic', estimatedHours: 2, difficulty: 'hard', status: 'not_started', createdAt: '2026-10-24' },
    ];

    const plan = generateDailyPlan({
      subjects: sampleSubjects,
      topics,
      revisions: [],
      startDateStr: '2026-10-24',
      settings: baseSettings,
    });

    const hardNearTask = plan.tasks.find((t) => t.topicId === 't-hard-near');
    const easyFarTask = plan.tasks.find((t) => t.topicId === 't-easy-far');

    expect(hardNearTask).toBeDefined();
    expect(easyFarTask).toBeDefined();
    // Hard nearer topic is scheduled on first available slot
    expect(hardNearTask!.date <= easyFarTask!.date).toBe(true);
  });

  it('detects impossible schedules with honest warnings and actionable options', () => {
    // Subject with exam tomorrow - impossible to fit 12 hours of topics in 1 day with 4 hours/day cap!
    const urgentSubject: Subject = {
      id: 'sub-urgent',
      name: 'Urgent Physics',
      color: '#EF4444',
      examDate: '2026-10-25',
      importance: 5,
      createdAt: '2026-10-24',
    };

    const bigTopics: Topic[] = [
      { id: 't-p1', subjectId: 'sub-urgent', name: 'Quantum Mechanics', estimatedHours: 4, difficulty: 'hard', status: 'not_started', createdAt: '2026-10-24' },
      { id: 't-p2', subjectId: 'sub-urgent', name: 'Thermodynamics', estimatedHours: 4, difficulty: 'hard', status: 'not_started', createdAt: '2026-10-24' },
      { id: 't-p3', subjectId: 'sub-urgent', name: 'Electromagnetism', estimatedHours: 4, difficulty: 'hard', status: 'not_started', createdAt: '2026-10-24' },
    ];

    const plan = generateDailyPlan({
      subjects: [urgentSubject],
      topics: bigTopics,
      revisions: [],
      startDateStr: '2026-10-24',
      settings: baseSettings,
    });

    expect(plan.impossible).toBe(true);
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.options).toBeDefined();
    expect(plan.options?.suggestedDailyHours).toBeGreaterThan(baseSettings.dailyStudyHours);
    expect(plan.options?.droppableTopicIds?.length).toBeGreaterThan(0);
  });

  it('identifies uncompleted past tasks as backlog and redistributes them with daily cap (no 3x pileups)', () => {
    const pastTasks: StudyTask[] = [
      { id: 'task-old-1', date: '2026-10-22', type: 'topic', subjectId: 'sub-math', topicId: 't-1', title: 'Calculus III', estimatedHours: 2, completed: false },
      { id: 'task-old-2', date: '2026-10-23', type: 'topic', subjectId: 'sub-history', topicId: 't-2', title: 'French Revolution', estimatedHours: 2, completed: false },
      { id: 'task-done', date: '2026-10-23', type: 'topic', subjectId: 'sub-history', topicId: 't-3', title: 'Done Topic', estimatedHours: 1, completed: true },
    ];

    const { backlogTasks, activeTodayAndFutureTasks } = identifyBacklogTasks(pastTasks, '2026-10-24');
    expect(backlogTasks.length).toBe(2);
    expect(backlogTasks[0].isBacklog).toBe(true);
    expect(activeTodayAndFutureTasks.length).toBe(1);

    // Rebalance with backlog
    const rebalanced = rebalanceScheduleWithBacklog({
      subjects: sampleSubjects,
      topics: [],
      revisions: [],
      todayStr: '2026-10-24',
      settings: baseSettings,
      existingBacklog: backlogTasks,
    });

    // Backlog tasks should be scheduled starting today or upcoming days
    expect(rebalanced.tasks.length).toBe(2);
    rebalanced.tasks.forEach((task) => {
      expect(task.date >= '2026-10-24').toBe(true);
    });

    // Ensure daily hours on day 1 does not exceed max cap (5.0 hours)
    const day1Tasks = rebalanced.tasks.filter((t) => t.date === '2026-10-24');
    const day1Hours = day1Tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    expect(day1Hours).toBeLessThanOrEqual(baseSettings.dailyStudyHours * baseSettings.maxDailyHoursCapMultiplier);
  });
});
