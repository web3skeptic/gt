import React from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const ManageExercisesPage = ({ 
  goToHome, 
  goToAddExercise, 
  exercises, 
  activeExercises, 
  toggleActiveExercise, 
  deleteExercise 
}) => {
  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button onClick={goToHome} className="mr-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Manage Exercises</h1>
      </div>
      
      <div className="mb-4 flex justify-end">
        <button 
          onClick={goToAddExercise} 
          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md"
        >
          <Plus size={16} className="mr-1" />
          Add New
        </button>
      </div>
      
      {exercises.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No exercises added yet</p>
      ) : (
        <div className="space-y-2">
          {exercises.map(exercise => (
            <div key={exercise.name} className="flex items-center justify-between p-3 bg-white rounded-md shadow">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={activeExercises.includes(exercise.name)}
                  onChange={() => toggleActiveExercise(exercise.name)}
                  className="mr-3 h-5 w-5"
                />
                <span>{exercise.name}</span>
              </div>
              {/*<button
                onClick={() => deleteExercise(exercise.name)}
                className="text-red-500"
              >
                <Trash2 size={18} />
              </button>*/}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageExercisesPage;