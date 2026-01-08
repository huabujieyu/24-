import { CardType } from '../types';

// Epsilon for floating point comparison
const EPSILON = 0.000001;

// Generate unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Fixed Levels Definition
const FIXED_LEVELS: number[][] = [
  // 1-5: Very Easy
  [12, 12, 1, 1],
  [3, 8, 2, 2],
  [4, 6, 1, 1],
  [10, 10, 4, 1],
  [5, 5, 5, 9],
  
  // 6-10: Easy
  [2, 3, 4, 1],
  [2, 2, 10, 2],
  [7, 3, 3, 7],
  [9, 9, 6, 1],
  [11, 13, 1, 1],

  // 11-20: Intermediate
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [3, 3, 8, 8],
  [4, 4, 10, 10],
  [1, 5, 5, 5],
  [2, 4, 10, 10], 
  [1, 4, 5, 6],
  [1, 3, 4, 6],
  [2, 3, 5, 12],
  [6, 10, 12, 13],

  // 21+: Harder
  [3, 3, 7, 7],
  [1, 3, 9, 10],
  [4, 4, 7, 7],
  [5, 5, 5, 1],
  [8, 8, 3, 3],
];

export const calculateResult = (a: number, b: number, op: string): number => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
    default: return 0;
  }
};

// --- Local Solver Logic (The Optimized "AI") ---

type OperationStep = {
  a: number;
  b: number;
  op: string;
  result: number;
  desc: string;
};

// Recursively find a solution string
const solveRec = (nums: number[], history: string[]): string | null => {
  if (nums.length === 1) {
    if (Math.abs(nums[0] - 24) < EPSILON) {
      // Return the first step of the successful path
      return history.length > 0 ? history[0] : null;
    }
    return null;
  }

  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;

      const a = nums[i];
      const b = nums[j];
      const remaining = nums.filter((_, index) => index !== i && index !== j);

      const ops = [
        { sym: '+', val: a + b },
        { sym: '×', val: a * b },
        { sym: '-', val: a - b }, // a - b
        // Division (prevent divide by zero)
      ];
      
      if (Math.abs(b) > EPSILON) ops.push({ sym: '÷', val: a / b }); // a / b

      for (const op of ops) {
        // Optimization: Skip commutative duplicates (e.g., b+a if we did a+b)
        if ((op.sym === '+' || op.sym === '×') && j < i) continue;

        const stepDesc = `建议: ${Number(a.toFixed(2))} ${op.sym} ${Number(b.toFixed(2))} = ${Number(op.val.toFixed(2))}`;
        const result = solveRec([...remaining, op.val], [...history, stepDesc]);
        if (result) return result;
      }
    }
  }
  return null;
};

// Check if solvable (boolean) - kept for generation logic
export const isSolvable = (numbers: number[]): boolean => {
  return solveRec(numbers, []) !== null;
};

// Public method to get a hint string
export const getSolverHint = (cards: CardType[]): string => {
  const numbers = cards.map(c => c.value);
  const hint = solveRec(numbers, []);
  if (hint) return hint;
  return "这个局面似乎无解，试试重置或撤销？";
};

// Generate 4 numbers
export const generateProblem = (levelIndex?: number): CardType[] => {
  let numbers: number[] = [];

  // Use fixed level if available
  if (levelIndex !== undefined && levelIndex > 0 && levelIndex <= FIXED_LEVELS.length) {
    numbers = [...FIXED_LEVELS[levelIndex - 1]];
  } else {
    // Random Generation
    let solvable = false;
    while (!solvable) {
      numbers = [];
      for (let i = 0; i < 4; i++) {
        numbers.push(Math.floor(Math.random() * 13) + 1);
      }
      solvable = isSolvable(numbers);
    }
  }

  return numbers.map(num => ({
    id: generateId(),
    value: num,
    displayValue: num.toString(),
    isOriginal: true
  }));
};