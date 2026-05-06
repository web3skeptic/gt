<script>
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import MuscleVisualization from './MuscleVisualization.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let { exercises, activeExercises, bodyweight = [] } = $props();

  // Exponential decay time constants per muscle (τ in hours, ~63% recovered by τ)
  // Full recovery (~95%) ≈ 3τ
  const muscleTau = {
    forearms: 12, calves: 12,
    biceps: 16, triceps: 16,
    deltoids: 20, trapezius: 20, adductors: 20,
    pectorals: 24, lats: 24, abs: 24, obliques: 24, core: 24,
    quads: 28, hamstrings: 28, glutes: 28,
    erectus: 32
  };

  // Reference fatigue score for a "hard session" (4×8 @ 80% 1RM, primary muscle)
  // Used to normalise raw scores to 0–100%
  const muscleReference = {
    forearms: 300, calves: 300,
    biceps: 400, triceps: 400,
    deltoids: 500, trapezius: 500, adductors: 500,
    pectorals: 650, lats: 650, abs: 400, obliques: 400, core: 400,
    quads: 900, hamstrings: 900, glutes: 900,
    erectus: 750
  };

  const muscleGroups = {
    'Arms': ['biceps', 'triceps', 'deltoids', 'forearms'],
    'Back': ['trapezius', 'lats', 'erectus'],
    'Core': ['abs', 'obliques', 'core', 'pectorals'],
    'Legs': ['quads', 'hamstrings', 'glutes', 'calves', 'adductors']
  };

  let expandedGroups = $state({});
  let selectedMuscles = new SvelteSet();

  const allMuscles = [
    'biceps', 'triceps', 'deltoids', 'forearms', 'trapezius',
    'pectorals', 'lats', 'erectus', 'abs', 'obliques', 'core',
    'quads', 'hamstrings', 'glutes', 'calves', 'adductors'
  ];

  // Brzycki 1RM estimate (same formula as ExercisePage)
  const brzycki1RM = (weight, reps) => {
    if (!weight || !reps || weight <= 0 || reps <= 0) return null;
    return weight * (36 / (37 - Math.min(reps, 10)));
  };

  // Bodyweight records sorted oldest → newest (memoised via $derived below).
  // For a set logged at `timestamp`, the user's effective bodyweight is the
  // most recent bodyweight record at-or-before that time; if no record exists
  // yet, fall back to the earliest record we have.
  const sortedBodyweight = $derived(
    [...(bodyweight || [])].sort((a, b) => a.timestamp - b.timestamp)
  );

  const bodyweightAt = (timestamp) => {
    const list = sortedBodyweight;
    if (list.length === 0) return null;
    let result = list[0].weight;
    for (const rec of list) {
      if (rec.timestamp <= timestamp) result = rec.weight;
      else break;
    }
    return result;
  };

  // Effective load for a set: explicit weight, or the user's bodyweight at
  // the time of the set when weight is 0 (pullups, dips, etc.).
  const effectiveWeight = (set) => {
    if (set.weight && set.weight > 0) return set.weight;
    return bodyweightAt(set.timestamp);
  };

  // Get the best 1RM estimate for an exercise from its recent history
  const getExercise1RM = (exercise) => {
    if (!exercise.history || exercise.history.length === 0) return null;
    let best = 0;
    exercise.history.forEach(set => {
      const w = effectiveWeight(set);
      const est = brzycki1RM(w, set.repetitions);
      if (est && est > best) best = est;
    });
    return best > 0 ? best : null;
  };

  // Compute the fatigue contribution of one set for one muscle
  // Returns a raw fatigue unit score (arbitrary units, normalised later)
  const setFatigueScore = (weight, reps, oneRM, engagementScore) => {
    if (!weight || !reps || !oneRM || weight <= 0 || reps <= 0) return 0;

    // 1. Relative intensity (% of 1RM), clamped to realistic range
    const intensity = Math.min(1.0, Math.max(0.3, weight / oneRM));

    // 2. Intensity factor: linear scale 0.5–1.2 across 30–100% 1RM
    const intensityFactor = 0.5 + intensity * 0.7;

    // 3. Estimate reps-in-reserve (RIR) using Brzycki inverted:
    //    max reps at this weight ≈ 36 - 36*(weight/1RM)
    const maxRepsAtWeight = Math.max(1, Math.round(36 - 36 * intensity));
    const rir = Math.max(0, maxRepsAtWeight - reps);

    // 4. RIR multiplier: failure (RIR 0) = 1.0, RIR 3 ≈ 0.55, RIR 8+ ≈ 0.2
    const rirMultiplier = Math.max(0.2, Math.exp(-rir * 0.2));

    // 5. Volume component: sqrt(reps) × weight — diminishing returns on high reps
    const volume = Math.sqrt(reps) * weight;

    // 6. Engagement scaling: primary (0.9) ≈ full dose, synergist (0.2) ≈ 20%
    const engagement = Math.max(0.05, engagementScore || 0);

    return volume * intensityFactor * rirMultiplier * engagement;
  };

  // Main derived computation
  const muscleEngagement = $derived.by(() => {
    const now = Date.now();
    const muscleData = {};

    allMuscles.forEach(muscle => {
      muscleData[muscle] = {
        exerciseCount: 0,
        exercises: [],
        lastWorked: null,
        fatiguePercent: 0,
        recoveryStatus: 'ready',
        recoveryPercentage: 100
      };
    });

    // Collect exercise/muscle relationships
    activeExercises.forEach(exName => {
      const exercise = exercises.find(ex => ex.name === exName);
      if (!exercise || !exercise.engagedMuscles) return;

      exercise.engagedMuscles.forEach(({ name: muscleName, engagement }) => {
        if (!muscleData[muscleName]) return;
        muscleData[muscleName].exerciseCount++;
        muscleData[muscleName].exercises.push({ name: exName, engagement });

        if (exercise.history && exercise.history.length > 0) {
          const latest = exercise.history[0].timestamp;
          if (!muscleData[muscleName].lastWorked || latest > muscleData[muscleName].lastWorked) {
            muscleData[muscleName].lastWorked = latest;
          }
        }
      });
    });

    // Compute fatigue for each muscle using exponential decay over all history
    allMuscles.forEach(muscleName => {
      const md = muscleData[muscleName];
      const tauMs = (muscleTau[muscleName] || 20) * 3600 * 1000;
      const cutoffMs = tauMs * 4.6; // sets older than ~4.6τ contribute < 1% — skip them

      let totalFatigue = 0;

      activeExercises.forEach(exName => {
        const exercise = exercises.find(ex => ex.name === exName);
        if (!exercise || !exercise.history || !exercise.engagedMuscles) return;

        const muscleEngDef = exercise.engagedMuscles.find(m => m.name === muscleName);
        if (!muscleEngDef) return;

        const oneRM = getExercise1RM(exercise);
        if (!oneRM) return;

        exercise.history.forEach(set => {
          const ageMs = now - set.timestamp;
          if (ageMs < 0 || ageMs > cutoffMs) return;

          const w = effectiveWeight(set);
          const decayFactor = Math.exp(-ageMs / tauMs);
          const rawScore = setFatigueScore(w, set.repetitions, oneRM, muscleEngDef.engagement);
          totalFatigue += rawScore * decayFactor;
        });
      });

      // Normalise to 0–100%
      const ref = muscleReference[muscleName] || 600;
      const fatiguePercent = Math.min(100, (totalFatigue / ref) * 100);

      md.fatiguePercent = fatiguePercent;
      // recoveryPercentage = inverse of fatigue (how recovered they are)
      md.recoveryPercentage = Math.round(100 - fatiguePercent);

      if (fatiguePercent < 15) {
        md.recoveryStatus = 'ready';
      } else if (fatiguePercent < 45) {
        md.recoveryStatus = 'partial';
      } else {
        md.recoveryStatus = 'recovering';
      }
    });

    return muscleData;
  });

  const toggleGroup = (groupName) => {
    expandedGroups[groupName] = !expandedGroups[groupName];
  };

  const toggleMuscle = (muscleName) => {
    if (selectedMuscles.has(muscleName)) {
      selectedMuscles.delete(muscleName);
    } else {
      selectedMuscles.add(muscleName);
    }
  };

  const getRecoveryColor = (status) => {
    switch(status) {
      case 'recovering': return '#ef4444';
      case 'partial': return '#f59e0b';
      case 'ready': return '#10b981';
      default: return '#6b7280';
    }
  };
