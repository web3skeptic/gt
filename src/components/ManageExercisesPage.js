import React from 'react';
import { ArrowLeft, Plus, Trash2, Download, Upload } from 'lucide-react';

const ManageExercisesPage = ({ 
  goToHome, 
  goToAddExercise, 
  exercises, 
  activeExercises, 
  toggleActiveExercise, 
  deleteExercise,
  setExercises,
  setActiveExercises
}) => {
  // Function to export data as JSON file
  const handleExportData = () => {
    const data = {
      exercises: exercises,
      activeExercises: activeExercises
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gym-tracker-data.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  // Function to import data from JSON file
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.exercises && Array.isArray(data.exercises)) {
          setExercises(data.exercises);
          localStorage.setItem('exercises', JSON.stringify(data.exercises));
        }
        
        if (data.activeExercises && Array.isArray(data.activeExercises)) {
          setActiveExercises(data.activeExercises);
          localStorage.setItem('activeExercises', JSON.stringify(data.activeExercises));
        }
        
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    // Reset the input value so the same file can be selected again
    event.target.value = null;
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button onClick={goToHome} className="mr-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Manage Exercises</h1>
      </div>
      
      <div className="mb-6 space-y-2">
        {/* Data import/export buttons */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleExportData} 
            className="flex items-center px-3 py-2 bg-green-500 text-white rounded-md"
          >
            <Download size={16} className="mr-1" />
            Export Data
          </button>
          
          <label className="flex items-center px-3 py-2 bg-purple-500 text-white rounded-md cursor-pointer">
            <Upload size={16} className="mr-1" />
            Import Data
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImportData}
            />
          </label>
        </div>
        
        {/* Add exercise button */}
        <button 
          onClick={goToAddExercise} 
          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md"
        >
          <Plus size={16} className="mr-1" />
          Add New Exercise
        </button>
      </div>
      
      <h2 className="text-lg font-semibold mb-2">Your Exercises</h2>
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
              <button
                onClick={() => deleteExercise(exercise.name)}
                className="text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageExercisesPage;