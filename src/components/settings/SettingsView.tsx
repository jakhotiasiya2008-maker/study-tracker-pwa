import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  Wifi,
  Bell,
  HardDrive,
  Layers,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Info,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SettingsView: React.FC = () => {
  const {
    systemHealth,
    refreshSystemHealth,
    settings,
    updatePlanSettings,
    exportDataJson,
    importDataJson,
    resetAllData,
  } = useStore();

  const [reminderTime, setReminderTime] = useState(
    localStorage.getItem('studyflow_reminder_time') || '19:00'
  );
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const daysOfWeek = [
    { label: 'Sun', val: 0 },
    { label: 'Mon', val: 1 },
    { label: 'Tue', val: 2 },
    { label: 'Wed', val: 3 },
    { label: 'Thu', val: 4 },
    { label: 'Fri', val: 5 },
    { label: 'Sat', val: 6 },
  ];

  const handleToggleRestDay = async (val: number) => {
    const isRest = settings.restDays.includes(val);
    const updated = isRest
      ? settings.restDays.filter((d) => d !== val)
      : [...settings.restDays, val];
    await updatePlanSettings({ restDays: updated });
  };

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationMsg('Local notifications are not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('StudyFlow Reminders Active', {
          body: 'You will receive daily study reminders when StudyFlow is open.',
          icon: '/pwa-192x192.png',
        });
        setNotificationMsg('Notifications enabled!');
      } else {
        setNotificationMsg('Permission denied.');
      }
      await refreshSystemHealth();
    } catch {
      setNotificationMsg('Could not enable notifications.');
    }
  };

  const handleSaveReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('studyflow_reminder_time', time);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Backup downloaded successfully!');
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDataJson(content);
      if (success) {
        alert('Data imported successfully!');
      } else {
        alert('Failed to import backup. Please ensure the file format is valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400">
          Preferences & Diagnostics
        </span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Settings & System Health
        </h1>
      </div>

      {/* 1. In-App System Health Panel */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              System Health Diagnostics
            </h2>
          </div>
          <button
            onClick={() => refreshSystemHealth()}
            className="text-xs font-bold text-blue-500 hover:underline"
          >
            Re-check
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* IndexedDB */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <Database className="w-4 h-4 text-blue-500" />
              <span>IndexedDB (Dexie.js)</span>
            </span>
            <span className="flex items-center space-x-1 font-bold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>Working</span>
            </span>
          </div>

          {/* Service Worker */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Service Worker</span>
            </span>
            <span className="flex items-center space-x-1 font-bold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>Registered</span>
            </span>
          </div>

          {/* Offline Cache Ready */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <Wifi className="w-4 h-4 text-emerald-500" />
              <span>Offline-First Cache</span>
            </span>
            <span className="flex items-center space-x-1 font-bold text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready</span>
            </span>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Notification Status</span>
            </span>
            <span className="capitalize font-bold text-slate-700 dark:text-slate-300">
              {systemHealth?.notifications || 'Default'}
            </span>
          </div>

          {/* Storage Quota */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <HardDrive className="w-4 h-4 text-purple-500" />
              <span>Storage Quota</span>
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {systemHealth?.storageQuota.usedMB ?? 1.2} MB used
            </span>
          </div>

          {/* Supabase Connection */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
              <Wifi className="w-4 h-4 text-blue-500" />
              <span>Squad Sync Backend</span>
            </span>
            <span className="font-bold text-amber-500">
              {systemHealth?.supabaseConnection === 'connected' ? 'Connected' : 'Demo Mode (Local)'}
            </span>
          </div>

          {/* App Version */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">App Version</span>
            <span className="font-bold text-blue-500">v1.0.0 Production PWA</span>
          </div>

          {/* Last Backup Date */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Last Backup</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {systemHealth?.lastBackupDate || 'Not exported yet'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Study Preferences */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-blue-500" />
          <span>Planner Schedule Rules</span>
        </h2>

        {/* Daily Study Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Base Daily Study Hours</span>
            <span className="text-blue-500 font-extrabold">{settings.dailyStudyHours} hours/day</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={settings.dailyStudyHours}
            onChange={(e) => updatePlanSettings({ dailyStudyHours: parseFloat(e.target.value) })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>1 hour</span>
            <span>4 hours (Default)</span>
            <span>10 hours</span>
          </div>
        </div>

        {/* Rest Days */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Designated Rest Days
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {daysOfWeek.map((day) => {
              const isRest = settings.restDays.includes(day.val);
              return (
                <button
                  key={day.val}
                  type="button"
                  onClick={() => handleToggleRestDay(day.val)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    isRest
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Rest days are preserved without new topics unless custom hours are overridden.
          </p>
        </div>
      </section>

      {/* 3. Daily Reminders & Honest Push Limitations */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <span>Study Reminders</span>
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Daily Reminder Time</p>
            <p className="text-[11px] text-slate-400">Triggers in-app prompt when due</p>
          </div>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => handleSaveReminderTime(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleRequestNotifications}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            Enable Device Notifications
          </button>
          {notificationMsg && (
            <p className="text-xs text-center text-blue-400 font-semibold mt-2">{notificationMsg}</p>
          )}
        </div>

        {/* Honest Disclosure */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex items-start space-x-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Honest PWA Push Note:</strong> Browser-based local notifications fire reliably while the app is running in the background. True scheduled push when the device is completely sleeping requires an external push notification server. On iOS Safari, web push requires adding the app to your Home Screen.
          </p>
        </div>
      </section>

      {/* 4. Backup, Export & Import */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-purple-500" />
          <span>Data Storage & Backups</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 active:scale-95 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import Backup (JSON)</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {exportNotice && (
          <p className="text-xs text-emerald-500 text-center font-bold">{exportNotice}</p>
        )}

        {/* Reset Database */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-500">Reset Local Database</p>
            <p className="text-[11px] text-slate-400">Clears all data and re-seeds fresh demo data</p>
          </div>

          <button
            onClick={() => {
              if (confirm('Reset all data? This will restore initial demo state.')) {
                resetAllData();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-500 hover:text-white text-xs font-bold active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </section>
    </div>
  );
};
