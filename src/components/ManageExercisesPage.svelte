<script>
  import { Plus, Trash2, Download, Upload, ChevronDown, ChevronUp, Edit2, X, Check, Search } from 'lucide-svelte';

  let {
    goToHome,
    goToAddExercise,
    exercises,
    activeExercises,
    bodyweight = [],
    toggleActiveExercise,
    deleteExercise,
    setExercises,
    setActiveExercises,
    setBodyweight = () => {}
  } = $props();

  let expandedExercises = $state({});
  let editingExercise = $state(null);
  let editMuscles = $state([]);
  let searchQuery = $state('');

  const availableMuscles = [
    'biceps', 'triceps', 'deltoids', 'forearms', 'trapezius',
    'pectorals', 'lats', 'erectus', 'abs', 'obliques', 'core',
    'quads', 'hamstrings', 'glutes', 'calves', 'adductors'
  ];

  let selectedMuscle = $state('');
  let engagement = $state(0.5);

  // Filter exercises based on search query
  const filteredExercises = $derived(
    exercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleExpand = (name) => {
    expandedExercises[name] = !expandedExercises[name];
  };

  const startEditing = (exercise) => {
    editingExercise = exercise.name;
    editMuscles = exercise.engagedMuscles ? [...exercise.engagedMuscles] : [];
  };

  const cancelEditing = () => {
    editingExercise = null;
    editMuscles = [];
    selectedMuscle = '';
    engagement = 0.5;
  };

  const saveEditing = () => {
    const updatedExercises = exercises.map(ex => {
      if (ex.name === editingExercise) {
        return { ...ex, engagedMuscles: editMuscles };
      }
      return ex;
    });
    setExercises(updatedExercises);
    editingExercise = null;
    editMuscles = [];
    selectedMuscle = '';
    engagement = 0.5;
  };

  const addMuscle = () => {
    if (selectedMuscle && !editMuscles.find(m => m.name === selectedMuscle)) {
      editMuscles = [...editMuscles, {
        name: selectedMuscle,
        engagement: engagement
      }];
      selectedMuscle = '';
      engagement = 0.5;
    }
  };

  const removeMuscle = (muscleName) => {
    editMuscles = editMuscles.filter(m => m.name !== muscleName);
  };

  // Function to clear all data
  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setExercises([]);
      setActiveExercises([]);
      setBodyweight([]);
      localStorage.removeItem('exercises');
      localStorage.removeItem('activeExercises');
      localStorage.removeItem('bodyweight');
      alert('All data cleared!');
    }
  };

  // Function to export data as JSON file
  const handleExportData = () => {
    const data = {
      exercises: exercises,
      activeExercises: activeExercises,
      bodyweight: bodyweight
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  // Function to import data from JSON file
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Support two formats:
        // 1. Full export: { exercises, activeExercises }
        // 2. History-only array: [{ name, history }, ...]
        if (Array.isArray(data)) {
          // Merge history into existing exercises, add new ones, activate all imported
          const updatedExercises = [...exercises];
          const newActiveNames = [...activeExercises];

          data.forEach(imported => {
            const existing = updatedExercises.find(ex => ex.name === imported.name);
            if (existing) {
              // Merge history, deduplicate by timestamp
              const existingTimestamps = new Set(existing.history.map(s => s.timestamp));
              const newSets = (imported.history || []).filter(s => !existingTimestamps.has(s.timestamp));
              existing.history = [...existing.history, ...newSets].sort((a, b) => b.timestamp - a.timestamp);
            } else {
              updatedExercises.push({
                name: imported.name,
                history: imported.history || [],
                isHidden: false,
                engagedMuscles: imported.engagedMuscles || []
              });
            }
            if (!newActiveNames.includes(imported.name)) {
              newActiveNames.push(imported.name);
            }
          });

          setExercises(updatedExercises);
          setActiveExercises(newActiveNames);
          localStorage.setItem('exercises', JSON.stringify(updatedExercises));
          localStorage.setItem('activeExercises', JSON.stringify(newActiveNames));
        } else {
          if (data.exercises && Array.isArray(data.exercises)) {
            setExercises(data.exercises);
            localStorage.setItem('exercises', JSON.stringify(data.exercises));
          }

          if (data.activeExercises && Array.isArray(data.activeExercises)) {
            // Also activate any exercises that have history but aren't in activeExercises
            const withHistory = (data.exercises || [])
              .filter(ex => ex.history?.length > 0)
              .map(ex => ex.name);
            const merged = [...new Set([...data.activeExercises, ...withHistory])];
            setActiveExercises(merged);
            localStorage.setItem('activeExercises', JSON.stringify(merged));
          }

          // Bodyweight: merge by id, dedupe — empty/missing array leaves existing records untouched
          if (Array.isArray(data.bodyweight) && data.bodyweight.length > 0) {
            const existingIds = new Set(bodyweight.map(r => r.id));
            const incoming = data.bodyweight.filter(r => r && !existingIds.has(r.id));
            const merged = [...bodyweight, ...incoming];
            setBodyweight(merged);
            localStorage.setItem('bodyweight', JSON.stringify(merged));
          }
        }

        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };

    reader.readAsText(file);
    // Reset the input value so the same file can be selected again
    event.target.value = null;
  };
</script>

