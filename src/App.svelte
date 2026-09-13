<script>
  import HomePage from './components/HomePage.svelte';
  import ExercisePage from './components/ExercisePage.svelte';
  import AddExercisePage from './components/AddExercisePage.svelte';
  import ManageExercisesPage from './components/ManageExercisesPage.svelte';
  import MuscleEngagementPage from './components/MuscleEngagementPage.svelte';
  import BodyweightPage from './components/BodyweightPage.svelte';
  import GlobalTimer from './components/GlobalTimer.svelte';
  import { Dumbbell, Activity, Scale, Settings } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { loadAll, snapshot, persist, watchChanges, startSync, stopSync, loadSyncConfig } from './lib/db.js';

  // State using Svelte 5 runes
  let page = $state('home');
  let activeTab = $state('exercises'); // exercises, muscles, body, settings

  // Data lives in the local PouchDB database (see lib/db.js) and is replicated with CouchDB.
  // $state.raw: components always replace these arrays instead of mutating them, and a deep
  // proxy over ~2000 sets makes every snapshot cost seconds.
  let exercises = $state.raw([]);
  let activeExercises = $state.raw([]);
  let bodyweight = $state.raw([]);
  let loaded = $state(false);
  let knownIds = new Set();   // ids of the documents the current model was built from

  let currentExercise = $state(null);
  let newExerciseName = $state('');
  let newExerciseMuscles = $state([]);
  let newSet = $state({
    weight: '',
    repetitions: '',
    note: ''
  });

  // Replace the model with what the database holds (initial load, or after replication).
  const applySnapshot = ({ state, knownIds: ids }) => {
    exercises = state.exercises;
    activeExercises = state.activeExercises;
    bodyweight = state.bodyweight;
    knownIds = ids;
    if (currentExercise) {
      currentExercise = exercises.find(ex => ex.name === currentExercise.name) || currentExercise;
    }
  };

  onMount(() => {
    let feed;
    (async () => {
      applySnapshot(await loadAll());
      loaded = true;
      feed = watchChanges(() => applySnapshot(snapshot()));
      startSync(loadSyncConfig());
    })();
    return () => {
      if (feed) feed.cancel();
      stopSync();
    };
  });

  // Write the model to the database whenever it changes (debounced, one write at a time).
  let persistTimer;
  let persisting = Promise.resolve();
  $effect(() => {
    const model = { exercises, activeExercises, bodyweight }; // reading the three arrays tracks them
    if (!loaded) return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const ids = knownIds;
      persisting = persisting
        .then(() => persist(model, ids))
        .then(({ conflicts }) => { if (conflicts) applySnapshot(snapshot()); })
        .catch(err => console.error('persist failed', err));
    }, 300);
  });

  // Navigation functions
  const goToHome = () => {
    page = 'home';
    activeTab = 'exercises';
    currentExercise = null;
  };

  const goToExercise = (name) => {
    currentExercise = exercises.find(ex => ex.name === name);
    page = 'exercise';
  };

  const goToAddExercise = () => {
    page = 'addExercise';
  };

  const goToManageExercises = () => {
    page = 'manageExercises';
  };

  const setTab = (tab) => {
    activeTab = tab;
    page = 'home';
  };

  // Data manipulation functions
  const addExercise = () => {
    if (newExerciseName.trim()) {
      const exercise = {
        name: newExerciseName.trim(),
        history: [],
        isHidden: false,
        engagedMuscles: newExerciseMuscles
      };

      exercises = [...exercises, exercise];
      activeExercises = [...activeExercises, newExerciseName.trim()];

      newExerciseName = '';
      newExerciseMuscles = [];
      page = 'manageExercises';
    }
  };

  const toggleActiveExercise = (name) => {
    if (activeExercises.includes(name)) {
      activeExercises = activeExercises.filter(n => n !== name);
    } else {
      activeExercises = [...activeExercises, name];
    }
  };

  const deleteExercise = (name) => {
    exercises = exercises.filter(ex => ex.name !== name);
    activeExercises = activeExercises.filter(n => n !== name);
  };

  const setExercises = (newExercises) => {
    exercises = newExercises;
  };

  const setActiveExercises = (newActiveExercises) => {
    activeExercises = newActiveExercises;
  };

  const setBodyweight = (newBodyweight) => {
    bodyweight = newBodyweight;
  };

  const setCurrentExercise = (exercise) => {
    currentExercise = exercise;
  };

  const setNewExerciseName = (name) => {
    newExerciseName = name;
  };

  const setNewExerciseMuscles = (muscles) => {
    newExerciseMuscles = muscles;
  };

  const setNewSet = (set) => {
    newSet = set;
  };
