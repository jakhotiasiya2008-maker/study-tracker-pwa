import Dexie, { type Table } from 'dexie';
import type {
  PomodoroSession,
  PlanSettings,
  RewardCoupon,
  RewardRedemption,
  RevisionSchedule,
  StudyTask,
  Subject,
  Topic,
  UserStats,
} from '../types';

export class StudyFlowDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  topics!: Table<Topic, string>;
  tasks!: Table<StudyTask, string>;
  revisions!: Table<RevisionSchedule, string>;
  pomodoros!: Table<PomodoroSession, string>;
  rewards!: Table<RewardCoupon, string>;
  redemptions!: Table<RewardRedemption, string>;
  userStats!: Table<UserStats & { id: string }, string>;
  settingsTable!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('StudyFlowDB');

    this.version(1).stores({
      subjects: 'id, name, examDate, importance, createdAt',
      topics: 'id, subjectId, name, status, difficulty, isHard, completedAt, createdAt',
      tasks: 'id, date, type, subjectId, topicId, completed, isBacklog',
      revisions: 'id, topicId, subjectId, scheduledDate, completed',
      pomodoros: 'id, completedAt, type, subjectId, topicId',
      rewards: 'id, title, cost, redeemedCount',
      redemptions: 'id, couponId, redeemedDate',
      userStats: 'id, todayDate',
      settingsTable: 'key',
    });
  }
}

export const db = new StudyFlowDatabase();

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  dailyStudyHours: 4,
  perDayOverrides: {},
  restDays: [0], // Sunday is rest day by default
  maxDailyHoursCapMultiplier: 1.25,
};

export const DEFAULT_REWARDS: RewardCoupon[] = [
  { id: 'rew-1', title: '15 min guilt-free break', cost: 30, icon: '☕', description: 'Step away, stretch, or grab water', redeemedCount: 0 },
  { id: 'rew-2', title: 'One YouTube episode / show', cost: 60, icon: '📺', description: 'Enjoy your favorite content creator', redeemedCount: 0 },
  { id: 'rew-3', title: 'Favorite snack or treat', cost: 45, icon: '🍩', description: 'Delicious fuel for your brain', redeemedCount: 0 },
  { id: 'rew-4', title: '1 Hour gaming session', cost: 120, icon: '🎮', description: 'Complete today’s plan first!', redeemedCount: 0 },
  { id: 'rew-5', title: 'Mystery Reward Box', cost: 80, icon: '🎁', description: 'Surprise reward for disciplined finishers', redeemedCount: 0, isMystery: true },
];

export const INITIAL_USER_STATS: UserStats = {
  streak: 3,
  lastActiveDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  totalPoints: 185,
  todayPoints: 0,
  todayDate: new Date().toISOString().split('T')[0],
  todayFocusMinutes: 0,
  pointsHistory: {},
};
