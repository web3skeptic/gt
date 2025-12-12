<script>
  import ExerciseCard from './common/ExerciseCard.svelte';
  import { Search } from 'lucide-svelte';

  let { activeExercises, exercises, goToExercise, goToManageExercises } = $props();

  let searchQuery = $state('');

  // Calculate days ago for a timestamp
  const getDaysAgo = (timestamp) => {
    if (!timestamp) return null;

    const now = new Date();
    const setDate = new Date(timestamp);

    // Reset time to compare just dates
    now.setHours(0, 0, 0, 0);
    setDate.setHours(0, 0, 0, 0);

    const differenceMs = now - setDate;
    const daysDifference = Math.floor(differenceMs / (1000 * 60 * 60 * 24));

    if (daysDifference === 0) return "Today";
    if (daysDifference === 1) return "Yesterday";
    return `${daysDifference} days ago`;
  };

  // Get active exercises with their last set details
  const exercisesWithLastSet = $derived(
    activeExercises
      .map(name => {
        const exercise = exercises.find(ex => ex.name === name);
        const lastSet = exercise?.history && exercise.history.length > 0
          ? exercise.history[0]
          : null;

        return {
          name,
          lastSet,
          lastTimestamp: lastSet ? lastSet.timestamp : 0,
          daysAgo: lastSet ? getDaysAgo(lastSet.timestamp) : "Never"
        };
      })
      // Sort by most recent first
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
      // Filter by search query
      .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );
</script>

<div class="p-4">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Gym Tracker</h1>
    <button
      onclick={goToManageExercises}
      class="px-3 py-1 bg-gray-200 rounded-md text-sm"
    >
      Manage
    </button>
  </div>

  {#if activeExercises.length > 0}
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
  {/if}

  {#if activeExercises.length === 0}
    <div class="text-center py-8">
      <p class="text-gray-600 mb-4">No active exercises</p>
      <button
        onclick={goToManageExercises}
        class="px-4 py-2 bg-blue-500 text-white rounded-md"
      >
        Add Exercises
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      {#each exercisesWithLastSet as { name, lastSet, daysAgo }}
        <ExerciseCard
          {name}
          lastPerformed={daysAgo}
          onclick={() => goToExercise(name)}
        />
      {/each}
    </div>
  {/if}
</div>
