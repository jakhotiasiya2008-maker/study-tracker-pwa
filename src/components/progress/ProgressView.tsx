import React from 'react';
import {
  format,
  subDays,
  differenceInCalendarDays,
  parseISO,
  isValid,
} from 'date-fns';
import {
  Flame,
  Award,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const ProgressView: React.FC = () => {
  const { subjects, topics, userStats, settings } = useStore();

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed').length;
  const overallPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // 90-day heatmap data
  const now = new Date();
  const heatmapDays = Array.from({ length: 90 }).map((_, i) => {
    const d = subDays(now, 89 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = userStats.pointsHistory[dateStr];
    return {
      date: d,
      dateStr,
      points: dayData?.points || 0,
      focusMinutes: dayData?.focusMinutes || 0,
      tasksCompleted: dayData?.tasksCompleted || 0,
    };
  });

  // Weekly hours chart: last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(now, 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayData = userStats.pointsHistory[dateStr];
    const hours = Math.round(((dayData?.focusMinutes || 0) / 60) * 10) / 10;
    return {
      label: format(d, 'EEE'),
      dateStr,
      hours,
    };
  });

  const maxWeeklyHours = Math.max(...last7Days.map((d) => d.hours), 4);

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400">
          Analytics & Consistency
        </span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Progress Tracking
        </h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Overall</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{overallPercentage}%</p>
          <p className="text-[11px] text-slate-400">{completedTopics} of {totalTopics} topics</p>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-500">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span className="text-xs font-bold uppercase">Streak</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{userStats.streak} Days</p>
          <p className="text-[11px] text-slate-400">Consistency multiplier active</p>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-purple-500">
            <Award className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Points</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{userStats.totalPoints}</p>
          <p className="text-[11px] text-slate-400">+{userStats.todayPoints} earned today</p>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-500">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Focus Time</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {Math.round(userStats.todayFocusMinutes / 60 * 10) / 10}h
          </p>
          <p className="text-[11px] text-slate-400">Logged Pomodoro focus</p>
        </div>
      </div>

      {/* Per-Subject Status & Exam Countdown */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Subject Trajectories & Exam Proximity
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map((sub) => {
            const subTopics = topics.filter((t) => t.subjectId === sub.id);
            const subCompleted = subTopics.filter((t) => t.status === 'completed').length;
            const subRemainingHours = subTopics
              .filter((t) => t.status !== 'completed')
              .reduce((sum, t) => sum + (t.estimatedHours || 1), 0);

            let daysLeft = 30;
            if (sub.examDate) {
              const examParsed = parseISO(sub.examDate);
              if (isValid(examParsed)) {
                daysLeft = differenceInCalendarDays(examParsed, new Date());
              }
            }

            // Health Trajectory calculation
            const availableStudyDays = Math.max(1, daysLeft - 2);
            const hoursPerDayNeeded = subRemainingHours / availableStudyDays;

            let statusText = 'On track';
            let statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
            let StatusIcon = CheckCircle;

            if (daysLeft <= 2 && subTopics.length > subCompleted) {
              statusText = 'Behind';
              statusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/30';
              StatusIcon = AlertCircle;
            } else if (hoursPerDayNeeded > settings.dailyStudyHours * 0.5) {
              statusText = 'Slightly behind';
              statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
              StatusIcon = AlertCircle;
            }

            return (
              <div
                key={sub.id}
                className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: sub.color }}
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {sub.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>Exam: {sub.examDate}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusText}</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {subCompleted}/{subTopics.length} done ({subRemainingHours}h left)
                    </span>
                    <span className="font-bold">
                      {subTopics.length > 0 ? Math.round((subCompleted / subTopics.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: sub.color,
                        width: `${subTopics.length > 0 ? (subCompleted / subTopics.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Days to Exam:</span>
                  <span className={`font-black ${daysLeft <= 7 ? 'text-rose-500' : 'text-blue-500'}`}>
                    {daysLeft <= 0 ? 'Exam Today!' : `${daysLeft} days remaining`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Hours Bar Chart */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Weekly Focus Hours
          </h2>
          <span className="text-xs font-semibold text-slate-500">Last 7 Days</span>
        </div>

        <div className="flex items-end justify-between h-36 pt-4 px-2">
          {last7Days.map((d, idx) => {
            const heightPercent = Math.max(8, Math.round((d.hours / maxWeeklyHours) * 100));
            return (
              <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                <span className="text-[10px] font-bold text-slate-400">{d.hours}h</span>
                <div className="w-8 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-700 h-24 flex items-end p-1 overflow-hidden">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-blue-600 to-indigo-500 transition-all duration-500"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 90-Day Study Activity Heatmap */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            90-Day Study Heatmap
          </h2>
          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
            <span>Less</span>
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 dark:bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-400" />
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
            {heatmapDays.map((d) => {
              let bg = 'bg-slate-100 dark:bg-slate-700/60';
              if (d.points > 60) bg = 'bg-blue-600 text-white';
              else if (d.points > 30) bg = 'bg-blue-500 text-white';
              else if (d.points > 0) bg = 'bg-blue-300 dark:bg-blue-400/60';

              return (
                <div
                  key={d.dateStr}
                  title={`${d.dateStr}: ${d.points} pts, ${d.focusMinutes}m focus`}
                  className={`w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 ${bg}`}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
