import React, { useState } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Sliders, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const CalendarView: React.FC = () => {
  const { planResult, settings, updatePlanSettings, subjects } = useStore();
  const [currentWeekBase, setCurrentWeekBase] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideInputHours, setOverrideInputHours] = useState<number>(4);

  const weekStart = startOfWeek(currentWeekBase, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentWeekBase, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
  const selectedDayTasks = (planResult?.tasks || []).filter((t) => t.date === selectedDateStr);
  const selectedDayHours = selectedDayTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const currentOverride = settings.perDayOverrides[selectedDateStr];
  const isRestDay = settings.restDays.includes(selectedDay.getDay());

  const handleSaveOverride = async () => {
    const updated = { ...settings.perDayOverrides };
    if (overrideInputHours === settings.dailyStudyHours) {
      delete updated[selectedDateStr];
    } else {
      updated[selectedDateStr] = Number(overrideInputHours);
    }
    await updatePlanSettings({ perDayOverrides: updated });
    setShowOverrideModal(false);
  };

  const handleResetOverride = async () => {
    const updated = { ...settings.perDayOverrides };
    delete updated[selectedDateStr];
    await updatePlanSettings({ perDayOverrides: updated });
    setShowOverrideModal(false);
  };

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Header & Week Nav */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400">
            Schedule Horizon
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Study Calendar
          </h1>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setCurrentWeekBase(subWeeks(currentWeekBase, 1))}
            aria-label="Previous Week"
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentWeekBase(new Date());
              setSelectedDay(new Date());
            }}
            className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-xl"
          >
            This Week
          </button>
          <button
            onClick={() => setCurrentWeekBase(addWeeks(currentWeekBase, 1))}
            aria-label="Next Week"
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Strip Carousel */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selectedDay);
          const isDayToday = isToday(day);
          const dayTasks = (planResult?.tasks || []).filter((t) => t.date === dateStr);
          const totalHours = dayTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
          const dayIsRest = settings.restDays.includes(day.getDay());
          const hasOverride = settings.perDayOverrides[dateStr] !== undefined;

          // Unique subject colors for task dots
          const daySubjectColors = Array.from(
            new Set(dayTasks.map((t) => subjectMap.get(t.subjectId)?.color).filter(Boolean))
          );

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center justify-between p-2 sm:p-3 rounded-2xl border transition-all text-center min-h-[95px] active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : isDayToday
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-500 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <span className={`text-[11px] font-bold uppercase ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {format(day, 'EEE')}
              </span>
              <span className={`text-base sm:text-lg font-black my-0.5 ${isSelected ? 'text-white' : ''}`}>
                {format(day, 'd')}
              </span>

              {/* Status / Hours info */}
              <div className="flex flex-col items-center space-y-1">
                {dayIsRest && !hasOverride ? (
                  <span className={`text-[9px] font-semibold ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    Rest
                  </span>
                ) : (
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {totalHours}h
                  </span>
                )}

                {/* Subject Dots */}
                <div className="flex items-center space-x-0.5 h-1.5">
                  {daySubjectColors.slice(0, 3).map((col, idx) => (
                    <span
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: col as string }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Details Panel */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/70 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h2>
          </div>

          <button
            onClick={() => {
              setOverrideInputHours(currentOverride ?? settings.dailyStudyHours);
              setShowOverrideModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold active:scale-95 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{currentOverride !== undefined ? `${currentOverride}h Override` : 'Adjust Hours'}</span>
          </button>
        </div>

        {/* Day summary */}
        <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-3">
          <span className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Scheduled: <strong className="text-slate-800 dark:text-slate-200">{selectedDayHours}h</strong></span>
          </span>
          <span>•</span>
          <span>
            Capacity:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {currentOverride !== undefined
                ? `${currentOverride}h (Override)`
                : isRestDay
                ? '0h (Rest Day)'
                : `${settings.dailyStudyHours}h (Base)`}
            </strong>
          </span>
        </div>

        {/* Tasks on this day */}
        <div className="space-y-2">
          {selectedDayTasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No tasks planned for this day.</p>
          ) : (
            selectedDayTasks.map((t) => {
              const subject = subjectMap.get(t.subjectId);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/40"
                >
                  <div className="flex items-center space-x-3">
                    {subject && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {subject?.name} · {t.type === 'revision' ? 'Revision' : 'Topic'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.estimatedHours}h
                    </span>
                    {t.completed && (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-500">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hours Override Modal */}
      {showOverrideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Set Daily Study Hours Override"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-bold text-base text-white">
              Override Hours for {format(selectedDay, 'MMM d')}
            </h3>
            <p className="text-xs text-slate-400">
              Have a busy day or extra free time? Set custom study hours for just this date and the planner will instantly adapt.
            </p>

            <div className="space-y-2 py-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Target Study Hours</span>
                <span className="text-blue-400">{overrideInputHours}h</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={overrideInputHours}
                onChange={(e) => setOverrideInputHours(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0h (Rest)</span>
                <span>4h (Normal)</span>
                <span>10h (Intense)</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handleSaveOverride}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
              >
                Save Override
              </button>
              {currentOverride !== undefined && (
                <button
                  onClick={handleResetOverride}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs active:scale-95 transition-all"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
