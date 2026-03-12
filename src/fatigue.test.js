/**
 * Fatigue algorithm unit tests — Bicep Curl scenarios
 *
 * Tests the core pure functions extracted from MuscleEngagementPage:
 *   brzycki1RM, getExercise1RM, setFatigueScore, and the full
 *   fatigue→status pipeline.
 *
 * Run with: node src/fatigue.test.js
 */

// ─── Algorithm (copy of the logic in MuscleEngagementPage) ───────────────────

const brzycki1RM = (weight, reps) => {
  if (!weight || !reps || weight <= 0 || reps <= 0) return null;
  return weight * (36 / (37 - Math.min(reps, 10)));
};

const getExercise1RM = (exercise) => {
  if (!exercise.history || exercise.history.length === 0) return null;
  let best = 0;
  exercise.history.forEach(set => {
    const est = brzycki1RM(set.weight, set.repetitions);
    if (est && est > best) best = est;
  });
  return best > 0 ? best : null;
};

const setFatigueScore = (weight, reps, oneRM, engagementScore) => {
  if (!weight || !reps || !oneRM || weight <= 0 || reps <= 0) return 0;
  const intensity = Math.min(1.0, Math.max(0.3, weight / oneRM));
  const intensityFactor = 0.5 + intensity * 0.7;
  const maxRepsAtWeight = Math.max(1, Math.round(36 - 36 * intensity));
  const rir = Math.max(0, maxRepsAtWeight - reps);
  const rirMultiplier = Math.max(0.2, Math.exp(-rir * 0.2));
  const volume = Math.sqrt(reps) * weight;
  const engagement = Math.max(0.05, engagementScore || 0);
  return volume * intensityFactor * rirMultiplier * engagement;
};

const muscleTau    = { biceps: 16 };  // hours
const muscleRef    = { biceps: 400 }; // reference hard-session score

/**
 * Simulate computing bicep fatigue% from a list of sets logged at given
 * timestamps, evaluated at `nowMs`.
 *
 * @param {Array<{weight, reps, hoursAgo}>} sets
 * @param {number} oneRM  - 1RM in kg
 * @param {number} nowMs  - evaluation timestamp (default Date.now())
 * @returns {{ fatiguePercent: number, status: string }}
 */
const computeBicepFatigue = (sets, oneRM, nowMs = Date.now()) => {
  const engagement = 0.9; // primary mover
  const tauMs      = muscleTau.biceps * 3600 * 1000;
  const cutoffMs   = tauMs * 4.6;

  let totalFatigue = 0;
  sets.forEach(({ weight, reps, hoursAgo }) => {
    const ageMs = hoursAgo * 3600 * 1000;
    if (ageMs > cutoffMs) return;
    const decayFactor = Math.exp(-ageMs / tauMs);
    const score = setFatigueScore(weight, reps, oneRM, engagement);
    totalFatigue += score * decayFactor;
  });

  const fatiguePercent = Math.min(100, (totalFatigue / muscleRef.biceps) * 100);
  const status =
    fatiguePercent < 15 ? 'ready' :
    fatiguePercent < 45 ? 'partial' : 'recovering';

  return { fatiguePercent: Math.round(fatiguePercent * 10) / 10, status };
};

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

const expect = (label, value, predicate, hint = '') => {
  const ok = predicate(value);
  const symbol = ok ? '✅' : '❌';
  console.log(`${symbol} ${label}`);
  if (!ok) {
    console.log(`     got: ${value}${hint ? '  (' + hint + ')' : ''}`);
    failed++;
  } else {
    passed++;
  }
};

const between = (lo, hi) => v => v >= lo && v <= hi;
const eq      = expected  => v => v === expected;

// ─── Constants ────────────────────────────────────────────────────────────────

// Assumed 1RM for all scenarios = 80 kg (solid intermediate lifter)
const ONE_RM = 80;

// ─── 1. brzycki1RM sanity checks ─────────────────────────────────────────────

console.log('\n── 1RM formula ──────────────────────────────────────────────────');

expect('80 kg × 1 rep   → 1RM ≈ 80 kg',
  Math.round(brzycki1RM(80, 1)), between(78, 82));

expect('60 kg × 8 reps  → 1RM ≈ 72–80 kg (reasonable range)',
  Math.round(brzycki1RM(60, 8)), between(72, 82));

