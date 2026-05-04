<script>
  import { ArrowLeft, Calendar, Clock, Dumbbell, Timer, X, Play } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
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

  const DEFAULT_BODYWEIGHT_KG = 75;

  // Detect whether this exercise is bodyweight-only (all sets have weight === 0)
  const isBodyweightExercise = $derived(
    currentExercise.history &&
    currentExercise.history.length > 0 &&
    currentExercise.history.every(set => !set.weight || set.weight === 0)
  );

  // Estimate the user's bodyweight from recorded sets across all exercises.
  // Uses the median of all non-zero weights logged as a rough proxy.
  // Falls back to DEFAULT_BODYWEIGHT_KG when no data is available.
  const estimatedBodyweight = $derived(() => {
    const weights = [];
    exercises.forEach(ex => {
      if (!ex.history) return;
      ex.history.forEach(set => {
        if (set.weight > 0 && set.repetitions > 0) {
          weights.push(set.weight);
        }
      });
    });
    if (weights.length === 0) return DEFAULT_BODYWEIGHT_KG;
    weights.sort((a, b) => a - b);
    const mid = Math.floor(weights.length / 2);
    return weights.length % 2 !== 0
      ? weights[mid]
      : (weights[mid - 1] + weights[mid]) / 2;
  });

  // Calculate estimated one-rep max using Brzycki formula.
  // Reps are capped at 10 — sets with more than 10 reps are treated as 10.
  // For bodyweight exercises (weight === 0) the effective load is the
  // estimated bodyweight so reps still produce a meaningful 1RM.
  const calculateOneRepMax = (weight, reps) => {
    if (reps <= 0) return null;
    const effectiveWeight = (weight > 0) ? weight : estimatedBodyweight();
    if (effectiveWeight <= 0) return null;
    const effectiveReps = Math.min(reps, 10);
    return effectiveWeight * (36 / (37 - effectiveReps));
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
      if (!set.repetitions || set.repetitions <= 0) return;
      if (set.timestamp < cutoffTime) return;

      const oneRM = calculateOneRepMax(set.weight || 0, set.repetitions);
      if (oneRM && oneRM > bestOneRM) {
        bestOneRM = oneRM;
        bestSet = set;
      }
    });

    return bestSet ? {
      oneRM: bestOneRM,
      weight: bestSet.weight || 0,
      reps: bestSet.repetitions,
      isBodyweight: isBodyweightExercise
    } : null;
  };

  // Get the current theoretical 1RM if form values are valid
  const getCurrentOneRepMax = () => {
    const weight = parseFloat(newSet.weight);
    const reps = parseInt(newSet.repetitions);

    // Allow weight === 0 for bodyweight exercises — use bodyweight as the load
    if (reps > 0 && (weight > 0 || (newSet.weight === '0' || newSet.weight === 0))) {
      return calculateOneRepMax(weight || 0, reps);
    }
    return null;
  };

  const recentOneRMData = $derived(getRecentOneRepMax());
  const currentOneRM = $derived(getCurrentOneRepMax());

  // Rest timer — counts down to 0 after each new set
  const DEFAULT_TIMER_SECONDS = 180;
  let timerRemaining = $state(0); // seconds left; 0 = idle
  let timerIntervalId = null;
  let timerEndAt = 0;

  const clearTimerInterval = () => {
    if (timerIntervalId !== null) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  };

  // Brief audible + haptic signal when the timer hits zero
  const signalDone = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const beep = (offsetSec, freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offsetSec);
          gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offsetSec + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offsetSec + 0.35);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + offsetSec);
          osc.stop(ctx.currentTime + offsetSec + 0.4);
        };
        beep(0, 880);
        beep(0.45, 880);
        beep(0.9, 1175);
        setTimeout(() => ctx.close(), 1500);
      }
    } catch {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };

  const tickTimer = () => {
    const remaining = Math.max(0, Math.round((timerEndAt - Date.now()) / 1000));
    timerRemaining = remaining;
    if (remaining === 0) {
      clearTimerInterval();
      signalDone();
    }
  };

  const startTimer = (seconds = DEFAULT_TIMER_SECONDS) => {
    clearTimerInterval();
    timerEndAt = Date.now() + seconds * 1000;
    timerRemaining = seconds;
    timerIntervalId = setInterval(tickTimer, 250);
  };

  const cancelTimer = () => {
    clearTimerInterval();
    timerRemaining = 0;
  };

  const adjustTimer = (deltaSeconds) => {
    if (timerRemaining === 0) return;
    timerEndAt += deltaSeconds * 1000;
    tickTimer();
  };

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  onDestroy(clearTimerInterval);

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
      startTimer();
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
          <div class="text-sm italic">
            {Math.round(currentOneRM)} kg
            {#if isBodyweightExercise}<span class="text-xs text-gray-400">(bodyweight)</span>{/if}
          </div>
        {:else if recentOneRMData}
          <div class="text-sm italic">
            {Math.round(recentOneRMData.oneRM)} kg
            {#if recentOneRMData.isBodyweight}<span class="text-xs text-gray-400">(bodyweight)</span>{/if}
          </div>
        {:else}
          <div class="text-xs text-gray-300 italic">Add reps to calculate</div>
        {/if}
      </div>
    </div>

    <!-- Rest Timer -->
    <div class="bg-white p-4 rounded-lg shadow mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <Timer size={18} class={timerRemaining > 0 ? 'text-blue-500' : 'text-gray-500'} />
          <span class="text-sm font-medium">Rest timer</span>
        </div>
        <div class="text-3xl font-mono font-semibold tabular-nums {timerRemaining > 0 ? 'text-blue-600' : 'text-gray-400'}">
          {formatTimer(timerRemaining > 0 ? timerRemaining : DEFAULT_TIMER_SECONDS)}
        </div>
      </div>

      {#if timerRemaining > 0}
        <div class="grid grid-cols-3 gap-2">
          <button
            onclick={() => adjustTimer(-30)}
            class="py-2 px-3 bg-gray-200 text-gray-800 rounded-md font-medium"
          >
            −30s
          </button>
          <button
            onclick={cancelTimer}
            class="py-2 px-3 bg-red-500 text-white rounded-md font-medium flex items-center justify-center gap-1"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onclick={() => adjustTimer(30)}
            class="py-2 px-3 bg-gray-200 text-gray-800 rounded-md font-medium"
          >
            +30s
          </button>
        </div>
      {:else}
        <button
          onclick={() => startTimer()}
          class="w-full py-2 px-3 bg-blue-500 text-white rounded-md font-medium flex items-center justify-center gap-1"
        >
          <Play size={16} /> Start
        </button>
      {/if}
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
