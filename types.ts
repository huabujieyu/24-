export enum Operator {
  ADD = '+',
  SUBTRACT = '-',
  MULTIPLY = '×',
  DIVIDE = '÷'
}

export interface CardType {
  id: string;
  value: number;
  displayValue: string; // To handle intermediate fractions/decimals visually if needed
  isOriginal: boolean;
}

export enum GameMode {
  LEVEL = 'LEVEL',
  BLITZ = 'BLITZ',
  ENDLESS = 'ENDLESS' // Renamed from ZEN
}

export enum AppView {
  HOME = 'HOME',
  GAME = 'GAME',
  SHOP = 'SHOP',
  SETTINGS = 'SETTINGS'
}

export interface GameState {
  cards: CardType[];
  history: CardType[][]; // For undo
  selectedCardId: string | null;
  selectedOperator: Operator | null;
  targetCardId: string | null;
  level: number;
  score: number; // For Blitz
  timeLeft: number; // For Blitz
  isWon: boolean;
  historyLog: string[]; // "10 + 2 = 12"
}

export interface UserProgress {
  maxLevel: number;
  blitzRecord: number;   // New: High score for Blitz
  endlessRecord: number; // New: High score for Endless
  currency: number;
  unlockedSkins: string[];
  activeSkin: string;
  achievements: string[];
  soundEnabled: boolean;
}