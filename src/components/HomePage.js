import React from 'react';
import ExerciseCard from './common/ExerciseCard';

const HomePage = ({ activeExercises, exercises, goToExercise, goToManageExercises }) => {
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
  const exercisesWithLastSet = activeExercises
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
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gym Tracker</h1>
        <button 
          onClick={goToManageExercises} 
          className="px-3 py-1 bg-gray-200 rounded-md text-sm"
        >
          Manage
        </button>
      </div>
      
      {activeExercises.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No active exercises</p>
          <button 
            onClick={goToManageExercises} 
            className="px-4 py-2 bg-blue-500 text-white rounded-md"
          >
            Add Exercises
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exercisesWithLastSet.map(({ name, lastSet, daysAgo }) => (
            <ExerciseCard 
              key={name}
              name={name}
              lastSet={lastSet}
              lastPerformed={daysAgo}
              onClick={() => goToExercise(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;