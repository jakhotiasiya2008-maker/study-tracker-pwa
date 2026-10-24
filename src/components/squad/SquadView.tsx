import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Crown,
  Flame,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SquadView: React.FC = () => {
  const { squad, nudgeFriend, isDemoMode } = useStore();
  const [boardType, setBoardType] = useState<'weekly' | 'alltime'>('weekly');
  const [copiedCode, setCopiedCode] = useState(false);
  const [nudgeSent, setNudgeSent] = useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(squad.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleNudge = (userId: string, userName: string) => {
    nudgeFriend(userId, userName);
    setNudgeSent(userId);
    setTimeout(() => setNudgeSent(null), 3000);
  };

  const sortedMembers = [...squad.members].sort((a, b) => {
    return boardType === 'weekly'
      ? b.weeklyPoints - a.weeklyPoints
      : b.totalPoints - a.totalPoints;
  });

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Demo Mode / Supabase Mode Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
          {isDemoMode ? (
            <span className="flex items-center space-x-1.5 font-bold text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Demo Mode Active</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 font-bold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Supabase Realtime Connected</span>
            </span>
          )}
          <span className="hidden sm:inline text-slate-400">·</span>
          <span className="hidden sm:inline text-slate-500">
            {isDemoMode
              ? 'Simulated peer activity without requiring backend keys'
              : 'End-to-end synced squad board'}
          </span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400" title="Zero personal data leaves your device">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          <span className="text-[11px] font-semibold">Privacy Protected</span>
        </div>
      </div>

      {/* Squad Header */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-200 flex items-center space-x-1.5">
              <Users className="w-4 h-4" />
              <span>Study Squad (3-10 Members)</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">{squad.name}</h1>
          </div>

          {/* Copy Invite Code */}
          <button
            onClick={handleCopyCode}
            aria-label="Copy Squad Invite Code"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold border border-white/30 active:scale-95 transition-all"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'Copied!' : squad.inviteCode}</span>
          </button>
        </div>

        {/* Privacy Callout */}
        <p className="text-[11px] text-blue-100/80 bg-white/10 p-3 rounded-2xl border border-white/15">
          🔒 <strong>Privacy Guarantee:</strong> Only your points, streak, and display name are shared with your squad.
          Your private topics, notes, and exam schedules never leave your device.
        </p>
      </div>

      {/* Leaderboard Tabs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setBoardType('weekly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                boardType === 'weekly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Weekly Leaderboard
            </button>
            <button
              onClick={() => setBoardType('alltime')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                boardType === 'alltime'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              All-Time Board
            </button>
          </div>

          <span className="text-xs text-slate-500 font-semibold">Resets every Monday</span>
        </div>

        {/* Member Ranks */}
        <div className="space-y-2.5">
          {sortedMembers.map((member, idx) => {
            const isCurrentUser = member.userId === 'current-user';

            return (
              <div
                key={member.userId}
                className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${
                  isCurrentUser
                    ? 'bg-blue-500/10 border-blue-500/40 shadow-xs'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/60 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        : idx === 2
                        ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {idx === 0 ? <Crown className="w-4 h-4 fill-white" /> : `#${idx + 1}`}
                  </div>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {member.displayName}
                      </p>
                      {member.isWeeklyWinner && (
                        <span title="Weekly Winner Crown">
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 inline" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center space-x-0.5 text-amber-500 font-bold">
                        <Flame className="w-3 h-3 fill-amber-500" />
                        <span>{member.streak}d streak</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Nudge */}
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {boardType === 'weekly' ? member.weeklyPoints : member.totalPoints} pts
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {boardType === 'weekly' ? 'This Week' : 'Total Score'}
                    </p>
                  </div>

                  {!isCurrentUser && (
                    <button
                      onClick={() => handleNudge(member.userId, member.displayName)}
                      disabled={nudgeSent === member.userId}
                      aria-label={`Send study nudge to ${member.displayName}`}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                        nudgeSent === member.userId
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      <span>{nudgeSent === member.userId ? 'Nudged!' : 'Nudge'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Friend Activity Feed */}
      <section className="rounded-3xl p-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>Squad Activity Feed</span>
        </h2>

        <div className="space-y-3">
          {squad.activity.map((act) => (
            <div
              key={act.id}
              className="flex items-start space-x-3 text-xs border-b border-slate-100 dark:border-slate-700/40 pb-3 last:border-0 last:pb-0"
            >
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shrink-0 mt-0.5">
                {act.userName.charAt(0)}
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  <strong className="font-extrabold text-slate-900 dark:text-white">
                    {act.userName}
                  </strong>{' '}
                  {act.action}
                </p>
                <span className="text-[10px] text-slate-400">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
