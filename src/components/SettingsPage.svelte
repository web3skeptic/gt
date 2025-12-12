<script>
  import { Download, Upload, Trash2 } from 'lucide-svelte';

  let {
    exercises,
    activeExercises,
    setExercises,
    setActiveExercises,
    goToAddExercise
  } = $props();

  // Function to export data as JSON file
  const handleExportData = () => {
    const data = {
      exercises: exercises,
      activeExercises: activeExercises
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();

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

        if (data.exercises && Array.isArray(data.exercises)) {
          setExercises(data.exercises);
          localStorage.setItem('exercises', JSON.stringify(data.exercises));
        }

        if (data.activeExercises && Array.isArray(data.activeExercises)) {
          setActiveExercises(data.activeExercises);
          localStorage.setItem('activeExercises', JSON.stringify(data.activeExercises));
        }

        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };

    reader.readAsText(file);
    event.target.value = null;
  };

  // Function to clear all data
  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setExercises([]);
      setActiveExercises([]);
      localStorage.removeItem('exercises');
      localStorage.removeItem('activeExercises');
      alert('All data cleared!');
    }
  };
</script>

<div class="p-4">
  <h1 class="text-2xl font-bold mb-6">Settings</h1>

  <div class="space-y-4">
    <!-- Data Management Section -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-3">Data Management</h2>

      <div class="space-y-2">
        <button
          onclick={handleExportData}
          class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          <Download size={20} />
          Export Data
        </button>

        <label class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 cursor-pointer">
          <Upload size={20} />
          Import Data
          <input
            type="file"
            accept=".json"
            class="hidden"
            onchange={handleImportData}
          />
        </label>

        <button
          onclick={handleClearAllData}
          class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          <Trash2 size={20} />
          Clear All Data
        </button>
      </div>
    </div>

    <!-- Exercise Management Section -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-3">Exercise Management</h2>

      <button
        onclick={goToAddExercise}
        class="w-full px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Add New Exercise
      </button>
    </div>

    <!-- Statistics Section -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-3">Statistics</h2>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Total Exercises:</span>
          <span class="font-semibold">{exercises.length}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Active Exercises:</span>
          <span class="font-semibold">{activeExercises.length}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">Total Workout History:</span>
          <span class="font-semibold">
            {exercises.reduce((sum, ex) => sum + (ex.history?.length || 0), 0)}
          </span>
        </div>
      </div>
    </div>

    <!-- About Section -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h2 class="text-lg font-semibold mb-2">About</h2>
      <p class="text-sm text-gray-600">
        Gym Tracker - Track your workouts and muscle engagement
      </p>
      <p class="text-xs text-gray-500 mt-2">
        Version 1.0.0
      </p>
    </div>
  </div>
</div>