</script>

<div class="min-h-screen bg-gray-100 pb-20">
  {#if !loaded}
    <div class="text-center py-16 text-gray-500">Loading…</div>
  {:else if page === 'home'}
    <!-- Tab Content -->
    <div class="max-w-4xl mx-auto">
      {#if activeTab === 'exercises'}
        <div class="px-4 pt-4">
          <GlobalTimer />
        </div>
        <HomePage
          {activeExercises}
          {exercises}
          {goToExercise}
          {goToManageExercises}
        />
      {:else if activeTab === 'muscles'}
        <MuscleEngagementPage
          {exercises}
          {activeExercises}
          {bodyweight}
        />
      {:else if activeTab === 'body'}
        <BodyweightPage
          {bodyweight}
          {setBodyweight}
        />
      {:else if activeTab === 'settings'}
        <ManageExercisesPage
          {goToHome}
          {goToAddExercise}
          {exercises}
          {activeExercises}
          {bodyweight}
          {toggleActiveExercise}
          {deleteExercise}
          {setExercises}
          {setActiveExercises}
          {setBodyweight}
        />
      {/if}
    </div>

  {:else if page === 'exercise'}
    <ExercisePage
      {currentExercise}
      {setCurrentExercise}
      {exercises}
      {setExercises}
      {goToHome}
      {newSet}
      {setNewSet}
    />
  {:else if page === 'addExercise'}
    <AddExercisePage
      {goToManageExercises}
      {newExerciseName}
      {setNewExerciseName}
      {newExerciseMuscles}
      {setNewExerciseMuscles}
      {addExercise}
    />
  {:else if page === 'manageExercises'}
    <ManageExercisesPage
      {goToHome}
      {goToAddExercise}
      {exercises}
      {activeExercises}
      {toggleActiveExercise}
      {deleteExercise}
      {setExercises}
      {setActiveExercises}
    />
  {/if}

  <!-- Bottom Tab Navigation -->
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
    <div class="max-w-4xl mx-auto flex justify-around">
      <button
        onclick={() => setTab('exercises')}
        class="flex-1 flex flex-col items-center py-3 px-2 transition-colors {
          page === 'home' && activeTab === 'exercises' ? 'text-blue-500' : 'text-gray-500'
        }"
      >
        <Dumbbell size={24} />
        <span class="text-xs mt-1">Exercises</span>
      </button>

      <button
        onclick={() => setTab('muscles')}
        class="flex-1 flex flex-col items-center py-3 px-2 transition-colors {
          page === 'home' && activeTab === 'muscles' ? 'text-blue-500' : 'text-gray-500'
        }"
      >
        <Activity size={24} />
        <span class="text-xs mt-1">Muscles</span>
      </button>

      <button
        onclick={() => setTab('body')}
        class="flex-1 flex flex-col items-center py-3 px-2 transition-colors {
          page === 'home' && activeTab === 'body' ? 'text-blue-500' : 'text-gray-500'
        }"
      >
        <Scale size={24} />
        <span class="text-xs mt-1">Body</span>
      </button>

      <button
        onclick={() => setTab('settings')}
        class="flex-1 flex flex-col items-center py-3 px-2 transition-colors {
          page === 'home' && activeTab === 'settings' ? 'text-blue-500' : 'text-gray-500'
        }"
      >
        <Settings size={24} />
        <span class="text-xs mt-1">Settings</span>
      </button>
    </div>
  </div>
</div>