</script>

<div class="p-4 pb-24">
  <h1 class="text-2xl font-bold mb-6">Muscle Engagement</h1>

  {#if activeExercises.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-600">No active exercises. Add exercises to see muscle engagement data.</p>
    </div>
  {:else}
    <!-- Muscle Visualization -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-4">Body Visualization</h2>
      <div class="mb-4 flex gap-4 justify-center text-xs flex-wrap">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #10b981;"></div>
          <span>Ready</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #f59e0b;"></div>
          <span>Partial Recovery</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #ef4444;"></div>
          <span>Needs Recovery</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #9ca3af;"></div>
          <span>Not Worked</span>
        </div>
      </div>
      <MuscleVisualization
        muscleEngagement={muscleEngagement}
        {selectedMuscles}
        {toggleMuscle}
      />
    </div>

    <!-- Muscle Groups Accordion -->
    <div class="space-y-2">
      {#each Object.entries(muscleGroups) as [groupName, muscles] (groupName)}
        <div class="bg-white rounded-lg shadow">
          <button
            onclick={() => toggleGroup(groupName)}
            class="w-full flex items-center justify-between p-4 text-left"
          >
            <h3 class="text-lg font-semibold">{groupName}</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">
                {muscles.filter(m => muscleEngagement[m].recoveryStatus === 'ready').length}/{muscles.length} ready
              </span>
              {#if expandedGroups[groupName]}
                <ChevronUp size={20} />
              {:else}
                <ChevronDown size={20} />
              {/if}
            </div>
          </button>

          {#if expandedGroups[groupName]}
            <div class="px-4 pb-4 space-y-3 border-t">
              {#each muscles as muscle (muscle)}
                {@const data = muscleEngagement[muscle]}
                <div class="pt-3">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-semibold capitalize">{muscle}</h4>
                      <span
                        class="text-xs px-2 py-0.5 rounded"
                        style="background-color: {getRecoveryColor(data.recoveryStatus)}; color: white;"
                      >
                        {data.recoveryStatus}
                      </span>
                    </div>
                    <div class="text-right">
                      <div class="text-xs text-gray-500">
                        Fatigue: {Math.round(data.fatiguePercent)}%
                      </div>
                    </div>
                  </div>

                  <!-- Recovery Bar -->
                  {#if data.fatiguePercent > 0}
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        class="h-2 rounded-full transition-all"
                        style="width: {data.recoveryPercentage}%; background-color: {getRecoveryColor(data.recoveryStatus)};"
                      ></div>
                    </div>
                  {/if}

                  <!-- Exercises List -->
                  {#if data.exerciseCount > 0}
                    <div class="space-y-1 mt-2">
                      {#each data.exercises as ex (ex.name)}
                        <div class="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                          <span class="text-gray-700">{ex.name}</span>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-xs text-gray-500 italic">No exercises targeting this muscle</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .muscle-visualization {
    position: relative;
    min-height: 350px;
    display: flex;
    justify-content: center;
  }

  .muscle-group path {
    transition: opacity 0.25s ease-in-out, fill 0.25s ease-in-out;
  }

  .muscle-group:hover path {
    opacity: 0.9 !important;
  }
</style>
