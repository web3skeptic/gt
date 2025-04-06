import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import AddSetForm from './common/AddSetForm';
import SetHistory from './common/SetHistory';

const ExercisePage = ({ 
  currentExercise, 
  goToHome,
  exercises,
  setExercises,
  setCurrentExercise, 
  newSet, 
  setNewSet, 
  addSet 
}) => {
  const [editingSet, setEditingSet] = useState(null);
  const [dateTime, setDateTime] = useState({
    date: '',
    time: ''
  });

  useEffect(() => {
    // Initialize with current date and time when adding a new set
    if (!editingSet) {
      const now = new Date();
      setDateTime({
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5)
      });
    } else {
      // Set date and time from the editing set
      const editDate = new Date(editingSet.timestamp);
      setDateTime({
        date: editDate.toISOString().split('T')[0],
        time: editDate.toTimeString().split(' ')[0].substring(0, 5)
      });
    }
  }, [editingSet]);

  if (!currentExercise) return null;
  
  const handleEditSet = (set) => {
    setEditingSet(set);
    setNewSet({
      weight: set.weight,
      repetitions: set.repetitions,
      note: set.note || ''
    });
  };

  const handleUpdateSet = () => {
    if (newSet.weight !== '' && newSet.repetitions !== '') {
      // Create a new timestamp based on the selected date and time
      const updatedTimestamp = new Date(
        `${dateTime.date}T${dateTime.time}`
      ).getTime();

      const updatedExercises = exercises.map(ex => {
        if (ex.name === currentExercise.name) {
          return {
            ...ex,
            history: ex.history.map(historySet => {
              // Update the specific set with matching timestamp
              if (historySet.timestamp === editingSet.timestamp) {
                return {
                  ...historySet,
                  weight: parseFloat(newSet.weight),
                  repetitions: parseInt(newSet.repetitions),
                  note: newSet.note,
                  timestamp: updatedTimestamp // Update the timestamp
                };
              }
              return historySet;
            }).sort((a, b) => b.timestamp - a.timestamp) // Sort after updates
          };
        }
        return ex;
      });
      
      setExercises(updatedExercises);
      const updatedCurrentExercise = updatedExercises.find(ex => ex.name === currentExercise.name);
      setCurrentExercise(updatedCurrentExercise);
      setEditingSet(null);
      setNewSet({
        weight: '',
        repetitions: '',
        note: ''
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
    setEditingSet(null);
    setNewSet({
      weight: '',
      repetitions: '',
      note: ''
    });
  };

  // Modified addSet function that uses current date and time
  const handleAddSet = () => {
    if (newSet.weight !== '' && newSet.repetitions !== '') {
      // Create a timestamp using the current date and time
      const now = new Date();
      const timestamp = now.getTime();
      
      const updatedExercises = exercises.map(ex => {
        if (ex.name === currentExercise.name) {
          const newHistory = [
            {
              weight: parseFloat(newSet.weight),
              repetitions: parseInt(newSet.repetitions),
              note: newSet.note || '',
              timestamp: timestamp
            },
            ...ex.history
          ];
          
          // Sort by timestamp (newest first)
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
        note: ''
      });
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button onClick={goToHome} className="mr-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">{currentExercise.name}</h1>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">
          {editingSet ? 'Edit Set' : 'Add New Set'}
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-600">Weight (kg)</label>
            <input 
              type="number" 
              value={newSet.weight}
              onChange={e => setNewSet({...newSet, weight: e.target.value})}
              className="w-full p-2 border rounded-md"
              step="0.5"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Reps</label>
            <input 
              type="number" 
              value={newSet.repetitions}
              onChange={e => setNewSet({...newSet, repetitions: e.target.value})}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        {/* Date and time controls - only visible when editing */}
        {editingSet && (
          <>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 flex items-center">
                <Calendar size={16} className="mr-1" /> Date
              </label>
              <input 
                type="date" 
                value={dateTime.date}
                onChange={e => setDateTime({...dateTime, date: e.target.value})}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm text-gray-600 flex items-center">
                <Clock size={16} className="mr-1" /> Time
              </label>
              <input 
                type="time" 
                value={dateTime.time}
                onChange={e => setDateTime({...dateTime, time: e.target.value})}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </>
        )}
        
        <div className="mb-3">
          <label className="block text-sm text-gray-600">Notes</label>
          <input 
            type="text" 
            value={newSet.note}
            onChange={e => setNewSet({...newSet, note: e.target.value})}
            className="w-full p-2 border rounded-md"
            placeholder="Optional"
          />
        </div>
        
        {editingSet ? (
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleCancelEdit}
              className="py-2 px-4 bg-gray-300 text-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateSet}
              disabled={newSet.weight === '' || newSet.repetitions === '' || !dateTime.date || !dateTime.time}
              className={`py-2 px-4 rounded-md ${
                newSet.weight === '' || newSet.repetitions === '' || !dateTime.date || !dateTime.time
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-blue-500 text-white'
              }`}
            >
              Update
            </button>
          </div>
        ) : (
          <button 
            onClick={handleAddSet}
            disabled={newSet.weight === '' || newSet.repetitions === ''}
            className={`w-full py-2 rounded-md ${
              newSet.weight === '' || newSet.repetitions === ''
                ? 'bg-gray-300 text-gray-500'
                : 'bg-blue-500 text-white'
            }`}
          >
            Add Set
          </button>
        )}
      </div>
      <SetHistory 
        history={currentExercise.history} 
        onEditSet={handleEditSet}
        onDeleteSet={handleDeleteSet}
      />
    </div>
  );
};

export default ExercisePage;