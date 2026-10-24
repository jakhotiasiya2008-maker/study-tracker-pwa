import React from 'react';
import { Flame, Award, Clock, Moon, Sun, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const Navbar: React.FC<{ onOpenPomodoro: () => void }> = ({ onOpenPomodoro }) => {
  const { userStats, theme, toggleTheme, pomodoro, planResult, setActiveTab } = useStore();

  const isImpossible = planResult?.impossible;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 dark:bg-slate-900/95 bg-white/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-lg">
            S
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                StudyFlow
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Smart Study Engine</p>
          </div>
        </div>

        {/* Stats Pill & Quick Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Streak Badge */}
          <div
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-semibold text-xs shadow-sm"
            title={`${userStats.streak} day study streak!`}
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{userStats.streak}d</span>
          </div>

          {/* Points Pill */}
          <div
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400 font-bold text-xs"
            title={`${userStats.totalPoints} total points`}
          >
            <Award className="w-4 h-4" />
            <span>{userStats.totalPoints}</span>
          </div>

          {/* Pomodoro Timer button */}
          <button
            onClick={onOpenPomodoro}
            aria-label="Pomodoro Focus Timer"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition-all active:scale-95 ${
              pomodoro.isActive
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">
              {pomodoro.isActive
                ? `${Math.floor(pomodoro.timeLeftSeconds / 60)}:${String(pomodoro.timeLeftSeconds % 60).padStart(2, '0')}`
                : 'Focus'}
            </span>
          </button>

          {/* Impossible Schedule Warning icon */}
          {isImpossible && (
            <button
              onClick={() => setActiveTab('today')}
              aria-label="Impossible Schedule Warning"
              className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
              title="Schedule is overloaded! Tap to resolve."
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </button>
          )}

          {/* Dark/Light mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
