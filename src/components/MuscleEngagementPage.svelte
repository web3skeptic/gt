<script>
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import MuscleVisualization from './MuscleVisualization.svelte';

  let { exercises, activeExercises } = $props();

  // Recovery periods in hours for each muscle
  const muscleRecovery = {
    biceps: 48,
    triceps: 48,
    deltoids: 48,
    forearms: 24,
    trapezius: 48,
    pectorals: 72,
    lats: 72,
    erectus: 72,
    abs: 24,
    obliques: 24,
    core: 24,
    quads: 72,
    hamstrings: 72,
    glutes: 72,
    calves: 24,
    adductors: 48
  };

  const muscleGroups = {
    'Arms': ['biceps', 'triceps', 'deltoids', 'forearms'],
    'Back': ['trapezius', 'lats', 'erectus'],
    'Core': ['abs', 'obliques', 'core', 'pectorals'],
    'Legs': ['quads', 'hamstrings', 'glutes', 'calves', 'adductors']
  };

  let expandedGroups = $state({});
  let selectedMuscles = $state(new Set());

  const allMuscles = [
    'biceps', 'triceps', 'deltoids', 'forearms', 'trapezius',
    'pectorals', 'lats', 'erectus', 'abs', 'obliques', 'core',
    'quads', 'hamstrings', 'glutes', 'calves', 'adductors'
  ];

  // Calculate muscle engagement across all active exercises
  const muscleEngagement = $derived(() => {
    const muscleData = {};

    allMuscles.forEach(muscle => {
      muscleData[muscle] = {
        totalEngagement: 0,
        exerciseCount: 0,
        exercises: [],
        lastWorked: null,
        recoveryStatus: 'ready'
      };
    });

    activeExercises.forEach(exName => {
      const exercise = exercises.find(ex => ex.name === exName);
      if (exercise && exercise.engagedMuscles) {
        exercise.engagedMuscles.forEach(muscle => {
          if (muscleData[muscle.name]) {
            muscleData[muscle.name].totalEngagement += muscle.engagement;
            muscleData[muscle.name].exerciseCount++;
            muscleData[muscle.name].exercises.push({
              name: exName,
              engagement: muscle.engagement,
              lastWorked: exercise.history && exercise.history.length > 0
                ? exercise.history[0].timestamp
                : null
            });

            // Update last worked date
            if (exercise.history && exercise.history.length > 0) {
              const lastWorkout = exercise.history[0].timestamp;
              if (!muscleData[muscle.name].lastWorked || lastWorkout > muscleData[muscle.name].lastWorked) {
                muscleData[muscle.name].lastWorked = lastWorkout;
              }
            }
          }
        });
      }
    });

    // Calculate recovery status
    const now = Date.now();
    Object.keys(muscleData).forEach(muscleName => {
      const muscle = muscleData[muscleName];
      if (muscle.lastWorked) {
        const hoursSinceWorkout = (now - muscle.lastWorked) / (1000 * 60 * 60);
        const recoveryHours = muscleRecovery[muscleName] || 48;

        if (hoursSinceWorkout < recoveryHours * 0.5) {
          muscle.recoveryStatus = 'recovering';
        } else if (hoursSinceWorkout < recoveryHours) {
          muscle.recoveryStatus = 'partial';
        } else {
          muscle.recoveryStatus = 'ready';
        }
        muscle.recoveryPercentage = Math.min(100, (hoursSinceWorkout / recoveryHours) * 100);
      } else {
        muscle.recoveryPercentage = 100;
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
    selectedMuscles = new Set(selectedMuscles);
  };

  const getRecoveryColor = (status) => {
    switch(status) {
      case 'recovering': return '#ef4444';
      case 'partial': return '#f59e0b';
      case 'ready': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getMuscleColor = (muscleName) => {
    const data = muscleEngagement()[muscleName];
    if (data && data.exerciseCount > 0) {
      return '#10b981'; // Light green for activated
    }
    return '#ef4444'; // Red for unactivated
  };

  const getMuscleOpacity = (muscleName) => {
    const data = muscleEngagement()[muscleName];
    if (selectedMuscles.has(muscleName)) {
      return 0.9;
    }
    return data && data.exerciseCount > 0 ? 0.7 : 0.5;
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
      <div class="mb-4 flex gap-4 justify-center text-xs">
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #10b981;"></div>
          <span>Activated</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded" style="background-color: #ef4444;"></div>
          <span>Needs Activation</span>
        </div>
      </div>
      <MuscleVisualization
        muscleEngagement={muscleEngagement()}
        {selectedMuscles}
        {toggleMuscle}
      />
    </div>

    <!-- Muscle Groups Accordion -->
    <div class="space-y-2">
      {#each Object.entries(muscleGroups) as [groupName, muscles]}
        <div class="bg-white rounded-lg shadow">
          <button
            onclick={() => toggleGroup(groupName)}
            class="w-full flex items-center justify-between p-4 text-left"
          >
            <h3 class="text-lg font-semibold">{groupName}</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">
                {muscles.filter(m => muscleEngagement()[m].exerciseCount > 0).length}/{muscles.length} active
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
              {#each muscles as muscle}
                {@const data = muscleEngagement()[muscle]}
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
                      <div class="text-sm font-bold text-blue-600">
                        {data.exerciseCount > 0 ? Math.round((data.totalEngagement / data.exerciseCount) * 100) : 0}%
                      </div>
                      <div class="text-xs text-gray-500">
                        Recovery: {muscleRecovery[muscle]}h
                      </div>
                    </div>
                  </div>

                  <!-- Recovery Bar -->
                  {#if data.lastWorked}
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        class="h-2 rounded-full transition-all"
                        style="width: {data.recoveryPercentage}%; background-color: {getRecoveryColor(data.recoveryStatus)};"
                      ></div>
                    </div>
                  {/if}

                  <!-- Engagement Bar -->
                  {#if data.exerciseCount > 0}
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        class="bg-blue-500 h-2 rounded-full transition-all"
                        style="width: {(data.totalEngagement / data.exerciseCount) * 100}%"
                      ></div>
                    </div>

                    <!-- Exercises List -->
                    <div class="space-y-1 mt-2">
                      {#each data.exercises as ex}
                        <div class="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                          <span class="text-gray-700">{ex.name}</span>
                          <span class="text-gray-500">{Math.round(ex.engagement * 100)}%</span>
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
