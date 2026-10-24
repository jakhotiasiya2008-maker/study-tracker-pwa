import React from 'react';
import { CheckCircle2, Calendar, BookOpen, BarChart3, Gift, Users, Settings } from 'lucide-react';
import { useStore, type ScreenTab } from '../../store/useStore';

interface NavItem {
  id: ScreenTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  showBadge?: boolean;
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, backlogCount } = useStore();

  const navItems: NavItem[] = [
    { id: 'today', label: 'Today', icon: CheckCircle2, showBadge: backlogCount > 0 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'squad', label: 'Squad', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe"
    >
      <div className="max-w-4xl mx-auto px-2 flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[48px] rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {item.showBadge && (
                  <span
                    className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black border-2 border-slate-900 leading-tight"
                    title={`${backlogCount} backlog tasks`}
                  >
                    {backlogCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[54px]">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