<div class="p-4">
  <h1 class="text-xl font-bold mb-6">Manage Exercises</h1>

  <!-- Statistics Section -->
  <div class="mb-4 bg-white p-4 rounded-lg shadow">
    <h2 class="text-sm font-semibold mb-2 text-gray-700">Statistics</h2>
    <div class="grid grid-cols-3 gap-2 text-center">
      <div>
        <div class="text-2xl font-bold text-blue-600">{exercises.length}</div>
        <div class="text-xs text-gray-600">Total Exercises</div>
      </div>
      <div>
        <div class="text-2xl font-bold text-green-600">{activeExercises.length}</div>
        <div class="text-xs text-gray-600">Active</div>
      </div>
      <div>
        <div class="text-2xl font-bold text-purple-600">
          {exercises.reduce((sum, ex) => sum + (ex.history?.length || 0), 0)}
        </div>
        <div class="text-xs text-gray-600">Total Sets</div>
      </div>
    </div>
  </div>

  <div class="mb-6 space-y-2">
    <!-- Add exercise button -->
    <button
      onclick={goToAddExercise}
      class="w-full flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-md"
    >
      <Plus size={16} class="mr-1" />
      Add New Exercise
    </button>

    <!-- Data import/export buttons -->
    <div class="grid grid-cols-2 gap-2">
      <button
        onclick={handleExportData}
        class="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-md text-sm"
      >
        <Download size={16} class="mr-1" />
        Export
      </button>

      <label class="flex items-center justify-center px-3 py-2 bg-purple-500 text-white rounded-md cursor-pointer text-sm">
        <Upload size={16} class="mr-1" />
        Import
        <input
          type="file"
          accept=".json"
          class="hidden"
          onchange={handleImportData}
        />
      </label>
    </div>

    <button
      onclick={handleClearAllData}
      class="w-full flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-md text-sm"
    >
      <Trash2 size={16} class="mr-1" />
      Clear All Data
    </button>
  </div>

  <h2 class="text-lg font-semibold mb-2">Your Exercises</h2>

  {#if exercises.length === 0}
    <p class="text-center py-8 text-gray-500">No exercises added yet</p>
  {:else}
    <!-- Search Input -->
    <div class="mb-4 relative">
      <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Search size={20} />
      </div>
      <input
        type="text"
        placeholder="Search exercises..."
        value={searchQuery}
        oninput={(e) => searchQuery = e.target.value}
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {#if filteredExercises.length === 0}
      <p class="text-center py-8 text-gray-500">No exercises found</p>
    {:else}
      <div class="space-y-2">
        {#each filteredExercises as exercise}
        <div class="bg-white rounded-md shadow">
          <div class="flex items-center justify-between p-3">
            <div class="flex items-center flex-1">
              <input
                type="checkbox"
                checked={activeExercises.includes(exercise.name)}
                onchange={() => toggleActiveExercise(exercise.name)}
                class="mr-3 h-5 w-5"
              />
              <span class="flex-1">{exercise.name}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => toggleExpand(exercise.name)}
                class="text-gray-500 hover:text-gray-700"
              >
                {#if expandedExercises[exercise.name]}
                  <ChevronUp size={18} />
                {:else}
                  <ChevronDown size={18} />
                {/if}
              </button>
              <button
                onclick={() => deleteExercise(exercise.name)}
                class="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {#if expandedExercises[exercise.name]}
            <div class="px-3 pb-3 border-t pt-3">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-gray-700">Engaged Muscles</h3>
                {#if editingExercise === exercise.name}
                  <div class="flex gap-2">
                    <button
                      onclick={saveEditing}
                      class="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-sm"
                    >
                      <Check size={14} />
                      Save
                    </button>
                    <button
                      onclick={cancelEditing}
                      class="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white rounded text-sm"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                {:else}
                  <button
                    onclick={() => startEditing(exercise)}
                    class="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                {/if}
              </div>

              {#if editingExercise === exercise.name}
                <div class="space-y-2">
                  <div class="flex gap-2">
                    <select
                      value={selectedMuscle}
                      onchange={(e) => selectedMuscle = e.target.value}
                      class="flex-1 p-2 border rounded text-sm"
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
                        class="w-20"
                      />
                      <span class="text-xs w-8">{Math.round(engagement * 100)}%</span>
                    </div>

                    <button
                      onclick={addMuscle}
                      disabled={!selectedMuscle}
                      class="p-2 rounded text-sm {selectedMuscle ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {#if editMuscles.length > 0}
                    <div class="space-y-1">
                      {#each editMuscles as muscle}
                        <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span class="text-sm font-medium">{muscle.name}</span>
                          <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-600">{Math.round(muscle.engagement * 100)}%</span>
                            <button
                              onclick={() => removeMuscle(muscle.name)}
                              class="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-xs text-gray-500 italic">No muscles added</p>
                  {/if}
                </div>
              {:else}
                {#if exercise.engagedMuscles && exercise.engagedMuscles.length > 0}
                  <div class="space-y-1">
                    {#each exercise.engagedMuscles as muscle}
                      <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span class="text-sm font-medium">{muscle.name}</span>
                        <span class="text-sm text-gray-600">{Math.round(muscle.engagement * 100)}%</span>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="text-xs text-gray-500 italic">No muscles defined</p>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
      </div>
    {/if}
  {/if}
</div>
