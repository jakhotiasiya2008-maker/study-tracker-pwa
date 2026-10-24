export type Difficulty = 'easy' | 'medium' | 'hard';
export type TaskType = 'topic' | 'revision';
export type RevisionRating = 'easy' | 'okay' | 'hard';

export interface Subject {
  id: string;
  name: string;
  color: string;
  examDate: string; // ISO date 'YYYY-MM-DD'
  importance: number; // 1 (lowest) to 5 (highest)
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  estimatedHours: number;
  difficulty: Difficulty;
  isHard?: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  scheduledDate?: string;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  type: TaskType;
  subjectId: string;
  topicId: string;
  date: string; // 'YYYY-MM-DD'
  title: string;
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  isBacklog?: boolean;
  revisionNumber?: number; // 1, 2, 3, 4, etc.
  revisionRating?: RevisionRating;
  focusMinutes?: number;
}

export interface RevisionSchedule {
  id: string;
  topicId: string;
  subjectId: string;
  revisionNumber: number; // 1 (+1 day), 2 (+3), 3 (+7), 4 (+14)
  scheduledDate: string; // 'YYYY-MM-DD'
  completed: boolean;
  completedAt?: string;
  rating?: RevisionRating;
}

export interface PlanSettings {
  dailyStudyHours: number; // Default daily study hours (e.g., 4)
  perDayOverrides: Record<string, number>; // 'YYYY-MM-DD' -> hours
  restDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  maxDailyHoursCapMultiplier: number; // Default 1.25 (e.g. max 5 hours if base is 4)
}

export interface PlanGenerationResult {
  tasks: StudyTask[];
  impossible: boolean;
  warnings: string[];
  options?: {
    suggestedDailyHours?: number;
    droppableTopicIds?: string[];
    canMoveRestDays?: boolean;
  };
  totalEstimatedHours: number;
  availableHoursTotal: number;
}

export interface PomodoroSession {
  id: string;
  topicId?: string;
  subjectId?: string;
  durationSeconds: number;
  completedAt: string;
  type: 'focus' | 'short_break' | 'long_break';
}

export interface RewardCoupon {
  id: string;
  title: string;
  cost: number; // Point cost to redeem
  icon: string;
  description?: string;
  redeemedCount: number;
  isMystery?: boolean;
}

export interface RewardRedemption {
  id: string;
  couponId: string;
  cost: number;
  redeemedDate: string; // 'YYYY-MM-DD'
  redeemedAt: string;
}

export interface UserStats {
  streak: number;
  lastActiveDate?: string; // 'YYYY-MM-DD'
  totalPoints: number;
  todayPoints: number;
  todayDate: string; // 'YYYY-MM-DD'
  todayFocusMinutes: number;
  pointsHistory: Record<string, { points: number; focusMinutes: number; tasksCompleted: number }>;
}

export interface SquadMember {
  userId: string;
  displayName: string;
  weeklyPoints: number;
  totalPoints: number;
  streak: number;
  avatarSeed?: string;
  isWeeklyWinner?: boolean;
}

export interface SquadActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  type: 'task_completed' | 'streak_milestone' | 'revision_cleared' | 'nudge';
}

export interface Squad {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: SquadMember[];
  activity: SquadActivity[];
}

export interface SystemHealthStatus {
  indexedDB: boolean;
  serviceWorker: boolean;
  offlineReady: boolean;
  notifications: 'granted' | 'denied' | 'default' | 'unsupported';
  storageQuota: {
    usedMB: number;
    quotaMB: number;
    percentUsed: number;
  };
  supabaseConnection: 'connected' | 'demo_mode' | 'error';
  appVersion: string;
  lastBackupDate?: string;
}
