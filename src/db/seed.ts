import { addDays, format, subDays } from 'date-fns';
import { DEFAULT_PLAN_SETTINGS, DEFAULT_REWARDS, db } from './db';
import type { Subject, Topic, RevisionSchedule, UserStats } from '../types';
import { generateDailyPlan } from '../services/planner';

export async function seedDemoDataIfNeeded(): Promise<boolean> {
  const subjectCount = await db.subjects.count();
  if (subjectCount > 0) {
    return false; // Already seeded
  }

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
  const twoDaysAgoStr = format(subDays(now, 2), 'yyyy-MM-dd');

  // 1. Create Subjects
  const subjects: Subject[] = [
    {
      id: 'sub-dsa',
      name: 'Data Structures & Algorithms',
      color: '#3B82F6', // Blue
      examDate: format(addDays(now, 16), 'yyyy-MM-dd'),
      importance: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub-os',
      name: 'Operating Systems & Architecture',
      color: '#10B981', // Emerald
      examDate: format(addDays(now, 25), 'yyyy-MM-dd'),
      importance: 4,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sub-dbms',
      name: 'Database Management Systems',
      color: '#8B5CF6', // Purple
      examDate: format(addDays(now, 34), 'yyyy-MM-dd'),
      importance: 4,
      createdAt: new Date().toISOString(),
    },
  ];

  // 2. Create Topics
  const topics: Topic[] = [
    // DSA Topics
    { id: 'top-dsa-1', subjectId: 'sub-dsa', name: 'Binary Trees & Traversals', estimatedHours: 2, difficulty: 'medium', status: 'completed', completedAt: twoDaysAgoStr, createdAt: new Date().toISOString() },
    { id: 'top-dsa-2', subjectId: 'sub-dsa', name: 'Graph Traversals (BFS & DFS)', estimatedHours: 2.5, difficulty: 'hard', isHard: true, status: 'completed', completedAt: yesterdayStr, createdAt: new Date().toISOString() },
    { id: 'top-dsa-3', subjectId: 'sub-dsa', name: 'Dynamic Programming: 1D Problems', estimatedHours: 3, difficulty: 'hard', isHard: true, status: 'in_progress', createdAt: new Date().toISOString() },
    { id: 'top-dsa-4', subjectId: 'sub-dsa', name: 'Shortest Path: Dijkstra & Bellman-Ford', estimatedHours: 2, difficulty: 'hard', status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-dsa-5', subjectId: 'sub-dsa', name: 'Trie & String Algorithms', estimatedHours: 1.5, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-dsa-6', subjectId: 'sub-dsa', name: 'Disjoint Set Union & Kruskal’s MST', estimatedHours: 2, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },

    // OS Topics
    { id: 'top-os-1', subjectId: 'sub-os', name: 'Process Scheduling Algorithms', estimatedHours: 2, difficulty: 'medium', status: 'completed', completedAt: yesterdayStr, createdAt: new Date().toISOString() },
    { id: 'top-os-2', subjectId: 'sub-os', name: 'Deadlock Detection & Banker’s Algorithm', estimatedHours: 2, difficulty: 'hard', isHard: true, status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-os-3', subjectId: 'sub-os', name: 'Virtual Memory & Page Replacement', estimatedHours: 2.5, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-os-4', subjectId: 'sub-os', name: 'File Systems & Disk Scheduling', estimatedHours: 1.5, difficulty: 'easy', status: 'not_started', createdAt: new Date().toISOString() },

    // DBMS Topics
    { id: 'top-db-1', subjectId: 'sub-dbms', name: 'ER Modeling & Relational Schema', estimatedHours: 1.5, difficulty: 'easy', status: 'completed', completedAt: twoDaysAgoStr, createdAt: new Date().toISOString() },
    { id: 'top-db-2', subjectId: 'sub-dbms', name: 'SQL Joins, Subqueries & Aggregations', estimatedHours: 2, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-db-3', subjectId: 'sub-dbms', name: 'Normalization (1NF to BCNF)', estimatedHours: 2.5, difficulty: 'hard', isHard: true, status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-db-4', subjectId: 'sub-dbms', name: 'ACID Properties & Concurrency Control', estimatedHours: 2, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },
    { id: 'top-db-5', subjectId: 'sub-dbms', name: 'B-Trees and Indexing Mechanics', estimatedHours: 1.5, difficulty: 'medium', status: 'not_started', createdAt: new Date().toISOString() },
  ];

  // 3. Spaced Revisions due today and future
  const revisions: RevisionSchedule[] = [
    {
      id: 'rev-dsa-1-1',
      topicId: 'top-dsa-1',
      subjectId: 'sub-dsa',
      revisionNumber: 2,
      scheduledDate: todayStr, // Due today!
      completed: false,
    },
    {
      id: 'rev-os-1-1',
      topicId: 'top-os-1',
      subjectId: 'sub-os',
      revisionNumber: 1,
      scheduledDate: todayStr, // Due today!
      completed: false,
    },
    {
      id: 'rev-db-1-1',
      topicId: 'top-db-1',
      subjectId: 'sub-dbms',
      revisionNumber: 2,
      scheduledDate: format(addDays(now, 2), 'yyyy-MM-dd'),
      completed: false,
    },
  ];

  // 4. Generate daily plan
  const planResult = generateDailyPlan({
    subjects,
    topics,
    revisions,
    startDateStr: todayStr,
    settings: DEFAULT_PLAN_SETTINGS,
  });

  // User Stats with 4-day streak, points history for 90-day heatmap preview
  const pointsHistory: UserStats['pointsHistory'] = {};
  for (let i = 1; i <= 20; i++) {
    const pastDate = format(subDays(now, i), 'yyyy-MM-dd');
    if (i % 5 !== 0) {
      pointsHistory[pastDate] = {
        points: 40 + (i % 3) * 25,
        focusMinutes: 60 + (i % 4) * 30,
        tasksCompleted: 2 + (i % 2),
      };
    }
  }

  const initialUserStats: UserStats & { id: string } = {
    id: 'current-user',
    streak: 4,
    lastActiveDate: yesterdayStr,
    totalPoints: 340,
    todayPoints: 0,
    todayDate: todayStr,
    todayFocusMinutes: 0,
    pointsHistory,
  };

  // Save to Dexie
  await db.transaction('rw', [
    db.subjects,
    db.topics,
    db.revisions,
    db.tasks,
    db.rewards,
    db.userStats,
    db.settingsTable,
  ], async () => {
    await db.subjects.bulkAdd(subjects);
    await db.topics.bulkAdd(topics);
    await db.revisions.bulkAdd(revisions);
    await db.tasks.bulkAdd(planResult.tasks);
    await db.rewards.bulkAdd(DEFAULT_REWARDS);
    await db.userStats.put(initialUserStats);
    await db.settingsTable.put({ key: 'planSettings', value: DEFAULT_PLAN_SETTINGS });
  });

  return true;
}
