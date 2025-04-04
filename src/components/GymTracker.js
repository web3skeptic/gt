import React, { useState, useEffect } from 'react';

// Utility functions to replace date-fns
const formatDate = (date, formatString) => {
  const d = new Date(date);
  switch(formatString) {
    case 'yyyy-MM-dd':
      return d.toISOString().split('T')[0];
    case 'd':
      return d.getDate().toString();
    case 'MMMM yyyy':
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    case 'MMMM d, yyyy':
      return d.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
    default:
      return d.toString();
  }
};

const startOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const eachDayOfInterval = ({ start, end }) => {
  const days = [];
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

// Calculate volume (weight × reps)
const calculateVolume = (set) => {
  const weight = parseFloat(set.weight) || 0;
  const reps = parseInt(set.repetitions) || 0;
  return weight * reps;
};

// Calculate total volume for an exercise
const calculateTotalVolume = (sets) => {
  return sets.reduce((total, set) => total + calculateVolume(set), 0);
};

// Predefined exercises
const PREDEFINED_EXERCISES = [
  { title: 'Dumbbell Curls', slug: 'dumbbell-curls' },
  { title: 'Bench Press', slug: 'bench-press' },
  { title: 'Squats', slug: 'squats' },
  { title: 'Deadlifts', slug: 'deadlifts' },
  { title: 'Shoulder Press', slug: 'shoulder-press' },
  { title: 'Lunges', slug: 'lunges' }
];

// Main App Component
const GymTracker = () => {
  // Fixed: Initialize with current day instead of next day
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exercises, setExercises] = useState({});
  const [customExercises, setCustomExercises] = useState([]);
  const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false);
  const [newCustomExercise, setNewCustomExercise] = useState('');
  // Add state for confirming custom exercise deletion
  const [customExerciseToDelete, setCustomExerciseToDelete] = useState(null);

  // Load exercises and custom exercises from local storage on mount
  useEffect(() => {
    const storedExercises = localStorage.getItem('gymTrackerExercises');
    if (storedExercises) {
      setExercises(JSON.parse(storedExercises));
    }
    
    const storedCustomExercises = localStorage.getItem('gymTrackerCustomExercises');
    if (storedCustomExercises) {
      setCustomExercises(JSON.parse(storedCustomExercises));
    }
  }, []);

  // Save exercises to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('gymTrackerExercises', JSON.stringify(exercises));
  }, [exercises]);

  // Save custom exercises to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('gymTrackerCustomExercises', JSON.stringify(customExercises));
  }, [customExercises]);

  // Generate calendar days for the current month
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Check if a day has exercises
  const hasDayExercises = (day) => {
    const dateKey = formatDate(day, 'yyyy-MM-dd');
    return !!exercises[dateKey];
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    setSelectedDate(day);
  };

  // Add a new custom exercise
  const addCustomExercise = () => {
    if (newCustomExercise.trim()) {
      const slug = newCustomExercise.toLowerCase().replace(/\s+/g, '-');
      const newExercise = { title: newCustomExercise, slug };
      setCustomExercises([...customExercises, newExercise]);
      setNewCustomExercise('');
      setShowCustomExerciseForm(false);
    }
  };

  // Handle confirming custom exercise deletion
  const confirmDeleteCustomExercise = (index) => {
    setCustomExerciseToDelete(index);
  };

  // Delete custom exercise after confirmation
  const deleteCustomExercise = () => {
    if (customExerciseToDelete !== null) {
      setCustomExercises(customExercises.filter((_, i) => i !== customExerciseToDelete));
      setCustomExerciseToDelete(null);
    }
  };

  // Cancel custom exercise deletion
  const cancelDeleteCustomExercise = () => {
    setCustomExerciseToDelete(null);
  };

  // Export exercises to JSON
  const exportExercises = () => {
    const dataStr = JSON.stringify(exercises, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `gym-tracker-export-${formatDate(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Gym Tracker</h1>
      
      {/* Calendar View */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {calendarDays.map((day) => (
          <button
            key={day.toString()}
            onClick={() => handleDateSelect(day)}
            className={`
              p-2 border rounded 
              ${formatDate(day, 'yyyy-MM-dd') === formatDate(selectedDate, 'yyyy-MM-dd') 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 hover:bg-green-100'}
              ${hasDayExercises(day) ? 'border-green-300' : 'border-gray-200'}
              ${day > new Date() ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={day > new Date()}
          >
            {formatDate(day, 'd')}
          </button>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="flex justify-between mb-4">
        <button 
          onClick={() => setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1))}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          ⬅️
        </button>
        <h2 className="text-xl font-semibold">
          {formatDate(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          onClick={() => setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1))}
          className="px-4 py-2 bg-green-500 text-white rounded"
          disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
        >
          ➡️
        </button>
      </div>

      {/* Exercise Input Section */}
      <ExerciseInput 
        selectedDate={selectedDate} 
        exercises={exercises}
        setExercises={setExercises}
        predefinedExercises={[...PREDEFINED_EXERCISES, ...customExercises]}
      />

      {/* Custom Exercise Section */}
      <div className="mt-4 bg-gray-50 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-green-600">Custom Exercises</h3>
          <button 
            onClick={() => setShowCustomExerciseForm(!showCustomExerciseForm)}
            className="px-4 py-1 bg-green-500 text-white rounded text-sm"
          >
            {showCustomExerciseForm ? '❌' : 'Add New Exercise'}
          </button>
        </div>
        
        {showCustomExerciseForm && (
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="Enter exercise name"
              value={newCustomExercise}
              onChange={(e) => setNewCustomExercise(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button 
              onClick={addCustomExercise}
              disabled={!newCustomExercise.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
        
        {customExercises.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {customExercises.map((exercise, index) => (
              <div key={index} className="bg-white p-2 rounded shadow">
                {exercise.title}
                <button
                  onClick={() => confirmDeleteCustomExercise(index)}
                  className="ml-2 text-red-500 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog for Custom Exercise Deletion */}
        {customExerciseToDelete !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full">
              <h4 className="text-lg font-semibold mb-2">Confirm Delete</h4>
              <p className="mb-4">Are you sure you want to delete "{customExercises[customExerciseToDelete]?.title}"?</p>
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={cancelDeleteCustomExercise}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteCustomExercise}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <button 
        onClick={exportExercises}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Export Exercises
      </button>
    </div>
  );
};

// Exercise Input Component
const ExerciseInput = ({ selectedDate, exercises, setExercises, predefinedExercises }) => {
  const [newExercise, setNewExercise] = useState({
    title: '',
    sets: [{ weight: '', repetitions: '', note: '' }]
  });
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  // Add state for exercise to be deleted and confirmation
  const [exerciseToDelete, setExerciseToDelete] = useState(null);

  // Add a new set to the exercise
  const addSet = () => {
    if (editingExercise) {
      const updatedSets = [...editingExercise.sets, { weight: '', repetitions: '', note: '' }];
      setEditingExercise({...editingExercise, sets: updatedSets});
    } else {
      setNewExercise(prev => ({
        ...prev,
        sets: [...prev.sets, { weight: '', repetitions: '', note: '' }]
      }));
    }
  };

  // Update a specific set
  const updateSet = (index, field, value) => {
    if (editingExercise) {
      const newSets = [...editingExercise.sets];
      newSets[index][field] = value;
      setEditingExercise({...editingExercise, sets: newSets});
    } else {
      const newSets = [...newExercise.sets];
      newSets[index][field] = value;
      setNewExercise(prev => ({ ...prev, sets: newSets }));
    }
  };

  // Remove a set
  const removeSet = (index) => {
    if (editingExercise) {
      const newSets = editingExercise.sets.filter((_, i) => i !== index);
      setEditingExercise({...editingExercise, sets: newSets});
    } else {
      const newSets = newExercise.sets.filter((_, i) => i !== index);
      setNewExercise(prev => ({ ...prev, sets: newSets }));
    }
  };

  // Start editing an exercise
  const startEditingExercise = (dateKey, index) => {
    setEditingExerciseIndex(index);
    setEditingExercise({...exercises[dateKey][index]});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingExercise(null);
    setEditingExerciseIndex(null);
  };

  // Save edited exercise
  const saveEditedExercise = () => {
    const dateKey = formatDate(selectedDate, 'yyyy-MM-dd');
    
    setExercises(prev => {
      const updatedExercises = [...prev[dateKey]];
      updatedExercises[editingExerciseIndex] = editingExercise;
      
      return {
        ...prev,
        [dateKey]: updatedExercises
      };
    });
    
    setEditingExercise(null);
    setEditingExerciseIndex(null);
  };

  // Save new exercise
  const saveExercise = () => {
    const dateKey = formatDate(selectedDate, 'yyyy-MM-dd');
    const exerciseToSave = {
      ...newExercise,
      executionDate: selectedDate.getTime(),
      slug: newExercise.title.toLowerCase().replace(/\s+/g, '-')
    };

    setExercises(prev => ({
      ...prev,
      [dateKey]: prev[dateKey] 
        ? [...prev[dateKey], exerciseToSave] 
        : [exerciseToSave]
    }));

    // Reset form
    setNewExercise({
      title: '',
      sets: [{ weight: '', repetitions: '', note: '' }]
    });
  };

  // Prompt for confirmation before deleting
  const confirmDeleteExercise = (dateKey, index) => {
    setExerciseToDelete({ dateKey, index });
  };

  // Cancel exercise deletion
  const cancelDeleteExercise = () => {
    setExerciseToDelete(null);
  };

  // Delete an entire exercise after confirmation
  const deleteExercise = () => {
    if (exerciseToDelete) {
      const { dateKey, index } = exerciseToDelete;
      
      setExercises(prev => {
        const updatedDateExercises = prev[dateKey].filter((_, i) => i !== index);
        const updatedExercises = { ...prev };
        
        if (updatedDateExercises.length === 0) {
          delete updatedExercises[dateKey];
        } else {
          updatedExercises[dateKey] = updatedDateExercises;
        }
        
        return updatedExercises;
      });
      
      setExerciseToDelete(null);
    }
  };

  const dateKey = formatDate(selectedDate, 'yyyy-MM-dd');
  const isEditing = editingExercise !== null;

  return (
    <div className="bg-gray-50 p-4 rounded">
      <h3 className="text-xl font-semibold mb-4 text-green-600">
        Log Exercise for {formatDate(selectedDate, 'MMMM d, yyyy')}
      </h3>
      
      {!isEditing && (
        <>
          {/* Exercise Selection */}
          <select
            value={newExercise.title}
            onChange={(e) => setNewExercise(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-2 mb-4 border rounded"
          >
            <option value="">Select Exercise</option>
            {predefinedExercises.map(ex => (
              <option key={ex.slug} value={ex.title}>{ex.title}</option>
            ))}
          </select>

          {/* Sets Input */}
          {newExercise.sets.map((set, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between mb-1">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={set.weight}
                  onChange={(e) => updateSet(index, 'weight', e.target.value)}
                  className="w-1/3 p-1 border rounded"
                />
                <input
                  type="number"
                  placeholder="Repetitions"
                  value={set.repetitions}
                  onChange={(e) => updateSet(index, 'repetitions', e.target.value)}
                  className="w-1/3 p-1 border rounded"
                />
                <button
                  onClick={() => removeSet(index)}
                  className="bg-red-500 text-white px-2 rounded"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                placeholder="Note (optional)"
                value={set.note}
                onChange={(e) => updateSet(index, 'note', e.target.value)}
                className="w-full p-1 border rounded"
              />
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-4">
            <button 
              onClick={addSet}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              ➕️
            </button>
            <button 
              onClick={saveExercise}
              disabled={!newExercise.title}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              💾
            </button>
          </div>
        </>
      )}

      {isEditing && (
        <>
          <h4 className="font-semibold mb-2">Editing: {editingExercise.title}</h4>
          
          {editingExercise.sets.map((set, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between mb-1">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={set.weight}
                  onChange={(e) => updateSet(index, 'weight', e.target.value)}
                  className="w-1/3 p-1 border rounded"
                />
                <input
                  type="number"
                  placeholder="Repetitions"
                  value={set.repetitions}
                  onChange={(e) => updateSet(index, 'repetitions', e.target.value)}
                  className="w-1/3 p-1 border rounded"
                />
                <button
                  onClick={() => removeSet(index)}
                  className="bg-red-500 text-white px-2 rounded"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                placeholder="Note (optional)"
                value={set.note}
                onChange={(e) => updateSet(index, 'note', e.target.value)}
                className="w-full p-1 border rounded"
              />
            </div>
          ))}

          <div className="flex space-x-2 mt-4">
            <button 
              onClick={addSet}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              ➕️
            </button>
            <button 
              onClick={saveEditedExercise}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              💾
            </button>
            <button 
              onClick={cancelEditing}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              ❌
            </button>
          </div>
        </>
      )}

      {/* Existing Exercises for the Day */}
      {exercises[dateKey] && !isEditing && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2 text-green-600">
            Existing Exercises
          </h4>
          {exercises[dateKey].map((exercise, exIndex) => (
            <div key={exIndex} className="bg-white p-3 rounded shadow mb-2">
              <div className="flex justify-between">
                <h5 className="font-bold">{exercise.title}</h5>
                <div>
                  <button 
                    onClick={() => startEditingExercise(dateKey, exIndex)}
                    className="text-blue-500 mr-2"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => confirmDeleteExercise(dateKey, exIndex)}
                    className="text-red-500"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {exercise.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex space-x-2 mt-1">
                  {set.weight}<span>kg</span>
                  <span>x</span>
                  {set.repetitions}
                  {set.note && <span>Note: {set.note}</span>}
                </div>
              ))}
              <div className="mt-1 text-xs text-gray-500">
                Volume: {calculateTotalVolume(exercise.sets).toFixed(1)} kg
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Exercise Deletion */}
      {exerciseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full">
            <h4 className="text-lg font-semibold mb-2">Confirm Delete</h4>
            <p className="mb-4">Are you sure you want to delete this exercise?</p>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={cancelDeleteExercise}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={deleteExercise}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymTracker;