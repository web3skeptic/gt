import React, { useState } from 'react';
import { formatDate, getDateString } from '../../utils/formatters';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';

const SetHistory = ({ history, onEditSet, onDeleteSet }) => {
  const [activeItem, setActiveItem] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  
  if (history.length === 0) {
    return <p className="text-gray-500 text-center py-4">No sets recorded yet</p>;
  }

  // Format time (hours, minutes, seconds)
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Calculate volume for a set (weight × reps)
  const calculateSetVolume = (set) => {
    return set.weight * set.repetitions;
  };

  // Toggle active item on click
  const toggleActiveItem = (setId) => {
    setActiveItem(activeItem === setId ? null : setId);
  };

  // Group sets by date
  const groupedSets = Object.entries(
    history.reduce((groups, set) => {
      const dateKey = getDateString(set.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(set);
      return groups;
    }, {})
  )
  .sort((a, b) => new Date(b[0]) - new Date(a[0])); // Sort dates in descending order

  return (
    <div className="space-y-6 relative">
      {/* Delete Confirmation Dialog */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4 shadow-lg">
            <div className="flex items-center mb-4 text-amber-600">
              <AlertTriangle className="mr-2" size={24} />
              <h3 className="font-bold text-lg">Confirm Deletion</h3>
            </div>
            <p className="mb-6">
              Are you sure you want to delete this set of {deleteConfirmation.weight} kg × {deleteConfirmation.repetitions} reps?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 bg-gray-200 rounded-md"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-red-500 text-white rounded-md"
                onClick={() => {
                  onDeleteSet(deleteConfirmation);
                  setDeleteConfirmation(null);
                  setActiveItem(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {groupedSets.map(([dateString, sets]) => {
        // Check if all sets for this day have 0 weight
        const allZeroWeight = sets.every(set => set.weight === 0);
        
        // Calculate total volume for the day (in reps if all zero weight, otherwise in kg)
        const totalDayVolume = sets.reduce((total, set) => {
          if (allZeroWeight) {
            // Sum reps for zero-weight exercises
            return total + set.repetitions;
          } else {
            // Calculate volume as weight × reps for exercises with weight
            return total + calculateSetVolume(set);
          }
        }, 0);

        return (
          <div key={dateString} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-100 p-2 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-700">{formatDate(sets[0].timestamp)}</h3>
              <div className="text-sm text-gray-600">
                Vol: {totalDayVolume.toFixed(0)} {allZeroWeight ? 'reps' : 'kg'}
              </div>
            </div>
            <div className="divide-y">
              {sets.map((set, idx) => {
                const setId = `${dateString}-${idx}`;
                const isActive = activeItem === setId;
                
                return (
                  <div key={setId} className="relative">
                    {/* Main content */}
                    <div 
                      className={`p-3 bg-white cursor-pointer transition-all duration-200 ${isActive ? 'bg-gray-50' : ''}`}
                      onClick={() => toggleActiveItem(setId)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {set.weight === 0 ? 
                            `${set.repetitions} reps` : 
                            `${set.weight} kg × ${set.repetitions} reps`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(set.timestamp)}
                        </div>
                      </div>
                      {set.note && <p className="text-sm text-gray-600 mt-1">{set.note}</p>}
                    </div>
                    
                    {/* Action buttons - visible only when active */}
                    {isActive && (
                      <div className="flex justify-end p-2 bg-gray-50 border-t">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSet(set);
                            setActiveItem(null);
                          }}
                          className="p-2 bg-blue-500 text-white rounded-md mr-2 flex items-center"
                        >
                          <Edit size={16} className="mr-1" />
                          <span>Edit</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation(set);
                          }}
                          className="p-2 bg-red-500 text-white rounded-md flex items-center"
                        >
                          <Trash2 size={16} className="mr-1" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SetHistory;