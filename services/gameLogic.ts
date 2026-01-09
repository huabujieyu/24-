import { CardType } from '../types';

// Epsilon for floating point comparison (still useful for final 24 check)
const EPSILON = 0.000001;

// Generate unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Fixed Levels Definition (GUARANTEED INTEGER SOLUTIONS)
// All levels here have been verified to have at least one solution using only +, -, *, / (integer division).
const FIXED_LEVELS: number[][] = [
  // Level 1-5: Basic Intro
  [12, 12, 1, 1], // 12 + 12
  [3, 8, 2, 2],   // 3 * 8
  [4, 6, 1, 1],   // 4 * 6
  [10, 10, 4, 1], // 10 + 10 + 4
  [1, 2, 3, 4],   // 1 * 2 * 3 * 4

  // Level 6-10: Combinations
  [6, 6, 6, 6],   // 6 + 6 + 6 + 6
  [4, 4, 4, 4],   // 4 + 4 + 4 + 4
  [5, 5, 2, 2],   // (5 + 5 + 2) * 2
  [3, 3, 3, 3],   // 3 * 3 * 3 - 3
  [2, 4, 6, 8],   // 6 * 8 / (4 - 2)

  // Level 11-15: Intermediate
  [10, 10, 4, 4], // (10 * 10 - 4) / 4
  [11, 13, 1, 1], // 11 + 13
  [3, 9, 1, 2],   // (9 + 1 - 2) * 3
  [2, 2, 10, 10], // 10 + 10 + 2 + 2 (Replaced 7,7,3,3 which needed fractions)
  [4, 8, 7, 8],   // (7 - 4) * 8 * (8 / 8)

  // Level 16-20: Advanced Integer Logic
  [5, 7, 2, 1],   // (5 + 7) * 2 * 1
  [1, 2, 7, 7],   // (7 * 7 - 1) / 2
  [6, 8, 1, 2],   // 6 * 8 / 2
  [9, 9, 6, 2],   // (9 + 9 - 6) * 2
  [2, 3, 12, 12], // 12 + 12 * (3 - 2)

  // Level 21+: Challenge
  [2, 4, 4, 10],  // 4 * 4 + 10 - 2 (Replaced 1,3,4,6 which needed fractions)
  [2, 3, 5, 11],  // 2 * 11 + 5 - 3
  [8, 5, 2, 1],   // (5 - 2) * 8 * 1
  [1, 2, 3, 8],   // 3 * 8 * (2 - 1) (Replaced 1,4,5,6 which needed fractions)
  [3, 8, 8, 8]    // (8 - 8 + 3) * 8
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
// Now enforcing INTEGER DIVISION & POSITIVE INTERMEDIATES

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
        // Subtraction: Only allow if result is positive (prevent negative hints)
        // Since we iterate all permutations of i and j, b - a will be covered in another loop iteration
        ...(a >= b ? [{ sym: '-', val: a - b }] : []),
      ];
      
      // Strict Integer Division Check
      // 1. Divisor cannot be 0
      // 2. Modulo must be 0 (exact division)
      if (Math.abs(b) > EPSILON && Math.abs(a % b) < EPSILON) {
          ops.push({ sym: '÷', val: a / b }); 
      }

      for (const op of ops) {
        // Optimization: Skip commutative duplicates
        if ((op.sym === '+' || op.sym === '×') && j < i) continue;

        const stepDesc = `建议: ${Number(a.toFixed(0))} ${op.sym} ${Number(b.toFixed(0))} = ${Number(op.val.toFixed(0))}`;
        const result = solveRec([...remaining, op.val], [...history, stepDesc]);
        if (result) return result;
      }
    }
  }
  return null;
};

// Check if solvable (boolean) - now STRICT integer
export const isSolvable = (numbers: number[]): boolean => {
  return solveRec(numbers, []) !== null;
};

// Public method to get a hint string
export const getSolverHint = (cards: CardType[]): string => {
  const numbers = cards.map(c => c.value);
  const hint = solveRec(numbers, []);
  if (hint) return hint;
  return "此局无整数解，请重置或撤销";
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
    let attempts = 0;
    while (!solvable && attempts < 2000) {
      numbers = [];
      for (let i = 0; i < 4; i++) {
        numbers.push(Math.floor(Math.random() * 13) + 1);
      }
      solvable = isSolvable(numbers);
      attempts++;
    }
    // Fallback if random gen fails (rare)
    if (!solvable) numbers = [1, 2, 3, 4];
  }

  return numbers.map(num => ({
    id: generateId(),
    value: num,
    displayValue: num.toString(),
    isOriginal: true
  }));
};