import React from 'react';
import { Operator } from '../types';
import { Undo, RotateCcw, Lightbulb } from 'lucide-react';

interface ControlsProps {
  onOperatorClick: (op: Operator) => void;
  selectedOperator: Operator | null;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  canUndo: boolean;
  hintLoading: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  onOperatorClick, 
  selectedOperator, 
  onUndo, 
  onReset,
  onHint,
  canUndo,
  hintLoading
}) => {
  const ops = [Operator.ADD, Operator.SUBTRACT, Operator.MULTIPLY, Operator.DIVIDE];

  return (
    <div className="w-full flex flex-col items-center gap-6 pb-8">
      {/* Operators - Thumb Zone */}
      <div className="flex gap-4 sm:gap-6 justify-center w-full px-4">
        {ops.map((op) => (
          <button
            key={op}
            onClick={() => onOperatorClick(op)}
            className={`
              w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-200
              ${selectedOperator === op 
                ? 'bg-indigo-600 text-white scale-110 ring-4 ring-indigo-200' 
                : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95 active:bg-gray-100'}
            `}
          >
            {op}
          </button>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-8 items-center text-gray-500">
        <button 
          onClick={onReset}
          className="flex flex-col items-center gap-1 active:text-indigo-600 transition-colors"
        >
          <div className="p-3 bg-gray-100 rounded-full shadow-sm">
            <RotateCcw size={20} />
          </div>
          <span className="text-xs font-medium">重置</span>
        </button>

        <button 
          onClick={onHint}
          disabled={hintLoading}
          className={`flex flex-col items-center gap-1 transition-colors ${hintLoading ? 'opacity-50' : 'active:text-yellow-500'}`}
        >
          <div className={`p-4 rounded-full shadow-md -mt-4 mb-2 border-4 border-gray-100 ${hintLoading ? 'bg-gray-200' : 'bg-yellow-100 text-yellow-600'}`}>
            <Lightbulb size={24} className={hintLoading ? 'animate-pulse' : ''} />
          </div>
          <span className="text-xs font-medium text-yellow-700">提示 (20 IP)</span>
        </button>

        <button 
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex flex-col items-center gap-1 transition-colors ${!canUndo ? 'opacity-30' : 'active:text-indigo-600'}`}
        >
          <div className="p-3 bg-gray-100 rounded-full shadow-sm">
            <Undo size={20} />
          </div>
          <span className="text-xs font-medium">撤销</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;