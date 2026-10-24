import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { TodayView } from './components/today/TodayView';
import { CalendarView } from './components/calendar/CalendarView';
import { SubjectsView } from './components/subjects/SubjectsView';
import { ProgressView } from './components/progress/ProgressView';
import { RewardsView } from './components/rewards/RewardsView';
import { SquadView } from './components/squad/SquadView';
import { SettingsView } from './components/settings/SettingsView';
import { PomodoroModal } from './components/pomodoro/PomodoroModal';
import { Loader2 } from 'lucide-react';

export function App() {
  const { initApp, runBackgroundChecks, activeTab, isLoading, startPomodoro } = useStore();
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);

  // Initialize app on mount
  useEffect(() => {
    initApp();
  }, [initApp]);

  // Background checks on visibilitychange & window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runBackgroundChecks();
      }
    };

    const handleOnline = () => {
      runBackgroundChecks();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [runBackgroundChecks]);

  const handleOpenPomodoroForTopic = (topicId: string, subjectId: string) => {
    startPomodoro(topicId, subjectId, 'focus');
    setIsPomodoroOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-2xl animate-pulse shadow-lg shadow-blue-500/30">
          S
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Starting StudyFlow Local Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col transition-colors selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenPomodoro={() => setIsPomodoroOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto">
        {activeTab === 'today' && (
          <TodayView onOpenPomodoroForTopic={handleOpenPomodoroForTopic} />
        )}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'subjects' && <SubjectsView />}
        {activeTab === 'progress' && <ProgressView />}
        {activeTab === 'rewards' && <RewardsView />}
        {activeTab === 'squad' && <SquadView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile-first Bottom Navigation Bar */}
      <BottomNav />

      {/* Pomodoro Focus Modal */}
      <PomodoroModal
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
      />
    </div>
  );
}

export default App;
