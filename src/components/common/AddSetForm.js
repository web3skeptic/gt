import React from 'react';

const AddSetForm = ({ newSet, setNewSet, addSet }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-3">Add New Set</h2>
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
      <button 
        onClick={addSet}
        disabled={newSet.weight === '' || newSet.repetitions === ''}
        className={`w-full py-2 rounded-md ${
          newSet.weight === '' || newSet.repetitions === ''
            ? 'bg-gray-300 text-gray-500'
            : 'bg-blue-500 text-white'
        }`}
      >
        Add Set
      </button>
    </div>
  );
};

export default AddSetForm;