import { create } from 'zustand';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { db, DEFAULT_PLAN_SETTINGS, DEFAULT_REWARDS, INITIAL_USER_STATS } from '../db/db';
import { seedDemoDataIfNeeded } from '../db/seed';
import { generateDailyPlan } from '../services/planner';
import { identifyBacklogTasks, rebalanceScheduleWithBacklog } from '../services/backlog';
import {
  awardPointsSafely,
  calculatePomodoroBonus,
  calculateTaskPoints,
  computeStreakUpdate,
  DAILY_REWARD_SPEND_CAP,
} from '../services/points';
import { generateInitialRevisions } from '../services/spacedRepetition';
import { DEMO_SQUAD, isSupabaseConfigured, queuePointsForSync, syncQueuedPointsIfOnline } from '../services/supabase';
import type {
  Difficulty,
  PlanGenerationResult,
  PlanSettings,
  RevisionRating,
  RevisionSchedule,
  RewardCoupon,
  Squad,
  StudyTask,
  Subject,
  SystemHealthStatus,
  Topic,
  UserStats,
} from '../types';

export type ScreenTab =
  | 'today'
  | 'calendar'
  | 'subjects'
  | 'progress'
  | 'rewards'
  | 'squad'
  | 'settings';

interface PomodoroState {
  isActive: boolean;
  isPaused: boolean;
  mode: 'focus' | 'short_break' | 'long_break';
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  activeTopicId?: string;
  activeSubjectId?: string;
}

interface StudyFlowStore {
  // Navigation & Theme
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Loading & Plan State
  isLoading: boolean;
  planResult: PlanGenerationResult | null;
  backlogCount: number;

  // Data
  subjects: Subject[];
  topics: Topic[];
  tasks: StudyTask[];
  revisions: RevisionSchedule[];
  userStats: UserStats;
  settings: PlanSettings;
  rewards: RewardCoupon[];
  squad: Squad;
  isDemoMode: boolean;

  // Pomodoro
  pomodoro: PomodoroState;
  startPomodoro: (topicId?: string, subjectId?: string, mode?: 'focus' | 'short_break' | 'long_break') => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  tickPomodoro: () => void;
  stopPomodoro: () => void;

  // Health
  systemHealth: SystemHealthStatus | null;
  refreshSystemHealth: () => Promise<void>;

  // Actions
  initApp: () => Promise<void>;
  runBackgroundChecks: () => Promise<void>;

  // Subject & Topic CRUD
  addSubject: (data: Omit<Subject, 'id' | 'createdAt'>) => Promise<void>;
  updateSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  addTopic: (data: { subjectId: string; name: string; estimatedHours: number; difficulty: Difficulty; isHard?: boolean }) => Promise<void>;
  bulkAddTopics: (subjectId: string, text: string) => Promise<number>;
  deleteTopic: (topicId: string) => Promise<void>;
  toggleTopicHard: (topicId: string) => Promise<void>;

  // Task & Revision Completion
  completeTask: (taskId: string, rating?: RevisionRating) => Promise<void>;
  uncompleteTask: (taskId: string) => Promise<void>;
  triggerReplan: () => Promise<void>;
  resolveImpossible: (action: 'raise_hours' | 'drop_topics' | 'move_rest') => Promise<void>;

  // Rewards
  redeemReward: (rewardId: string) => Promise<{ success: boolean; message: string }>;
  addCustomReward: (coupon: Omit<RewardCoupon, 'id' | 'redeemedCount'>) => Promise<void>;

  // Squad
  nudgeFriend: (targetUserId: string, targetName: string) => void;

  // Settings & Data Management
  updatePlanSettings: (newSettings: Partial<PlanSettings>) => Promise<void>;
  exportDataJson: () => Promise<string>;
  importDataJson: (jsonStr: string) => Promise<boolean>;
  resetAllData: () => Promise<void>;
}

