import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import ExercisePage from './ExercisePage';
import AddExercisePage from './AddExercisePage';
import ManageExercisesPage from './ManageExercisesPage';
import { initialExercises, initialActiveExercises } from '../utils/initialData';

const GymTrackerApp = () => {
  const [page, setPage] = useState('home');
  const [exercises, setExercises] = useState(() => {
    const savedExercises = localStorage.getItem('exercises');
    return savedExercises ? JSON.parse(savedExercises) : initialExercises;
  });
  
  const [activeExercises, setActiveExercises] = useState(() => {
    const savedActive = localStorage.getItem('activeExercises');
    return savedActive ? JSON.parse(savedActive) : initialActiveExercises;
  });
  
  const [currentExercise, setCurrentExercise] = useState(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newSet, setNewSet] = useState({
    weight: '',
    repetitions: '',
    note: ''
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('exercises', JSON.stringify(exercises));
    localStorage.setItem('activeExercises', JSON.stringify(activeExercises));
  }, [exercises, activeExercises]);

  // Navigation functions
  const goToHome = () => {
    setPage('home');
    setCurrentExercise(null);
  };

  const goToExercise = (name) => {
    setCurrentExercise(exercises.find(ex => ex.name === name));
    setPage('exercise');
  };

  const goToAddExercise = () => {
    setPage('addExercise');
  };

  const goToManageExercises = () => {
    setPage('manageExercises');
  };

  // Data manipulation functions
  const addExercise = () => {
    if (newExerciseName.trim()) {
      const exercise = {
        name: newExerciseName.trim(),
        history: []
      };
      
      setExercises([...exercises, exercise]);
      
      // Automatically add the new exercise to active exercises
      setActiveExercises([...activeExercises, newExerciseName.trim()]);
      
      setNewExerciseName('');
      
      // Stay on the manage exercises page instead of going to home
      setPage('manageExercises');
    }
  };

  const addSet = () => {
    if (newSet.weight !== '' && newSet.repetitions !== '') {
      const updatedExercises = exercises.map(ex => {
        if (ex.name === currentExercise.name) {
          return {
            ...ex,
            history: [
              {
                weight: parseFloat(newSet.weight),
                repetitions: parseInt(newSet.repetitions),
                note: newSet.note,
                timestamp: Date.now()
              },
              ...ex.history
            ]
          };
        }
        return ex;
      });
      
      setExercises(updatedExercises);
      setCurrentExercise(updatedExercises.find(ex => ex.name === currentExercise.name));
      setNewSet({
        weight: '',
        repetitions: '',
        note: ''
      });
    }
  };

  const toggleActiveExercise = (name) => {
    if (activeExercises.includes(name)) {
      setActiveExercises(activeExercises.filter(n => n !== name));
    } else {
      setActiveExercises([...activeExercises, name]);
    }
  };

  const deleteExercise = (name) => {
    setExercises(exercises.filter(ex => ex.name !== name));
    setActiveExercises(activeExercises.filter(n => n !== name));
  };

  // Render the appropriate page
  return (
    <div className="min-h-screen bg-gray-100">
      {page === 'home' && (
        <HomePage 
          activeExercises={activeExercises}
          exercises={exercises}
          goToExercise={goToExercise}
          goToManageExercises={goToManageExercises}
        />
      )}
      
      {page === 'exercise' && (
        <ExercisePage 
          currentExercise={currentExercise}
          setCurrentExercise={setCurrentExercise}
          exercises={exercises}
          setExercises={setExercises}
          goToHome={goToHome}
          newSet={newSet}
          setNewSet={setNewSet}
          addSet={addSet}
        />
      )}
      
      {page === 'addExercise' && (
        <AddExercisePage 
          goToManageExercises={goToManageExercises}
          newExerciseName={newExerciseName}
          setNewExerciseName={setNewExerciseName}
          addExercise={addExercise}
        />
      )}
      
      {page === 'manageExercises' && (
        <ManageExercisesPage 
          goToHome={goToHome}
          goToAddExercise={goToAddExercise}
          exercises={exercises}
          activeExercises={activeExercises}
          toggleActiveExercise={toggleActiveExercise}
          deleteExercise={deleteExercise}
          setExercises={setExercises}
          setActiveExercises={setActiveExercises}
        />
      )}
    </div>
  );
};

export default GymTrackerApp;