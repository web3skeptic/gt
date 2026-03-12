<script>
  import { ArrowLeft, Calendar, Clock, Dumbbell } from 'lucide-svelte';
  import SetHistory from './common/SetHistory.svelte';

  let {
    currentExercise,
    goToHome,
    exercises,
    setExercises,
    setCurrentExercise,
    newSet,
    setNewSet
  } = $props();

  let editingSet = $state(null);
  let dateTime = $state({
    date: '',
    time: ''
  });

  // Initialize date and time
  $effect(() => {
    if (!editingSet) {
      const now = new Date();
      dateTime = {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5)
      };
    } else {
      const editDate = new Date(editingSet.timestamp);
      dateTime = {
        date: editDate.toISOString().split('T')[0],
        time: editDate.toTimeString().split(' ')[0].substring(0, 5)
      };
    }
  });

  // Calculate estimated one-rep max using Brzycki formula
  // Reps are capped at 10 — sets with more than 10 reps are treated as 10
  const calculateOneRepMax = (weight, reps) => {
    if (weight <= 0 || reps <= 0) return null;
    const effectiveReps = Math.min(reps, 10);
    return weight * (36 / (37 - effectiveReps));
  };

  // Find the best recent set for 1RM calculation
  const getRecentOneRepMax = () => {
    if (!currentExercise.history || currentExercise.history.length === 0) return null;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTime = thirtyDaysAgo.getTime();

    let bestOneRM = 0;
    let bestSet = null;

    const historyCopy = [...currentExercise.history];

    historyCopy.forEach(set => {
      if (!set.weight || set.weight <= 0 || !set.repetitions || set.repetitions <= 0) return;
      if (set.timestamp < cutoffTime) return;

      const oneRM = calculateOneRepMax(set.weight, set.repetitions);
      if (oneRM > bestOneRM) {
        bestOneRM = oneRM;
        bestSet = set;
      }
    });

    return bestSet ? {
      oneRM: bestOneRM,
      weight: bestSet.weight,
      reps: bestSet.repetitions
    } : null;
  };

  // Get the current theoretical 1RM if form values are valid
  const getCurrentOneRepMax = () => {
    const weight = parseFloat(newSet.weight);
    const reps = parseInt(newSet.repetitions);

    if (weight > 0 && reps > 0) {
      return calculateOneRepMax(weight, reps);
    }
    return null;
  };

  const recentOneRMData = $derived(getRecentOneRepMax());
  const currentOneRM = $derived(getCurrentOneRepMax());

  const handleEditSet = (set) => {
    editingSet = set;
    setNewSet({
      weight: set.weight,
      repetitions: set.repetitions,
      note: set.note || '',
      isDropset: set.isDropset || false,
      isMioset: set.isMioset || false
    });
  };

  const handleUpdateSet = () => {
    if (newSet.weight !== '' && newSet.repetitions !== '') {
      const updatedTimestamp = new Date(
        `${dateTime.date}T${dateTime.time}`
      ).getTime();

      const updatedExercises = exercises.map(ex => {
        if (ex.name === currentExercise.name) {
          return {
            ...ex,
            history: ex.history.map(historySet => {
              if (historySet.timestamp === editingSet.timestamp) {
                return {
                  ...historySet,
                  weight: parseFloat(newSet.weight),
                  repetitions: parseInt(newSet.repetitions),
                  note: newSet.note,
                  timestamp: updatedTimestamp,
                  isDropset: newSet.isDropset || false,
                  isMioset: newSet.isMioset || false
                };
              }
              return historySet;
            }).sort((a, b) => b.timestamp - a.timestamp)
          };
        }
        return ex;
      });

      setExercises(updatedExercises);
      const updatedCurrentExercise = updatedExercises.find(ex => ex.name === currentExercise.name);
      setCurrentExercise(updatedCurrentExercise);
      editingSet = null;
      setNewSet({
        weight: '',
        repetitions: '',
        note: '',
        isDropset: false,
        isMioset: false
      });
    }
  };

  const handleDeleteSet = (set) => {
    const updatedExercises = exercises.map(ex => {
      if (ex.name === currentExercise.name) {
        return {
          ...ex,
          history: ex.history.filter(historySet => historySet.timestamp !== set.timestamp)
        };
      }
      return ex;
    });

    setExercises(updatedExercises);
    const updatedCurrentExercise = updatedExercises.find(ex => ex.name === currentExercise.name);
    setCurrentExercise(updatedCurrentExercise);
  };

  const handleCancelEdit = () => {
    editingSet = null;
    setNewSet({
      weight: '',
      repetitions: '',
      note: '',
      isDropset: false,
      isMioset: false
    });
  };

  const handleAddSet = () => {
    if (newSet.weight !== '' && newSet.repetitions !== '') {
      const now = new Date();
      const timestamp = now.getTime();

      const updatedExercises = exercises.map(ex => {
        if (ex.name === currentExercise.name) {
          const newHistory = [
            {
              weight: parseFloat(newSet.weight),
              repetitions: parseInt(newSet.repetitions),
              note: newSet.note || '',
              timestamp: timestamp,
              isDropset: newSet.isDropset || false,
              isMioset: newSet.isMioset || false
            },
            ...ex.history
          ];

          newHistory.sort((a, b) => b.timestamp - a.timestamp);

          return {
            ...ex,
            history: newHistory
          };
        }
        return ex;
      });

      setExercises(updatedExercises);
      const updatedCurrentExercise = updatedExercises.find(ex => ex.name === currentExercise.name);
      setCurrentExercise(updatedCurrentExercise);
      setNewSet({
        weight: '',
        repetitions: '',
        note: '',
        isDropset: false,
        isMioset: false
      });
    }
  };
