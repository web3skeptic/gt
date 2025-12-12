import { initialExercises, initialActiveExercises } from '../utils/initialData.js';

// Load initial data from localStorage
function loadFromStorage(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
}

// Create reactive state using Svelte 5 runes
export const exercises = $state(loadFromStorage('exercises', initialExercises));
export const activeExercises = $state(loadFromStorage('activeExercises', initialActiveExercises));
export const page = $state('home');
export const currentExercise = $state(null);
export const newExerciseName = $state('');
export const newSet = $state({
  weight: '',
  repetitions: '',
  note: ''
});

// Save to localStorage whenever data changes
$effect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('exercises', JSON.stringify(exercises));
  }
});

$effect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('activeExercises', JSON.stringify(activeExercises));
  }
});
