<script>
  import { ArrowLeft, Plus, X } from 'lucide-svelte';

  let {
    goToManageExercises,
    newExerciseName,
    setNewExerciseName,
    newExerciseMuscles,
    setNewExerciseMuscles,
    addExercise
  } = $props();

  const availableMuscles = [
    'biceps', 'triceps', 'deltoids', 'forearms', 'trapezius',
    'pectorals', 'lats', 'erectus', 'abs', 'obliques', 'core',
    'quads', 'hamstrings', 'glutes', 'calves', 'adductors'
  ];

  let selectedMuscle = $state('');
  let engagement = $state(0.5);

  const addMuscle = () => {
    if (selectedMuscle && !newExerciseMuscles.find(m => m.name === selectedMuscle)) {
      setNewExerciseMuscles([...newExerciseMuscles, {
        name: selectedMuscle,
        engagement: engagement
      }]);
      selectedMuscle = '';
      engagement = 0.5;
    }
  };

  const removeMuscle = (muscleName) => {
    setNewExerciseMuscles(newExerciseMuscles.filter(m => m.name !== muscleName));
  };
</script>

<div class="p-4">
  <div class="flex items-center mb-6">
    <button onclick={goToManageExercises} class="mr-2">
      <ArrowLeft size={20} />
    </button>
    <h1 class="text-xl font-bold">Add New Exercise</h1>
  </div>

  <div class="bg-white p-4 rounded-lg shadow space-y-4">
    <div>
      <label class="block text-sm text-gray-600 mb-1">Exercise Name</label>
      <input
        type="text"
        value={newExerciseName}
        oninput={(e) => setNewExerciseName(e.target.value)}
        class="w-full p-2 border rounded-md"
      />
    </div>

    <div>
      <label class="block text-sm text-gray-600 mb-2">Engaged Muscles</label>

      <div class="flex gap-2 mb-3">
        <select
          value={selectedMuscle}
          onchange={(e) => selectedMuscle = e.target.value}
          class="flex-1 p-2 border rounded-md"
        >
          <option value="">Select muscle...</option>
          {#each availableMuscles as muscle}
            <option value={muscle}>{muscle}</option>
          {/each}
        </select>

        <div class="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={engagement}
            oninput={(e) => engagement = parseFloat(e.target.value)}
            class="w-24"
          />
          <span class="text-sm w-8">{Math.round(engagement * 100)}%</span>
        </div>

        <button
          onclick={addMuscle}
          disabled={!selectedMuscle}
          class="p-2 rounded-md {selectedMuscle ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}"
        >
          <Plus size={20} />
        </button>
      </div>

      {#if newExerciseMuscles.length > 0}
        <div class="space-y-2">
          {#each newExerciseMuscles as muscle}
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span class="text-sm font-medium">{muscle.name}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">{Math.round(muscle.engagement * 100)}%</span>
                <button
                  onclick={() => removeMuscle(muscle.name)}
                  class="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500 italic">No muscles added yet</p>
      {/if}
    </div>

    <button
      onclick={addExercise}
      disabled={!newExerciseName.trim()}
      class="w-full py-2 rounded-md {
        !newExerciseName.trim()
          ? 'bg-gray-300 text-gray-500'
          : 'bg-blue-500 text-white'
      }"
    >
      Add Exercise
    </button>
  </div>
</div>