export const useStore = create<StudyFlowStore>((set, get) => ({
  activeTab: 'today',
  setActiveTab: (tab) => set({ activeTab: tab }),
  theme: (localStorage.getItem('studyflow_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('studyflow_theme', next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    set({ theme: next });
  },

  isLoading: true,
  planResult: null,
  backlogCount: 0,

  subjects: [],
  topics: [],
  tasks: [],
  revisions: [],
  userStats: INITIAL_USER_STATS,
  settings: DEFAULT_PLAN_SETTINGS,
  rewards: DEFAULT_REWARDS,
  squad: DEMO_SQUAD,
  isDemoMode: !isSupabaseConfigured,

  pomodoro: {
    isActive: false,
    isPaused: false,
    mode: 'focus',
    timeLeftSeconds: 25 * 60,
    totalDurationSeconds: 25 * 60,
  },

  systemHealth: null,

  initApp: async () => {
    set({ isLoading: true });
    try {
      // 1. Seed demo data on first launch
      await seedDemoDataIfNeeded();

      // 2. Load from Dexie
      const subjects = await db.subjects.toArray();
      const topics = await db.topics.toArray();
      const tasks = await db.tasks.toArray();
      const revisions = await db.revisions.toArray();
      const rewards = await db.rewards.toArray();
      const userStatsRecord = await db.userStats.get('current-user');
      const settingsRecord = await db.settingsTable.get('planSettings');

      const userStats: UserStats = userStatsRecord || { ...INITIAL_USER_STATS, todayDate: format(new Date(), 'yyyy-MM-dd') };
      const settings: PlanSettings = settingsRecord ? settingsRecord.value : DEFAULT_PLAN_SETTINGS;

      // 3. Compute backlog count
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { backlogTasks } = identifyBacklogTasks(tasks, todayStr);

      // 4. Generate plan view
      const planResult = generateDailyPlan({
        subjects,
        topics,
        revisions,
        startDateStr: todayStr,
        settings,
        backlogTasks,
      });

      set({
        subjects,
        topics,
        tasks,
        revisions,
        rewards: rewards.length > 0 ? rewards : DEFAULT_REWARDS,
        userStats,
        settings,
        planResult,
        backlogCount: backlogTasks.length,
        isLoading: false,
      });

      // Background checks & health
      get().runBackgroundChecks();
      get().refreshSystemHealth();
    } catch (err) {
      console.error('Initialization error:', err);
      set({ isLoading: false });
    }
  },

  runBackgroundChecks: async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { tasks, subjects, topics, revisions, settings, userStats } = get();

    // 1. Detect missed days & backlog
    const { backlogTasks } = identifyBacklogTasks(tasks, todayStr);

    // 2. Check if day changed for stats
    if (userStats.todayDate !== todayStr) {
      const updatedStats: UserStats = {
        ...userStats,
        todayDate: todayStr,
        todayPoints: 0,
        todayFocusMinutes: 0,
      };
      await db.userStats.put({ ...updatedStats, id: 'current-user' });
      set({ userStats: updatedStats });
    }

    // 3. Sync queued points if online
    if (navigator.onLine) {
      await syncQueuedPointsIfOnline();
    }

    // 4. Re-balance plan if backlog detected
    if (backlogTasks.length > 0) {
      const rebalanced = rebalanceScheduleWithBacklog({
        subjects,
        topics,
        revisions,
        todayStr,
        settings,
        existingBacklog: backlogTasks,
      });
      set({
        planResult: rebalanced,
        backlogCount: backlogTasks.length,
      });
    }
  },

  refreshSystemHealth: async () => {
    let indexedDBOk = false;
    try {
      await db.subjects.count();
      indexedDBOk = true;
    } catch {}

    const swRegistered = 'serviceWorker' in navigator && Boolean(navigator.serviceWorker.controller);
    const notifPermission: SystemHealthStatus['notifications'] =
      'Notification' in window
        ? (Notification.permission as any)
        : 'unsupported';

    let storageQuota = { usedMB: 0, quotaMB: 0, percentUsed: 0 };
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quotaMB = Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10;
        const percentUsed = quotaMB > 0 ? Math.round((usedMB / quotaMB) * 100) : 0;
        storageQuota = { usedMB, quotaMB, percentUsed };
      } catch {}
    }

    const lastBackupDate = localStorage.getItem('studyflow_last_backup') || undefined;

    set({
      systemHealth: {
        indexedDB: indexedDBOk,
        serviceWorker: swRegistered,
        offlineReady: true,
        notifications: notifPermission,
        storageQuota,
        supabaseConnection: isSupabaseConfigured ? 'connected' : 'demo_mode',
        appVersion: '1.0.0',
        lastBackupDate,
      },
    });
  },

  addSubject: async (data) => {
    const newSubject: Subject = {
      ...data,
      id: `sub-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await db.subjects.add(newSubject);
    const updatedSubjects = [...get().subjects, newSubject];
    set({ subjects: updatedSubjects });
    await get().triggerReplan();
  },

  updateSubject: async (subject) => {
    await db.subjects.put(subject);
    const updatedSubjects = get().subjects.map((s) => (s.id === subject.id ? subject : s));
    set({ subjects: updatedSubjects });
    await get().triggerReplan();
  },

  deleteSubject: async (subjectId) => {
    await db.transaction('rw', [db.subjects, db.topics, db.tasks, db.revisions], async () => {
      await db.subjects.delete(subjectId);
      await db.topics.where('subjectId').equals(subjectId).delete();
      await db.tasks.where('subjectId').equals(subjectId).delete();
      await db.revisions.where('subjectId').equals(subjectId).delete();
    });

    const subjects = await db.subjects.toArray();
    const topics = await db.topics.toArray();
    const revisions = await db.revisions.toArray();
    set({ subjects, topics, revisions });
    await get().triggerReplan();
  },

  addTopic: async (data) => {
    const newTopic: Topic = {
      id: `top-${Date.now()}`,
      subjectId: data.subjectId,
      name: data.name,
      estimatedHours: data.estimatedHours,
      difficulty: data.difficulty,
      isHard: data.isHard,
      status: 'not_started',
      createdAt: new Date().toISOString(),
    };
    await db.topics.add(newTopic);
    set({ topics: [...get().topics, newTopic] });
    await get().triggerReplan();
  },

  bulkAddTopics: async (subjectId, text) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return 0;

    const newTopics: Topic[] = lines.map((line, idx) => ({
      id: `top-${Date.now()}-${idx}`,
      subjectId,
      name: line,
      estimatedHours: 2,
      difficulty: 'medium',
      status: 'not_started',
      createdAt: new Date().toISOString(),
    }));

    await db.topics.bulkAdd(newTopics);
    set({ topics: [...get().topics, newTopics] as any });
    const allTopics = await db.topics.toArray();
    set({ topics: allTopics });
    await get().triggerReplan();
    return newTopics.length;
  },

  deleteTopic: async (topicId) => {
    await db.topics.delete(topicId);
    await db.tasks.where('topicId').equals(topicId).delete();
    await db.revisions.where('topicId').equals(topicId).delete();

    const topics = await db.topics.toArray();
    const revisions = await db.revisions.toArray();
    set({ topics, revisions });
    await get().triggerReplan();
  },

  toggleTopicHard: async (topicId) => {
    const topic = get().topics.find((t) => t.id === topicId);
    if (!topic) return;

    const updated: Topic = { ...topic, isHard: !topic.isHard };
    await db.topics.put(updated);
    set({ topics: get().topics.map((t) => (t.id === topicId ? updated : t)) });
    await get().triggerReplan();
  },

  completeTask: async (taskId, rating) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { tasks, topics, subjects, userStats, squad } = get();

    let task = tasks.find((t) => t.id === taskId);
    if (!task) {
      // Could be newly planned task not yet in state tasks
      const planned = get().planResult?.tasks.find((t) => t.id === taskId);
      if (planned) task = planned;
    }
    if (!task || task.completed) return;

    const associatedTopic = topics.find((t) => t.id === task!.topicId);
    const associatedSubject = subjects.find((s) => s.id === task!.subjectId);
    const difficulty = associatedTopic ? associatedTopic.difficulty : 'medium';

    // 1. Calculate points
    const { totalPoints: earnedPoints } = calculateTaskPoints({
      estimatedHours: task.estimatedHours,
      difficulty,
      isRevision: task.type === 'revision',
      isBacklog: task.isBacklog,
      streak: userStats.streak,
    });

    const { pointsAwarded, newTodayTotal } = awardPointsSafely(userStats.todayPoints, earnedPoints);

    // 2. Update streak
    const { newStreak } = computeStreakUpdate(userStats.lastActiveDate, todayStr, userStats.streak);

    const updatedUserStats: UserStats = {
      ...userStats,
      streak: newStreak,
      lastActiveDate: todayStr,
      totalPoints: userStats.totalPoints + pointsAwarded,
      todayPoints: newTodayTotal,
      pointsHistory: {
        ...userStats.pointsHistory,
        [todayStr]: {
          points: (userStats.pointsHistory[todayStr]?.points || 0) + pointsAwarded,
          focusMinutes: userStats.pointsHistory[todayStr]?.focusMinutes || 0,
          tasksCompleted: (userStats.pointsHistory[todayStr]?.tasksCompleted || 0) + 1,
        },
      },
    };

    // 3. Mark task completed
    const completedTask: StudyTask = {
      ...task,
      completed: true,
      completedAt: new Date().toISOString(),
      revisionRating: rating,
    };

    // 4. If this is a topic completion, generate spaced repetition revisions!
    if (task.type === 'topic' && associatedTopic) {
      const updatedTopic: Topic = {
        ...associatedTopic,
        status: 'completed',
        completedAt: todayStr,
      };
      await db.topics.put(updatedTopic);

      const newRevisions = generateInitialRevisions({
        topicId: associatedTopic.id,
        subjectId: associatedTopic.subjectId,
        completedDate: todayStr,
        examDate: associatedSubject?.examDate,
        isHard: associatedTopic.isHard,
      });

      if (newRevisions.length > 0) {
        await db.revisions.bulkAdd(newRevisions);
        const allRevs = await db.revisions.toArray();
        set({ revisions: allRevs });
      }

      set({
        topics: get().topics.map((t) => (t.id === updatedTopic.id ? updatedTopic : t)),
      });
    }

    // Save task & stats to Dexie
    await db.tasks.put(completedTask);
    await db.userStats.put({ ...updatedUserStats, id: 'current-user' });

    // Sync queue
    queuePointsForSync({
      id: `sync-${Date.now()}`,
      userId: 'current-user',
      points: updatedUserStats.totalPoints,
      streak: updatedUserStats.streak,
      displayName: 'You (Alex)',
      timestamp: new Date().toISOString(),
    });

    // Update squad weekly leaderboard locally
    const updatedSquadMembers = squad.members.map((m) =>
      m.userId === 'current-user'
        ? {
            ...m,
            weeklyPoints: m.weeklyPoints + pointsAwarded,
            totalPoints: updatedUserStats.totalPoints,
            streak: newStreak,
          }
        : m
    );

    // Trigger gentle celebration
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
        });
      } catch {}
    }

    const updatedTasks = [...get().tasks.filter((t) => t.id !== taskId), completedTask];
    set({
      tasks: updatedTasks,
      userStats: updatedUserStats,
      squad: { ...squad, members: updatedSquadMembers },
    });

    await get().triggerReplan();
  },

  uncompleteTask: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const reverted: StudyTask = { ...task, completed: false, completedAt: undefined };
    await db.tasks.put(reverted);
    set({ tasks: get().tasks.map((t) => (t.id === taskId ? reverted : t)) });
    await get().triggerReplan();
  },

  triggerReplan: async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { subjects, topics, revisions, settings, tasks } = get();
    const { backlogTasks } = identifyBacklogTasks(tasks, todayStr);

    const plan = generateDailyPlan({
      subjects,
      topics,
      revisions,
      startDateStr: todayStr,
      settings,
      backlogTasks,
    });

    set({
      planResult: plan,
      backlogCount: backlogTasks.length,
    });
  },

  resolveImpossible: async (action) => {
    const { settings, planResult } = get();

    if (action === 'raise_hours') {
      const suggested = planResult?.options?.suggestedDailyHours || settings.dailyStudyHours + 1.5;
      await get().updatePlanSettings({ dailyStudyHours: suggested });
    } else if (action === 'move_rest') {
      // Clear rest days to make schedule feasible
      await get().updatePlanSettings({ restDays: [] });
    } else if (action === 'drop_topics') {
      const droppable = planResult?.options?.droppableTopicIds || [];
      for (const id of droppable) {
        await get().deleteTopic(id);
      }
    }
  },

  redeemReward: async (rewardId) => {
    const { rewards, userStats } = get();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const coupon = rewards.find((r) => r.id === rewardId);

    if (!coupon) return { success: false, message: 'Reward not found' };

    // Check balance
    if (userStats.totalPoints < coupon.cost) {
      return { success: false, message: `Need ${coupon.cost - userStats.totalPoints} more points!` };
    }

    // Daily spend cap check
    const todayRedemptions = await db.redemptions.where('redeemedDate').equals(todayStr).toArray();
    const todaySpent = todayRedemptions.reduce((sum, r) => sum + r.cost, 0);

    if (todaySpent + coupon.cost > DAILY_REWARD_SPEND_CAP) {
      return {
        success: false,
        message: `Daily reward spend cap (${DAILY_REWARD_SPEND_CAP} pts) reached. Save some for tomorrow!`,
      };
    }

    // Deduct points
    const updatedStats: UserStats = {
      ...userStats,
      totalPoints: userStats.totalPoints - coupon.cost,
    };

    const updatedCoupon: RewardCoupon = {
      ...coupon,
      redeemedCount: coupon.redeemedCount + 1,
    };

    await db.rewards.put(updatedCoupon);
    await db.userStats.put({ ...updatedStats, id: 'current-user' });
    await db.redemptions.add({
      id: `red-${Date.now()}`,
      couponId: coupon.id,
      cost: coupon.cost,
      redeemedDate: todayStr,
      redeemedAt: new Date().toISOString(),
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      try {
        confetti({
          particleCount: 50,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}
    }

    set({
      rewards: get().rewards.map((r) => (r.id === rewardId ? updatedCoupon : r)),
      userStats: updatedStats,
    });

    return {
      success: true,
      message: coupon.isMystery
        ? `🎉 Mystery Unlocked: 30-min movie break or favorite food treat!`
        : `🎉 Redeemed "${coupon.title}"! Enjoy your well-earned break!`,
    };
  },

  addCustomReward: async (coupon) => {
    const newCoupon: RewardCoupon = {
      ...coupon,
      id: `rew-${Date.now()}`,
      redeemedCount: 0,
    };
    await db.rewards.add(newCoupon);
    set({ rewards: [...get().rewards, newCoupon] });
  },

  nudgeFriend: (_targetUserId, targetName) => {
    const { squad } = get();
    const newActivity = {
      id: `nudge-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      action: `sent a study nudge to ${targetName} 👊`,
      timestamp: new Date().toISOString(),
      type: 'nudge' as const,
    };

    set({
      squad: {
        ...squad,
        activity: [newActivity, ...squad.activity],
      },
    });
  },

  startPomodoro: (topicId, subjectId, mode = 'focus') => {
    const durations = {
      focus: 25 * 60,
      short_break: 5 * 60,
      long_break: 15 * 60,
    };
    const dur = durations[mode];

    set({
      pomodoro: {
        isActive: true,
        isPaused: false,
        mode,
        timeLeftSeconds: dur,
        totalDurationSeconds: dur,
        activeTopicId: topicId,
        activeSubjectId: subjectId,
      },
    });
  },

  pausePomodoro: () => {
    set({ pomodoro: { ...get().pomodoro, isPaused: true } });
  },

  resumePomodoro: () => {
    set({ pomodoro: { ...get().pomodoro, isPaused: false } });
  },

  tickPomodoro: () => {
    const { pomodoro } = get();
    if (!pomodoro.isActive || pomodoro.isPaused) return;

    if (pomodoro.timeLeftSeconds <= 1) {
      get().stopPomodoro();
    } else {
      set({
        pomodoro: {
          ...pomodoro,
          timeLeftSeconds: pomodoro.timeLeftSeconds - 1,
        },
      });
    }
  },

  stopPomodoro: async () => {
    const { pomodoro, userStats } = get();
    if (!pomodoro.isActive) return;

    const elapsedSeconds = pomodoro.totalDurationSeconds - pomodoro.timeLeftSeconds;
    const focusMinutes = Math.round(elapsedSeconds / 60);

    if (pomodoro.mode === 'focus' && focusMinutes >= 1) {
      // Calculate bonus
      const bonusPts = calculatePomodoroBonus(focusMinutes, 0);

      const updatedStats: UserStats = {
        ...userStats,
        todayFocusMinutes: userStats.todayFocusMinutes + focusMinutes,
        totalPoints: userStats.totalPoints + bonusPts,
        todayPoints: userStats.todayPoints + bonusPts,
      };

      await db.pomodoros.add({
        id: `pom-${Date.now()}`,
        topicId: pomodoro.activeTopicId,
        subjectId: pomodoro.activeSubjectId,
        durationSeconds: elapsedSeconds,
        completedAt: new Date().toISOString(),
        type: 'focus',
      });

      await db.userStats.put({ ...updatedStats, id: 'current-user' });
      set({ userStats: updatedStats });
    }

    set({
      pomodoro: {
        isActive: false,
        isPaused: false,
        mode: 'focus',
        timeLeftSeconds: 25 * 60,
        totalDurationSeconds: 25 * 60,
      },
    });
  },

  updatePlanSettings: async (newSettings) => {
    const current = get().settings;
    const merged: PlanSettings = { ...current, ...newSettings };
    await db.settingsTable.put({ key: 'planSettings', value: merged });
    set({ settings: merged });
    await get().triggerReplan();
  },

  exportDataJson: async () => {
    const subjects = await db.subjects.toArray();
    const topics = await db.topics.toArray();
    const tasks = await db.tasks.toArray();
    const revisions = await db.revisions.toArray();
    const rewards = await db.rewards.toArray();
    const userStats = await db.userStats.get('current-user');
    const settings = await db.settingsTable.get('planSettings');

    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      subjects,
      topics,
      tasks,
      revisions,
      rewards,
      userStats,
      settings: settings?.value,
    };

    localStorage.setItem('studyflow_last_backup', new Date().toLocaleDateString());
    get().refreshSystemHealth();
    return JSON.stringify(backup, null, 2);
  },

  importDataJson: async (jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.subjects || !data.topics) {
        throw new Error('Invalid StudyFlow backup file');
      }

      await db.transaction('rw', [
        db.subjects,
        db.topics,
        db.tasks,
        db.revisions,
        db.rewards,
        db.userStats,
        db.settingsTable,
      ], async () => {
        await db.subjects.clear();
        await db.topics.clear();
        await db.tasks.clear();
        await db.revisions.clear();
        await db.rewards.clear();

        if (data.subjects.length) await db.subjects.bulkAdd(data.subjects);
        if (data.topics.length) await db.topics.bulkAdd(data.topics);
        if (data.tasks.length) await db.tasks.bulkAdd(data.tasks);
        if (data.revisions.length) await db.revisions.bulkAdd(data.revisions);
        if (data.rewards.length) await db.rewards.bulkAdd(data.rewards);
        if (data.userStats) await db.userStats.put({ ...data.userStats, id: 'current-user' });
        if (data.settings) await db.settingsTable.put({ key: 'planSettings', value: data.settings });
      });

      await get().initApp();
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  },

  resetAllData: async () => {
    await db.delete();
    await db.open();
    localStorage.removeItem('studyflow_last_backup');
    await seedDemoDataIfNeeded();
    await get().initApp();
  },
}));
