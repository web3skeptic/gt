import React from 'react';
import { ChevronRight } from 'lucide-react';

const ExerciseCard = ({ name, lastPerformed, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">{lastPerformed}</span>
          <h2 className="font-medium text-lg">{name}</h2>
        </div>
      </div>
      <ChevronRight className="text-gray-400" />
    </div>
  );
};

export default ExerciseCard;