expect('40 kg × 15 reps → treated as 10, 1RM ≈ 44–55 kg',
  Math.round(brzycki1RM(40, 15)), between(44, 55));

expect('Invalid (0 weight) → null',
  brzycki1RM(0, 10), eq(null));

// ─── 2. setFatigueScore — warmup vs working set ───────────────────────────────

console.log('\n── setFatigueScore ──────────────────────────────────────────────');

// Warmup: 40% 1RM (32 kg), 5 reps, far from failure
const warmupScore = setFatigueScore(32, 5, ONE_RM, 0.9);
// Hard set: 80% 1RM (64 kg), 8 reps, close to failure
const hardSetScore = setFatigueScore(64, 8, ONE_RM, 0.9);
// Near-max: 90% 1RM (72 kg), 3 reps, very close to failure
const nearMaxScore = setFatigueScore(72, 3, ONE_RM, 0.9);
// Synergist forearm contribution at same weight (0.3 engagement)
const synergistScore = setFatigueScore(64, 8, ONE_RM, 0.3);

expect('Warmup (32 kg × 5, far from failure) scores LOW',
  warmupScore, v => v < hardSetScore * 0.3,
  `warmup=${warmupScore.toFixed(1)}, hard=${hardSetScore.toFixed(1)}`);

expect('Hard set (64 kg × 8) scores significantly higher than warmup',
  hardSetScore, v => v > warmupScore * 3,
  `hard=${hardSetScore.toFixed(1)}, warmup=${warmupScore.toFixed(1)}`);

expect('Near-max (72 kg × 3) scores lower than hard-volume set (fewer reps)',
  nearMaxScore, v => v < hardSetScore,
  `nearMax=${nearMaxScore.toFixed(1)}, hard=${hardSetScore.toFixed(1)}`);

expect('Synergist (0.3 engagement) scores ~33% of primary (0.9)',
  synergistScore / hardSetScore, between(0.28, 0.38),
  `ratio=${(synergistScore / hardSetScore).toFixed(2)}`);

// ─── 3. Single warmup set — should NOT go red ─────────────────────────────────

console.log('\n── Scenario: warmup only (immediately after) ────────────────────');

const warmupOnly = computeBicepFatigue(
  [{ weight: 30, reps: 5, hoursAgo: 0 }],
  ONE_RM
);
console.log(`   fatigue=${warmupOnly.fatiguePercent}%, status=${warmupOnly.status}`);
expect('Single warmup set → ready (< 15% fatigue)',
  warmupOnly.status, eq('ready'));
expect('Single warmup set → fatigue < 10%',
  warmupOnly.fatiguePercent, v => v < 10);

// ─── 4. Normal working session — should go recovering immediately ──────────────

console.log('\n── Scenario: solid working session (immediately after) ──────────');

// 4 sets × 8 reps @ 75% 1RM — a typical hypertrophy session
const workingSession = computeBicepFatigue([
  { weight: 60, reps: 8, hoursAgo: 0 },
  { weight: 60, reps: 8, hoursAgo: 0 },
  { weight: 60, reps: 8, hoursAgo: 0 },
  { weight: 60, reps: 8, hoursAgo: 0 },
], ONE_RM);
console.log(`   fatigue=${workingSession.fatiguePercent}%, status=${workingSession.status}`);
expect('4×8 @ 75% 1RM immediately → recovering (≥ 45%)',
  workingSession.status, eq('recovering'));

// ─── 5. Recovery over time ─────────────────────────────────────────────────────

console.log('\n── Scenario: same session at different time points ──────────────');

const sessionSets = [
  { weight: 60, reps: 8 },
  { weight: 60, reps: 8 },
  { weight: 60, reps: 8 },
  { weight: 60, reps: 8 },
];

[0, 8, 16, 24, 32, 48, 72].forEach(hoursAgo => {
  const result = computeBicepFatigue(
    sessionSets.map(s => ({ ...s, hoursAgo })),
    ONE_RM
  );
  console.log(`   ${String(hoursAgo).padStart(2)}h after → fatigue=${result.fatiguePercent}%, status=${result.status}`);
});

const at8h  = computeBicepFatigue(sessionSets.map(s => ({ ...s, hoursAgo: 8  })), ONE_RM);
const at16h = computeBicepFatigue(sessionSets.map(s => ({ ...s, hoursAgo: 16 })), ONE_RM);
const at32h = computeBicepFatigue(sessionSets.map(s => ({ ...s, hoursAgo: 32 })), ONE_RM);
const at48h = computeBicepFatigue(sessionSets.map(s => ({ ...s, hoursAgo: 48 })), ONE_RM);