</script>

{#if currentExercise}
  <div class="p-4">
    <div class="flex items-center mb-6">
      <button onclick={goToHome} class="mr-2">
        <ArrowLeft size={20} />
      </button>
      <h1 class="text-xl font-bold">{currentExercise.name}</h1>
    </div>

    <!-- One Rep Max Calculator Section - Compact Version -->
    <div class="bg-white p-3 rounded-lg shadow mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <Dumbbell size={16} class="mr-1 text-black-500 mr-2" />
          <span class="text-sm font-medium">Estimated 1RM:</span>
        </div>

        {#if currentOneRM}
          <div class="text-sm italic">{Math.round(currentOneRM)} kg</div>
        {:else if recentOneRMData}
          <div class="text-sm italic">{Math.round(recentOneRMData.oneRM)} kg</div>
        {:else}
          <div class="text-xs text-gray-300 italic">Add weight & reps to calculate</div>
        {/if}
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <h2 class="text-lg font-semibold mb-3">
        {editingSet ? 'Edit Set' : 'Add New Set'}
      </h2>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-sm text-gray-600">Weight (kg)</label>
          <input
            type="number"
            value={newSet.weight}
            oninput={(e) => setNewSet({...newSet, weight: e.target.value})}
            class="w-full p-2 border rounded-md"
            step="0.5"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-600">Reps</label>
          <input
            type="number"
            value={newSet.repetitions}
            oninput={(e) => setNewSet({...newSet, repetitions: e.target.value})}
            class="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      <!-- Date and time controls - only visible when editing -->
      {#if editingSet}
        <div class="mb-3">
          <label class="block text-sm text-gray-600 flex items-center">
            <Calendar size={16} class="mr-1" /> Date
          </label>
          <input
            type="date"
            value={dateTime.date}
            oninput={(e) => dateTime = {...dateTime, date: e.target.value}}
            class="w-full p-2 border rounded-md"
          />
        </div>

        <div class="mb-3">
          <label class="block text-sm text-gray-600 flex items-center">
            <Clock size={16} class="mr-1" /> Time
          </label>
          <input
            type="time"
            value={dateTime.time}
            oninput={(e) => dateTime = {...dateTime, time: e.target.value}}
            class="w-full p-2 border rounded-md"
          />
        </div>
      {/if}

      <div class="mb-3">
        <label class="block text-sm text-gray-600">Notes</label>
        <input
          type="text"
          value={newSet.note}
          oninput={(e) => setNewSet({...newSet, note: e.target.value})}
          class="w-full p-2 border rounded-md"
          placeholder="Optional"
        />
      </div>

      <div class="flex gap-2 mb-3">
        <button
          type="button"
          onclick={() => setNewSet({...newSet, isDropset: !newSet.isDropset, isMioset: false})}
          class="flex-1 py-2 rounded-md font-bold text-sm transition-colors {newSet.isDropset ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}"
        >
          D
        </button>
        <button
          type="button"
          onclick={() => setNewSet({...newSet, isMioset: !newSet.isMioset, isDropset: false})}
          class="flex-1 py-2 rounded-md font-bold text-sm transition-colors {newSet.isMioset ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}"
        >
          M
        </button>
      </div>

      {#if editingSet}
        <div class="grid grid-cols-2 gap-3">
          <button
            onclick={handleCancelEdit}
            class="py-2 px-4 bg-gray-300 text-gray-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onclick={handleUpdateSet}
            disabled={newSet.weight === '' || newSet.repetitions === '' || !dateTime.date || !dateTime.time}
            class="py-2 px-4 rounded-md {
              newSet.weight === '' || newSet.repetitions === '' || !dateTime.date || !dateTime.time
                ? 'bg-gray-300 text-gray-500'
                : 'bg-blue-500 text-white'
            }"
          >
            Update
          </button>
        </div>
      {:else}
        <button
          onclick={handleAddSet}
          disabled={newSet.weight === '' || newSet.repetitions === ''}
          class="w-full py-2 rounded-md {
            newSet.weight === '' || newSet.repetitions === ''
              ? 'bg-gray-300 text-gray-500'
              : 'bg-blue-500 text-white'
          }"
        >
          Add Set
        </button>
      {/if}
    </div>

    <SetHistory
      history={currentExercise.history}
      onEditSet={handleEditSet}
      onDeleteSet={handleDeleteSet}
    />
  </div>
{/if}
