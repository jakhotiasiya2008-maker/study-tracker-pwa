import React, { useState } from 'react';
import {
  CheckCircle,
  Circle,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Clock,
  Play,
  RotateCw,
  Plus,
  Zap,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useStore } from '../../store/useStore';
import type { RevisionRating } from '../../types';

export const TodayView: React.FC<{ onOpenPomodoroForTopic: (topicId: string, subjectId: string) => void }> = ({
  onOpenPomodoroForTopic,
}) => {
  const {
    planResult,
    subjects,
    topics,
    completeTask,
    uncompleteTask,
    triggerReplan,
    resolveImpossible,
    userStats,
    backlogCount,
    setActiveTab,
  } = useStore();

  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0);
  const targetDate = addDays(new Date(), selectedDateOffset);
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');

  // Filter tasks for the selected date
  const dateTasks = (planResult?.tasks || []).filter((t) => t.date === targetDateStr);
  const revisionsDue = dateTasks.filter((t) => t.type === 'revision');
  const topicsScheduled = dateTasks.filter((t) => t.type === 'topic');

  // Completed count & goal ring
  const completedTasks = dateTasks.filter((t) => t.completed).length;
  const totalTasks = dateTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Rating modal/popover state for completing revision
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);

  const handleTaskToggle = (taskId: string, isCompleted: boolean, isRevision?: boolean) => {
    if (isCompleted) {
      uncompleteTask(taskId);
    } else {
      if (isRevision) {
        setRatingTaskId(taskId);
      } else {
        completeTask(taskId);
      }
    }
  };

  const handleRatingSubmit = (rating: RevisionRating) => {
    if (ratingTaskId) {
      completeTask(ratingTaskId, rating);
      setRatingTaskId(null);
    }
  };

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* 1. Date Header & Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400">
            {selectedDateOffset === 0 ? 'Today’s Mission' : selectedDateOffset === 1 ? 'Tomorrow' : 'Previous Day'}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {format(targetDate, 'EEEE, MMM d')}
          </h1>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setSelectedDateOffset(selectedDateOffset - 1)}
            aria-label="Previous Day"
            className="px-2.5 py-1 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
          >
            {format(subDays(targetDate, 1), 'd MMM')}
          </button>
          <button
            onClick={() => setSelectedDateOffset(0)}
            aria-label="Today"
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
              selectedDateOffset === 0
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDateOffset(selectedDateOffset + 1)}
            aria-label="Next Day"
            className="px-2.5 py-1 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
          >
            {format(addDays(targetDate, 1), 'd MMM')}
          </button>
        </div>
      </div>

      {/* 2. Daily Goal Ring & Stats Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10 border border-blue-500/20 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Daily Goal Ring
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {completedTasks} of {totalTasks} Tasks Done
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {userStats.todayPoints} pts earned today · {userStats.todayFocusMinutes}m deep focus
            </p>
          </div>

          {/* Goal Circular Ring */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                className="stroke-blue-500 transition-all duration-500 ease-out"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={(2 * Math.PI * 32) * (1 - (totalTasks > 0 ? progressPercent / 100 : 0))}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-sm font-black text-slate-900 dark:text-white">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Smart Backlog Alert Banner */}
      {backlogCount > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              {backlogCount}
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Smart Backlog Active
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {backlogCount} unfinished tasks detected from earlier days.
              </p>
            </div>
          </div>
          <button
            onClick={() => triggerReplan()}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-balance Plan</span>
          </button>
        </div>
      )}

      {/* 4. Impossible Schedule Warning Banner */}
      {planResult?.impossible && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-rose-600 dark:text-rose-300">
                Impossible Schedule Detected
              </h2>
              {planResult.warnings.map((w, idx) => (
                <p key={idx} className="text-xs text-rose-700 dark:text-rose-400">
                  • {w}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-500/20">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-300 self-center">
              Fix options:
            </span>
            {planResult.options?.suggestedDailyHours && (
              <button
                onClick={() => resolveImpossible('raise_hours')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
              >
                Increase to {planResult.options.suggestedDailyHours}h/day
              </button>
            )}
            {planResult.options?.canMoveRestDays && (
              <button
                onClick={() => resolveImpossible('move_rest')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-200 border border-rose-500/30 text-xs font-semibold active:scale-95 transition-all"
              >
                Use Rest Days
              </button>
            )}
            {planResult.options?.droppableTopicIds && planResult.options.droppableTopicIds.length > 0 && (
              <button
                onClick={() => resolveImpossible('drop_topics')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-200 border border-rose-500/30 text-xs font-semibold active:scale-95 transition-all"
              >
                Drop {planResult.options.droppableTopicIds.length} low-priority topics
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Due Spaced Repetition Revisions */}
      {revisionsDue.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Due Revisions ({revisionsDue.length})</span>
            </h2>
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/20">
              +10 Bonus Pts
            </span>
          </div>

          <div className="space-y-2">
            {revisionsDue.map((task) => {
              const subject = subjectMap.get(task.subjectId);
              return (
                <div
                  key={task.id}
                  className={`rounded-2xl p-3.5 border transition-all flex items-center justify-between ${
                    task.completed
                      ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-800 border-purple-500/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleTaskToggle(task.id, task.completed, true)}
                      aria-label={`Mark revision ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      className="p-1 text-purple-600 dark:text-purple-400 hover:scale-110 active:scale-95 transition-transform"
                    >
                      {task.completed ? (
                        <CheckCircle className="w-6 h-6 fill-purple-600 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 stroke-[1.8]" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        {subject && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                        )}
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {subject?.name || 'Subject'}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${
                          task.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      ~30m
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Scheduled Topics for Today */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Study Plan ({topicsScheduled.length} Topics)
          </h2>
          <button
            onClick={() => setActiveTab('subjects')}
            className="text-xs font-bold text-blue-500 hover:underline flex items-center space-x-1"
          >
            <span>Manage Topics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topicsScheduled.length === 0 ? (
          <div className="text-center py-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              ✓
            </div>
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No topics scheduled for this day
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You are all caught up, or this is a designated rest day! Feel free to review or add new subjects.
            </p>
            <button
              onClick={() => setActiveTab('subjects')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Topics</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topicsScheduled.map((task) => {
              const subject = subjectMap.get(task.subjectId);
              const topic = topicMap.get(task.topicId);
              const difficulty = topic?.difficulty || 'medium';

              return (
                <div
                  key={task.id}
                  className={`group rounded-2xl p-4 border transition-all flex items-center justify-between ${
                    task.completed
                      ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : task.isBacklog
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 shadow-sm'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/60 hover:border-blue-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <button
                      onClick={() => handleTaskToggle(task.id, task.completed)}
                      aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      className="p-1 text-blue-600 dark:text-blue-400 hover:scale-110 active:scale-95 transition-transform shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle className="w-6 h-6 fill-blue-600 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 stroke-[1.8]" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        {subject && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                        )}
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {subject?.name || 'Subject'}
                        </span>
                        {task.isBacklog && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            Backlog (+15 pts)
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-sm font-bold text-slate-900 dark:text-slate-100 truncate ${
                          task.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.estimatedHours}h est.</span>
                        </span>
                        <span>•</span>
                        <span
                          className={`capitalize font-bold ${
                            difficulty === 'hard'
                              ? 'text-rose-600 dark:text-rose-400'
                              : difficulty === 'medium'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {difficulty}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pomodoro Focus Action */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {!task.completed && (
                      <button
                        onClick={() => onOpenPomodoroForTopic(task.topicId, task.subjectId)}
                        aria-label={`Start Pomodoro for ${task.title}`}
                        className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-semibold active:scale-95 transition-all"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden sm:inline">Focus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Spaced Repetition Rating Modal Dialog */}
      {ratingTaskId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rate Revision Difficulty"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-4">
            <h3 className="font-black text-lg text-white">How well did you recall this?</h3>
            <p className="text-xs text-slate-400">
              Your rating adjusts the next spaced repetition interval: Hard schedules a fast review, Easy spaces it out further.
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => handleRatingSubmit('hard')}
                className="py-3 px-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-white font-bold text-xs transition-all active:scale-95"
              >
                Hard 😓
                <span className="block text-[10px] font-normal opacity-80 mt-1">Review soon</span>
              </button>
              <button
                onClick={() => handleRatingSubmit('okay')}
                className="py-3 px-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-white font-bold text-xs transition-all active:scale-95"
              >
                Okay 🙂
                <span className="block text-[10px] font-normal opacity-80 mt-1">Normal interval</span>
              </button>
              <button
                onClick={() => handleRatingSubmit('easy')}
                className="py-3 px-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white font-bold text-xs transition-all active:scale-95"
              >
                Easy 🚀
                <span className="block text-[10px] font-normal opacity-80 mt-1">Space it out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