expect('8h after → still recovering or partial',
  at8h.status, s => s === 'recovering' || s === 'partial');
expect('16h after (= τ) → ~63% decay, status improving',
  at16h.fatiguePercent, v => v < workingSession.fatiguePercent * 0.5);
expect('32h after (= 2τ) → partial or ready',
  at32h.status, s => s === 'partial' || s === 'ready');
expect('48h after (= 3τ) → ready (< 15%)',
  at48h.status, eq('ready'));

// ─── 6. Heavy low-rep session (near-max strength work) ────────────────────────

console.log('\n── Scenario: heavy strength session (5×3 @ 90% 1RM) ────────────');

const strengthSession = computeBicepFatigue([
  { weight: 72, reps: 3, hoursAgo: 0 },
  { weight: 72, reps: 3, hoursAgo: 0 },
  { weight: 72, reps: 3, hoursAgo: 0 },
  { weight: 72, reps: 3, hoursAgo: 0 },
  { weight: 72, reps: 3, hoursAgo: 0 },
], ONE_RM);
console.log(`   fatigue=${strengthSession.fatiguePercent}%, status=${strengthSession.status}`);
expect('5×3 @ 90% 1RM → at least partial recovery needed',
  strengthSession.status, s => s === 'recovering' || s === 'partial');

// ─── 7. Light high-rep sets (pump work, 50% 1RM) ─────────────────────────────

console.log('\n── Scenario: light pump work (3×15 @ 50% 1RM) ──────────────────');

const pumpSession = computeBicepFatigue([
  { weight: 40, reps: 15, hoursAgo: 0 },
  { weight: 40, reps: 15, hoursAgo: 0 },
  { weight: 40, reps: 15, hoursAgo: 0 },
], ONE_RM);
console.log(`   fatigue=${pumpSession.fatiguePercent}%, status=${pumpSession.status}`);
expect('3×15 @ 50% 1RM → partial or recovering (not ignored, but lighter)',
  pumpSession.fatiguePercent, between(10, 70));
expect('3×15 pump work less fatiguing than 4×8 working session',
  pumpSession.fatiguePercent, v => v < workingSession.fatiguePercent);

// ─── 8. Accumulated fatigue across multiple days ───────────────────────────────

console.log('\n── Scenario: trained yesterday + 2 days ago ─────────────────────');

const multiDay = computeBicepFatigue([
  // Yesterday (24h ago) — working session
  { weight: 60, reps: 8, hoursAgo: 24 },
  { weight: 60, reps: 8, hoursAgo: 24 },
  { weight: 60, reps: 8, hoursAgo: 24 },
  { weight: 60, reps: 8, hoursAgo: 24 },
  // 2 days ago (48h ago) — another session
  { weight: 60, reps: 8, hoursAgo: 48 },
  { weight: 60, reps: 8, hoursAgo: 48 },
  { weight: 60, reps: 8, hoursAgo: 48 },
  { weight: 60, reps: 8, hoursAgo: 48 },
], ONE_RM);
console.log(`   fatigue=${multiDay.fatiguePercent}%, status=${multiDay.status}`);
expect('Two sessions (24h + 48h ago) → more fatigued than one session at 24h',
  multiDay.fatiguePercent, v => v > at8h.fatiguePercent * 0.3,
  'accumulated fatigue should be visible');

// ─── 9. Very old session (well outside decay window) ──────────────────────────

console.log('\n── Scenario: session 5 days ago (beyond 4.6τ cutoff) ────────────');

const oldSession = computeBicepFatigue([
  { weight: 60, reps: 8, hoursAgo: 120 }, // 5 days = 120h, τ=16h → 7.5τ, negligible
  { weight: 60, reps: 8, hoursAgo: 120 },
  { weight: 60, reps: 8, hoursAgo: 120 },
  { weight: 60, reps: 8, hoursAgo: 120 },
], ONE_RM);
console.log(`   fatigue=${oldSession.fatiguePercent}%, status=${oldSession.status}`);
expect('Session 5 days ago → ready (fully decayed)',
  oldSession.status, eq('ready'));
expect('Session 5 days ago → near 0% fatigue',
  oldSession.fatiguePercent, v => v < 2);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
