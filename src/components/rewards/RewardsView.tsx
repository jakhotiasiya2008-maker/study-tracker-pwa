import React, { useState } from 'react';
import { Gift, Plus, Sparkles, ShoppingBag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DAILY_REWARD_SPEND_CAP, getStreakMultiplier } from '../../services/points';

export const RewardsView: React.FC = () => {
  const { rewards, userStats, redeemReward, addCustomReward } = useStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Custom Coupon Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState(40);
  const [newIcon, setNewIcon] = useState('☕');
  const [newDesc, setNewDesc] = useState('');

  const streakMultiplier = getStreakMultiplier(userStats.streak);

  const handleRedeem = async (rewardId: string) => {
    const res = await redeemReward(rewardId);
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addCustomReward({
      title: newTitle.trim(),
      cost: Number(newCost),
      icon: newIcon,
      description: newDesc.trim() || undefined,
    });

    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  const emojiChoices = ['☕', '📺', '🍩', '🎮', '🍕', '🎧', '🍦', '📚', '🏃‍♂️', '🎨'];

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto px-4 pt-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-blue-500 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Balance Card */}
      <div className="rounded-3xl p-6 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-200 flex items-center space-x-1">
              <Gift className="w-4 h-4" />
              <span>Self-Reward Store</span>
            </span>
            <h1 className="text-3xl font-black">{userStats.totalPoints} Points</h1>
            <p className="text-xs text-purple-100/90 font-medium">
              Streak Multiplier: <strong>{streakMultiplier}x</strong> ({userStats.streak}-day streak)
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs border border-white/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-purple-100">
          <span>Daily Spend Cap: {DAILY_REWARD_SPEND_CAP} pts</span>
          <span>Earn points by finishing tasks & Pomodoros</span>
        </div>
      </div>

      {/* Coupons Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Available Reward Coupons
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {rewards.length} coupons available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {rewards.map((reward) => {
            const canAfford = userStats.totalPoints >= reward.cost;

            return (
              <div
                key={reward.id}
                className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                  reward.isMystery
                    ? 'bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-amber-500/30'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/60 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-700/60">
                      {reward.icon}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs">
                      {reward.cost} pts
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-3">
                    {reward.title}
                  </h3>
                  {reward.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {reward.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Redeemed {reward.redeemedCount} times
                  </span>

                  <button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={!canAfford}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all ${
                      canAfford
                        ? reward.isMystery
                          ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-md'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{canAfford ? 'Redeem Coupon' : 'Need More Pts'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Custom Coupon Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create Custom Coupon"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-black text-lg text-white">Create Self-Reward Coupon</h3>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Coupon Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30 min Netflix episode"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Point Cost ({newCost} pts)
                </label>
                <input
                  type="range"
                  min="15"
                  max="150"
                  step="5"
                  value={newCost}
                  onChange={(e) => setNewCost(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all ${
                        newIcon === emoji ? 'bg-blue-600 scale-110 shadow-md' : 'bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Unwind after finishing math exercises"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  Create Coupon
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
