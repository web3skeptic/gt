import React from 'react';
import { ArrowLeft } from 'lucide-react';

const AddExercisePage = ({ 
  goToManageExercises, 
  newExerciseName, 
  setNewExerciseName, 
  addExercise 
}) => {
  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button onClick={goToManageExercises} className="mr-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Add New Exercise</h1>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Exercise Name</label>
          <input 
            type="text" 
            value={newExerciseName}
            onChange={e => setNewExerciseName(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        <button 
          onClick={addExercise}
          disabled={!newExerciseName.trim()}
          className={`w-full py-2 rounded-md ${
            !newExerciseName.trim()
              ? 'bg-gray-300 text-gray-500'
              : 'bg-blue-500 text-white'
          }`}
        >
          Add Exercise
        </button>
      </div>
    </div>
  );
};

export default AddExercisePage;