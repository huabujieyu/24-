import React from 'react';
import { CardType } from '../types';

interface CardProps {
  card: CardType;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const Card: React.FC<CardProps> = ({ card, isSelected, onClick, disabled }) => {
  // Determine text based on value (J, Q, K check strictly visually, keeping logic numeric)
  const getDisplayText = (val: number, display: string) => {
    // If it's a calculated value (not original 1-13 integer), show the float/int
    if (!card.isOriginal) {
        // Round to 1 decimal if needed
        return Math.round(val * 10) / 10;
    }
    
    // Standard playing cards
    if (val === 1) return 'A';
    if (val === 11) return 'J';
    if (val === 12) return 'Q';
    if (val === 13) return 'K';
    return display;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-32 rounded-xl shadow-md flex items-center justify-center text-3xl font-bold transition-all duration-200
        ${disabled ? 'opacity-0 scale-0 cursor-default' : 'opacity-100 scale-100'}
        ${isSelected 
          ? 'bg-blue-500 text-white -translate-y-2 shadow-lg ring-4 ring-blue-200' 
          : 'bg-white text-gray-800 hover:shadow-lg active:scale-95 border border-gray-200'}
      `}
    >
      <span className="select-none">
        {getDisplayText(card.value, card.displayValue)}
      </span>
      
      {/* Corner decoration for classic card feel */}
      <div className={`absolute top-1 left-2 text-xs opacity-50 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
        {getDisplayText(card.value, card.displayValue)}
      </div>
      <div className={`absolute bottom-1 right-2 text-xs opacity-50 rotate-180 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
        {getDisplayText(card.value, card.displayValue)}
      </div>
    </button>
  );
};

export default Card;