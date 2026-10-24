# StudyFlow — Smart Autonomous Study Planner & PWA

**StudyFlow** is a production-quality Progressive Web App for students: an automatic study planner featuring smart backlog handling, spaced-repetition revisions, progress tracking, and a privacy-first friends leaderboard with points and self-rewards.

Built with **React 19 + TypeScript + Vite 8 + Tailwind CSS + Dexie.js (IndexedDB) + Zustand + vite-plugin-pwa**.

---

## 🚀 Quick Start (Running Locally)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
> Dev Server URL: **http://localhost:5173**

### 3. Build & Run the Production Preview
```bash
npm run build
npm run preview
```
> Production Preview URL: **http://localhost:4173**  
> *(The service worker, offline cache, and PWA installation prompt are fully active in the preview build).*

---

## 🧪 Automated Verification Suite

Run all verification suites:

```bash
# 1. Typecheck (zero errors)
npm run typecheck

# 2. Linting (zero errors, zero warnings)
npm run lint

# 3. Unit Tests (Vitest)
npm run test

# 4. End-to-End Playwright Smoke Test
npm run test:e2e
```

---

## ⚙️ Environment Variables & Demo Mode vs. Supabase Mode

StudyFlow is designed **offline-first and zero-dependency by default**. If Supabase credentials are not provided, StudyFlow runs seamlessly in **DEMO MODE**: seeded peer activity, simulated leaderboard rankings, and mock activity feeds. **The application never crashes without API keys.**

### Running in Demo Mode (Default)
No setup required! Simply run `npm run dev` or `npm run preview`.

### Enabling Supabase Live Squad Sync (Optional)
To connect real Supabase squads and realtime sync:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the SQL schema found in `/supabase/schema.sql` in your Supabase SQL Editor.
4. Restart the dev or preview server.

### 🔒 Privacy Guarantee & Row Level Security (RLS)
- **Zero personal study data is ever uploaded.**
- Only display name, points, and streak are shared in squads.
- Your personal subjects, topics, and notes stay 100% local in your device's IndexedDB.
- Supabase tables are protected by strict Row Level Security (RLS): users can only view their own squad and update their own points.

---

## 🧠 The StudyFlow Pure Planner Algorithm

The planning engine (`src/services/planner.ts` and `src/services/backlog.ts`) is a pure, separate, typed algorithm with no UI imports:

1. **Horizon Pre-computation:** Analyzes the user's exam deadlines (between 14 and 90 days), calculating daily study capacity factoring in designated rest days and custom per-day overrides.
2. **Revision Priority:** Spaced repetition revisions are anchored first on their scheduled dates (~30 minutes per revision).
3. **Deadlines & Buffer Rule:** For every subject, new topics are scheduled to finish **~2 days before the exam**, reserving the remaining days exclusively for spaced repetition and final practice.
4. **Ranking Heuristic:** Unfinished topics are scheduled using a multi-factor priority queue:
   $$\text{Priority} = f(\text{Days to Exam Deadline } \uparrow, \text{Subject Importance } \downarrow, \text{Topic Difficulty } \downarrow, \text{Workload})$$
5. **Smart Backlog Redistribution:** Unfinished tasks from past days automatically convert to backlog. Re-running the planner redistributes them across upcoming days with a daily capacity multiplier cap (default 1.25x) to **prevent unrealistic 3x cramming pile-ups**.
6. **Honest Impossible-Schedule Detection:** If total workload exceeds available hours before an exam, the algorithm flags an `impossible: true` state with concrete options:
   - Increase daily study hours by the exact deficit calculated.
   - Utilize designated rest days.
   - Drop lowest-importance topics.

---

## 📈 Spaced Repetition Scheduling

Implemented in `src/services/spacedRepetition.ts`:
- **Default Intervals:** On topic completion, revisions are automatically scheduled at **+1, +3, +7, and +14 days** (stopping before the exam).
- **Hard Topics:** Topics marked as "Hard" receive a denser schedule: **+1, +2, +4, +7, +12, and +18 days**.
- **Dynamic Rating Adjustments:**
  - `Easy`: Multiplies the interval by **1.5x** (spaces it out).
  - `Okay`: Retains the standard interval.
  - `Hard`: Shortens the interval by **40%** to trigger an early recall check.

---

## 🏆 Points, Streaks & Anti-Farming Rules

Implemented in `src/services/points.ts`:
- **Base Points:** $\text{Estimated Hours} \times \text{Difficulty Rate}$ (Easy: 10 pts/hr, Medium: 15 pts/hr, Hard: 20 pts/hr).
- **Revision Bonus:** $+10\text{ bonus pts}$ per completed revision.
- **Backlog Clearing Bonus:** $+15\text{ bonus pts}$ for clearing past backlog tasks.
- **Streak Multipliers:**
  - Day 1–2: 1.0x
  - Day 3–6: 1.1x
  - Day 7–13: 1.25x
  - Day 14–29: 1.4x
  - Day 30+: 1.5x (Consistency beats cramming!)
- **Anti-Farming Daily Cap:** Maximum 250 base points per day.
- **Pomodoro Deep Focus Bonus:** $+5\text{ bonus pts}$ per 25-minute Pomodoro session, capped at $+60\text{ pts/day}$.
- **Self-Rewards Store:** Redeem custom reward coupons ("15 min break", "one YouTube episode", "gaming hour") with a daily spend cap of 200 pts.

---

## 🌐 Deployment to Vercel or Netlify

### Deploying to Vercel
1. Push your repository to GitHub.
2. In Vercel, click "New Project" and import your repository.
3. Build Settings (auto-detected):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables if using Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), or leave blank to deploy in Demo Mode.

### Deploying to Netlify
1. Create a `netlify.toml` or connect repository via Netlify UI.
2. Configure settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Single Page App rewrite rule:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
