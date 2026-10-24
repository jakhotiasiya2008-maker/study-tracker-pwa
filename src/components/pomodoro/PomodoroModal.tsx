import React, { useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const PomodoroModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { pomodoro, pausePomodoro, resumePomodoro, stopPomodoro, startPomodoro, tickPomodoro, topics, subjects } =
    useStore();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (pomodoro.isActive && !pomodoro.isPaused) {
      interval = setInterval(() => {
        tickPomodoro();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoro.isActive, pomodoro.isPaused, tickPomodoro]);

  if (!isOpen) return null;

  const minutes = Math.floor(pomodoro.timeLeftSeconds / 60);
  const seconds = pomodoro.timeLeftSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent =
    ((pomodoro.totalDurationSeconds - pomodoro.timeLeftSeconds) / pomodoro.totalDurationSeconds) * 100;

  const activeTopic = topics.find((t) => t.id === pomodoro.activeTopicId);
  const activeSubject = subjects.find((s) => s.id === pomodoro.activeSubjectId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pomodoro Focus Timer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col items-center relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Pomodoro"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Mode Switcher */}
        <div className="flex items-center space-x-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-base text-slate-200">Deep Work Pomodoro</h2>
        </div>

        {/* Modes */}
        <div className="flex space-x-1 p-1 bg-slate-800/80 rounded-2xl mb-6">
          <button
            onClick={() => startPomodoro(pomodoro.activeTopicId, pomodoro.activeSubjectId, 'focus')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              pomodoro.mode === 'focus' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => startPomodoro(undefined, undefined, 'short_break')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              pomodoro.mode === 'short_break' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            5m Short
          </button>
          <button
            onClick={() => startPomodoro(undefined, undefined, 'long_break')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              pomodoro.mode === 'long_break' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            15m Break
          </button>
        </div>

        {/* Linked Topic Badge */}
        {activeTopic && (
          <div className="mb-4 text-center px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 max-w-[260px]">
            <p className="text-[10px] uppercase font-bold text-blue-400 truncate">
              {activeSubject?.name || 'Topic Focus'}
            </p>
            <p className="text-xs font-medium text-slate-200 truncate">{activeTopic.name}</p>
          </div>
        )}

        {/* Circular Timer Display */}
        <div className="relative w-52 h-52 flex items-center justify-center my-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="104"
              cy="104"
              r="92"
              className="stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="104"
              cy="104"
              r="92"
              className={`transition-all duration-500 ease-linear ${
                pomodoro.mode === 'focus'
                  ? 'stroke-blue-500'
                  : pomodoro.mode === 'short_break'
                  ? 'stroke-emerald-500'
                  : 'stroke-purple-500'
              }`}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 92}
              strokeDashoffset={(2 * Math.PI * 92) * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-mono text-4xl font-extrabold tracking-tight text-white">
              {timeFormatted}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              {pomodoro.mode === 'focus' ? (pomodoro.isPaused ? 'PAUSED' : 'FOCUSING') : 'RESTING'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-3 mt-6">
          {!pomodoro.isActive ? (
            <button
              onClick={() => startPomodoro(pomodoro.activeTopicId, pomodoro.activeSubjectId, pomodoro.mode)}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Timer</span>
            </button>
          ) : (
            <>
              {pomodoro.isPaused ? (
                <button
                  onClick={resumePomodoro}
                  aria-label="Resume Pomodoro"
                  className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                >
                  <Play className="w-5 h-5 fill-white" />
                </button>
              ) : (
                <button
                  onClick={pausePomodoro}
                  aria-label="Pause Pomodoro"
                  className="p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  <Pause className="w-5 h-5 fill-white" />
                </button>
              )}

              <button
                onClick={stopPomodoro}
                aria-label="Complete / Log Session"
                className="flex items-center space-x-1.5 px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Finish & Log</span>
              </button>

              <button
                onClick={() => startPomodoro(pomodoro.activeTopicId, pomodoro.activeSubjectId, pomodoro.mode)}
                aria-label="Reset Timer"
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-4">
          +5 bonus points per 25-minute completed focus session!
        </p>
      </div>
    </div>
  );
};
