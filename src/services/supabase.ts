import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Squad } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mock / Demo Squad Data for demo mode
export const DEMO_SQUAD: Squad = {
  id: 'demo-squad-1',
  name: 'Focus Flow Champions 🚀',
  inviteCode: 'FLOW-8821',
  createdBy: 'current-user',
  members: [
    {
      userId: 'user-1',
      displayName: 'Rahul Sharma',
      weeklyPoints: 280,
      totalPoints: 1240,
      streak: 9,
      isWeeklyWinner: true,
    },
    {
      userId: 'current-user',
      displayName: 'You (Alex)',
      weeklyPoints: 215,
      totalPoints: 960,
      streak: 4,
    },
    {
      userId: 'user-3',
      displayName: 'Priya Patel',
      weeklyPoints: 190,
      totalPoints: 850,
      streak: 7,
    },
    {
      userId: 'user-4',
      displayName: 'Maya Lin',
      weeklyPoints: 145,
      totalPoints: 620,
      streak: 3,
    },
    {
      userId: 'user-5',
      displayName: 'David Kim',
      weeklyPoints: 90,
      totalPoints: 410,
      streak: 2,
    },
  ],
  activity: [
    {
      id: 'act-1',
      userId: 'user-1',
      userName: 'Rahul Sharma',
      action: 'completed 3 revision sessions and topped weekly leaderboard',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'task_completed',
    },
    {
      id: 'act-2',
      userId: 'user-3',
      userName: 'Priya Patel',
      action: 'unlocked a 7-day study streak milestone 🔥',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      type: 'streak_milestone',
    },
    {
      id: 'act-3',
      userId: 'current-user',
      userName: 'You',
      action: 'cleared 2 backlog tasks with bonus points',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      type: 'revision_cleared',
    },
  ],
};

export interface SyncQueueItem {
  id: string;
  userId: string;
  points: number;
  streak: number;
  displayName: string;
  timestamp: string;
}

const SYNC_QUEUE_KEY = 'studyflow_point_sync_queue';

export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queuePointsForSync(item: SyncQueueItem): void {
  const queue = getSyncQueue();
  queue.push(item);
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to queue points in localStorage', err);
  }
}

export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch {}
}

export async function syncQueuedPointsIfOnline(): Promise<number> {
  if (!navigator.onLine) return 0;
  const queue = getSyncQueue();
  if (queue.length === 0) return 0;

  if (!isSupabaseConfigured || !supabase) {
    // In demo mode, simulated sync
    clearSyncQueue();
    return queue.length;
  }

  try {
    // With real supabase: upsert into user_leaderboard table
    for (const item of queue) {
      await supabase.from('squad_members').upsert({
        user_id: item.userId,
        display_name: item.displayName,
        total_points: item.points,
        streak: item.streak,
        updated_at: new Date().toISOString(),
      });
    }
    clearSyncQueue();
    return queue.length;
  } catch (err) {
    console.error('Error syncing queued points:', err);
    return 0;
  }
}
