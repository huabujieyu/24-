import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, AppView, UserProgress, GameState, CardType, Operator } from './types';
import { generateProblem, generateId, calculateResult } from './services/gameLogic';
import { getAIHint } from './services/geminiService';
import { playSound } from './services/soundService';
import Card from './components/Card';
import Controls from './components/Controls';
import { Brain, Trophy, Zap, Settings, ChevronLeft, Star, Trash2, Volume2, BookOpen, X, Check, Infinity as InfinityIcon } from 'lucide-react';

const INITIAL_PROGRESS: UserProgress = {
  maxLevel: 1,
  blitzRecord: 0,
  endlessRecord: 0,
  currency: 100,
  unlockedSkins: ['default'],
  activeSkin: 'default',
  achievements: [],
  soundEnabled: true
};

const HINT_COST = 20;

function App() {
  // --- Global State ---
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem('zen24_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
            ...INITIAL_PROGRESS, 
            ...parsed,
            blitzRecord: parsed.blitzRecord || 0,
            endlessRecord: parsed.endlessRecord || 0
        };
      }
    } catch (e) {
      console.error("Failed to load progress", e);
    }
    return INITIAL_PROGRESS;
  });

  // --- Game Session State ---
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    history: [],
    selectedCardId: null,
    selectedOperator: null,
    targetCardId: null,
    level: 1,
    score: 0,
    timeLeft: 60,
    isWon: false,
    historyLog: []
  });
  
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LEVEL);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('zen24_progress', JSON.stringify(progress));
  }, [progress]);

  // --- Game Logic: Start ---
  const startGame = (mode: GameMode) => {
    playSound('tap', progress.soundEnabled);
    setGameMode(mode);
    
    // Determine starting level
    let startLevel = 1;
    if (mode === GameMode.LEVEL) startLevel = progress.maxLevel;
    
    // Initial deal
    const newCards = generateProblem(mode === GameMode.LEVEL ? startLevel : undefined);
    
    setGameState({
      cards: newCards,
      history: [],
      selectedCardId: null,
      selectedOperator: null,
      targetCardId: null,
      level: startLevel,
      score: 0,
      timeLeft: mode === GameMode.BLITZ ? 60 : 0,
      isWon: false,
      historyLog: []
    });
    setHintMessage(null);
    setShowWinModal(false);
    setView(AppView.GAME);
  };

  const nextLevel = () => {
    playSound('tap', progress.soundEnabled);
    
    // Update Records based on Mode (Using CURRENT COMPLETED level)
    // gameState.level is the level we just WON.
    if (gameMode === GameMode.LEVEL) {
        const nextLvl = gameState.level + 1;
        if (nextLvl > progress.maxLevel) {
            setProgress(p => ({ ...p, maxLevel: nextLvl }));
        }
    } else if (gameMode === GameMode.ENDLESS) {
        if (gameState.level > progress.endlessRecord) {
             setProgress(p => ({ ...p, endlessRecord: gameState.level }));
        }
    } else if (gameMode === GameMode.BLITZ) {
        // For Blitz, we also update record on every level pass to be safe
        if (gameState.level > progress.blitzRecord) {
             setProgress(p => ({ ...p, blitzRecord: gameState.level }));
        }
    }

    const nextLvlNum = gameState.level + 1;
    const newCards = generateProblem(gameMode === GameMode.LEVEL ? nextLvlNum : undefined);
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      history: [],
      selectedCardId: null,
      selectedOperator: null,
      targetCardId: null,
      level: nextLvlNum,
      isWon: false,
      historyLog: [],
      // Reset time to 60s for Blitz mode
      timeLeft: gameMode === GameMode.BLITZ ? 60 : 0
    }));
    setHintMessage(null);
    setShowWinModal(false);
  };

  // --- Game Logic: Exit ---
  const handleExitGame = () => {
    // Check and Save Records on Exit
    // IMPORTANT: Record is "Completed Levels", so we use (current level - 1)
    // If I am on Level 1 and exit, record is 0.
    const completedLevel = Math.max(0, gameState.level - 1);

    if (gameMode === GameMode.BLITZ) {
      if (completedLevel > progress.blitzRecord) {
        setProgress(p => ({ ...p, blitzRecord: completedLevel }));
      }
    } else if (gameMode === GameMode.ENDLESS) {
      if (completedLevel > progress.endlessRecord) {
        setProgress(p => ({ ...p, endlessRecord: completedLevel }));
      }
    }
    
    setView(AppView.HOME);
  };

  // --- Game Logic: Interaction ---
  const handleCardClick = (id: string) => {
    if (gameState.isWon) return;

    if (!gameState.selectedCardId) {
      playSound('tap', progress.soundEnabled);
      setGameState(prev => ({ ...prev, selectedCardId: id }));
      return;
    }

    if (gameState.selectedCardId === id) {
      playSound('tap', progress.soundEnabled);
      setGameState(prev => ({ ...prev, selectedCardId: null, selectedOperator: null }));
      return;
    }

    if (gameState.selectedCardId && gameState.selectedOperator) {
      executeMove(gameState.selectedCardId, gameState.selectedOperator, id);
    } else {
      playSound('tap', progress.soundEnabled);
      setGameState(prev => ({ ...prev, selectedCardId: id }));
    }
  };

  const handleOperatorClick = (op: Operator) => {
    if (!gameState.selectedCardId || gameState.isWon) return;
    playSound('operate', progress.soundEnabled);
    setGameState(prev => ({ ...prev, selectedOperator: op }));
  };

  const executeMove = (id1: string, op: Operator, id2: string) => {
    const card1 = gameState.cards.find(c => c.id === id1);
    const card2 = gameState.cards.find(c => c.id === id2);
    
    if (!card1 || !card2) return;

    // --- Strict Integer Division Check ---
    if (op === Operator.DIVIDE) {
        if (card2.value === 0 || Math.abs(card1.value % card2.value) > 0.0001) {
            playSound('error', progress.soundEnabled);
            setHintMessage("只能进行整除运算！");
            setTimeout(() => setHintMessage(null), 1500);
            return; // Abort move
        }
    }

    const resultValue = calculateResult(card1.value, card2.value, op);
    
    const newCard: CardType = {
      id: generateId(),
      value: resultValue,
      displayValue: resultValue.toString(),
      isOriginal: false
    };

    const newCards = gameState.cards.filter(c => c.id !== id1 && c.id !== id2);
    newCards.push(newCard);

    // Simplified history log
    const logEntry = `${Math.round(card1.value)} ${op} ${Math.round(card2.value)} = ${Math.round(resultValue)}`;

    let won = false;
    if (newCards.length === 1 && Math.abs(newCards[0].value - 24) < 0.001) {
      won = true;
      playSound('win', progress.soundEnabled);
      handleWin();
    } else {
      playSound('merge', progress.soundEnabled);
    }

    setGameState(prev => ({
      ...prev,
      history: [...prev.history, prev.cards],
      cards: newCards,
      selectedCardId: null,
      selectedOperator: null,
      historyLog: [...prev.historyLog, logEntry],
      isWon: won
    }));
  };

  const handleUndo = () => {
    if (gameState.history.length === 0 || gameState.isWon) return;
    playSound('undo', progress.soundEnabled);

    const previousCards = gameState.history[gameState.history.length - 1];
    const newHistory = gameState.history.slice(0, -1);
    const newLog = gameState.historyLog.slice(0, -1);

    setGameState(prev => ({
      ...prev,
      cards: previousCards,
      history: newHistory,
      historyLog: newLog,
      selectedCardId: null,
      selectedOperator: null,
      isWon: false
    }));
  };

  const handleReset = () => {
     if (gameState.history.length === 0) return;
     playSound('reset', progress.soundEnabled);
     setGameState(prev => ({
         ...prev,
         cards: prev.history.length > 0 ? prev.history[0] : prev.cards,
         history: [],
         historyLog: [],
         selectedCardId: null,
         selectedOperator: null
     }));
  };

  const handleWin = () => {
    const reward = gameMode === GameMode.BLITZ ? 10 : 20;
    setProgress(p => ({ ...p, currency: p.currency + reward }));
    setTimeout(() => setShowWinModal(true), 600);
  };

  const handleHint = async () => {
    if (isHintLoading) return;
    playSound('tap', progress.soundEnabled);

    if (progress.currency < HINT_COST) {
      setHintMessage("智力点不足！");
      playSound('error', progress.soundEnabled);
      setTimeout(() => setHintMessage(null), 2000);
      return;
    }
    
    setIsHintLoading(true);
    setHintMessage("思考中..."); 
    
    try {
      const hint = await getAIHint(gameState.cards);
      setProgress(p => ({ ...p, currency: p.currency - HINT_COST }));
      playSound('merge', progress.soundEnabled); 
      setHintMessage(hint);
    } catch (e) {
      setHintMessage("获取提示失败");
      playSound('error', progress.soundEnabled);
    } finally {
      setIsHintLoading(false);
    }
  };

  useEffect(() => {
    if (gameMode !== GameMode.BLITZ || view !== AppView.GAME || gameState.isWon || gameState.timeLeft <= 0) return;

    const timer = setInterval(() => {
      setGameState(p => {
        const newTime = p.timeLeft - 1;
        if (newTime <= 0) {
           // Time out logic: Record is p.level - 1 (Completed levels)
           const completedLevels = Math.max(0, p.level - 1);
           if (completedLevels > progress.blitzRecord) {
             setProgress(prog => ({ ...prog, blitzRecord: completedLevels }));
           }
        }
        return { ...p, timeLeft: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameMode, view, gameState.isWon, gameState.timeLeft, progress.blitzRecord]);


  // --- Render Functions ---

  const renderHome = () => (
    // Changed: h-[100dvh] to prevent scrolling, reduced padding and gaps
    <div className="flex flex-col h-[100dvh] items-center justify-center p-4 space-y-4 bg-gray-50 text-gray-800 relative overflow-hidden">
      <div className="text-center space-y-1 mb-2">
        <h1 className="text-4xl font-bold tracking-tighter text-indigo-600">24点</h1>
        <p className="text-gray-500 font-light text-lg tracking-widest">算数大师</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button 
          onClick={() => startGame(GameMode.LEVEL)}
          className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center gap-4 group active:scale-98"
        >
          <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
            <Trophy size={20} />
          </div>
          <div className="text-left">
            <div className="font-bold text-base">关卡模式</div>
            <div className="text-xs text-gray-500">第 {progress.maxLevel} 关</div>
          </div>
        </button>

        <button 
           onClick={() => startGame(GameMode.BLITZ)}
           className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-orange-300 transition-all flex items-center gap-4 group active:scale-98"
        >
          <div className="bg-orange-100 p-2 rounded-full text-orange-600 group-hover:scale-110 transition-transform">
            <Zap size={20} />
          </div>
          <div className="text-left">
            <div className="font-bold text-base">极速挑战</div>
            <div className="text-xs text-orange-500 font-medium">纪录: {progress.blitzRecord}</div>
          </div>
        </button>

        <button 
           onClick={() => startGame(GameMode.ENDLESS)}
           className="w-full bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex items-center gap-4 group active:scale-98"
        >
          <div className="bg-teal-100 p-2 rounded-full text-teal-600 group-hover:scale-110 transition-transform">
            <InfinityIcon size={20} />
          </div>
          <div className="text-left">
            <div className="font-bold text-base">无尽模式</div>
            <div className="text-xs text-teal-600 font-medium">纪录: {progress.endlessRecord}</div>
          </div>
        </button>
      </div>

      {/* Bottom Navigation: Closer to content */}
      <div className="w-full max-w-xs px-8 pt-4 flex justify-between text-gray-400">
        <button onClick={() => setShowRulesModal(true)} className="flex flex-col items-center gap-1 hover:text-indigo-600 active:scale-95 transition-all">
          <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
            <BookOpen size={20} />
          </div>
          <span className="text-[10px] font-medium">规则</span>
        </button>

        <button onClick={() => setView(AppView.SETTINGS)} className="flex flex-col items-center gap-1 hover:text-indigo-600 active:scale-95 transition-all">
          <div className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Settings size={20} />
          </div>
          <span className="text-[10px] font-medium">设置</span>
        </button>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl relative">
            <button 
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="text-indigo-500" /> 游戏规则
            </h2>
            <div className="space-y-3 text-sm text-gray-600 overflow-y-auto max-h-[50vh] pr-2">
              <p>使用加、减、乘、除运算，将 4 张牌计算为 <span className="font-bold text-indigo-600">24</span>。</p>
              <div className="bg-orange-50 p-2 rounded border border-orange-100 text-xs text-orange-800 font-bold">
                 注意：本游戏仅支持整数运算，不能出现分数或小数。
              </div>

              {/* Added Card Values Table */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2">牌面数值</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between border-b pb-1"><span>A</span> <span className="font-mono font-bold">1</span></div>
                  <div className="flex justify-between border-b pb-1"><span>2 - 10</span> <span className="font-mono font-bold">数字本身</span></div>
                  <div className="flex justify-between border-b pb-1"><span>J (Jack)</span> <span className="font-mono font-bold">11</span></div>
                  <div className="flex justify-between border-b pb-1"><span>Q (Queen)</span> <span className="font-mono font-bold">12</span></div>
                  <div className="flex justify-between"><span>K (King)</span> <span className="font-mono font-bold">13</span></div>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>点击一张牌选中。</li>
                <li>点击底部的运算符。</li>
                <li>点击另一张牌计算。</li>
              </ol>
            </div>
            <button 
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold mt-2 active:scale-95 transition-transform"
            >
              明白了
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-[100dvh] bg-slate-50 relative">
      <div className="flex items-center p-4 bg-white shadow-sm">
        <button onClick={() => setView(AppView.HOME)} className="p-2 -ml-2 text-gray-500 hover:text-gray-800">
          <ChevronLeft />
        </button>
        <span className="font-bold text-lg text-gray-800 ml-2">设置</span>
      </div>
      
      <div className="p-6 space-y-4">
        <button 
          onClick={() => {
            setProgress(p => ({ ...p, soundEnabled: !p.soundEnabled }));
            if (!progress.soundEnabled) playSound('tap', true); 
          }}
          className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3 text-gray-700">
             <Volume2 size={20} className={progress.soundEnabled ? 'text-indigo-600' : 'text-gray-400'} />
             <span>游戏音效</span>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${progress.soundEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}>
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${progress.soundEnabled ? 'left-5' : 'left-1'}`}></div>
          </div>
        </button>

        <button 
          onClick={() => {
             if(confirm("确定要重置所有进度吗？")) {
                const resetState = { ...INITIAL_PROGRESS, soundEnabled: progress.soundEnabled }; 
                setProgress(resetState);
                playSound('reset', true);
                alert("进度已重置");
             }
          }}
          className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors active:scale-[0.98]"
        >
           <Trash2 size={20} />
           <span>重置游戏进度</span>
        </button>

        <div className="text-center text-gray-400 text-xs mt-10">
          版本 v1.4.2 (Fixes)
        </div>
      </div>
    </div>
  );

  const renderGame = () => (
    // Changed: h-[100dvh] and flex layout adjustments for compaction
    <div className="flex flex-col h-[100dvh] bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="flex-none flex justify-between items-center px-4 py-3 bg-white shadow-sm z-10">
        <button onClick={handleExitGame} className="p-1 text-gray-500 hover:text-gray-800">
          <ChevronLeft />
        </button>
        
        <div className="flex flex-col items-center leading-tight">
          {gameMode === GameMode.LEVEL && <span className="font-bold text-gray-700 text-sm">第 {gameState.level} 关</span>}
          {gameMode === GameMode.ENDLESS && <span className="font-bold text-teal-600 text-sm">无尽模式 {gameState.level}</span>}
          {gameMode === GameMode.BLITZ && (
             <span className={`font-mono font-bold text-lg ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
               {gameState.timeLeft}s
             </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full text-yellow-700 font-bold text-xs">
          <Star size={12} fill="currentColor" />
          {progress.currency}
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col relative justify-between w-full max-w-md mx-auto">
        
        {/* Logic Chain: Smaller height */}
        <div className="flex-none h-10 flex items-center justify-center mt-2">
             <div className="text-gray-400 text-xs font-mono bg-white/50 px-3 py-1 rounded-full">
                {gameState.historyLog.length > 0 ? gameState.historyLog[gameState.historyLog.length - 1] : "请选择一张卡牌"}
             </div>
        </div>

        {/* Middle Area: Cards - Use flex grow to center vertical, remove fixed aspect ratio to fit heights */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-[280px]">
             {gameState.cards.map((card) => (
               <div key={card.id} className="flex justify-center items-center">
                 <Card 
                   card={card}
                   isSelected={gameState.selectedCardId === card.id}
                   onClick={() => handleCardClick(card.id)}
                 />
               </div>
             ))}
          </div>
        </div>

        {/* Hint Overlay */}
        {hintMessage && (
           <div className="absolute top-16 left-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-xl shadow-lg z-20 text-center text-sm animate-in fade-in slide-in-from-top-4 duration-300">
             {hintMessage}
             <button onClick={() => setHintMessage(null)} className="absolute top-1 right-2 text-xs opacity-50 p-1">✕</button>
           </div>
        )}

        {/* Bottom Area: Controls (Compact padding) */}
        <div className="flex-none bg-white rounded-t-3xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)] pt-6 pb-4">
           <Controls 
             onOperatorClick={handleOperatorClick}
             selectedOperator={gameState.selectedOperator}
             onUndo={handleUndo}
             onReset={handleReset}
             onHint={handleHint}
             canUndo={gameState.history.length > 0}
             hintLoading={isHintLoading}
           />
        </div>
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl transform transition-all scale-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-1 shadow-inner">
              <Trophy size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">太棒了！</h2>
            <div className="text-gray-500 text-center text-sm">
              目标达成。 {gameMode === GameMode.BLITZ ? '+10 IP' : '+20 IP'}
            </div>
            <button 
              onClick={nextLevel}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-base shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              下一关
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal (Blitz) */}
      {gameMode === GameMode.BLITZ && gameState.timeLeft <= 0 && (
         <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl">
             <div className="text-3xl">⌛</div>
             <h2 className="text-2xl font-bold text-gray-800">时间到！</h2>
             <p className="text-gray-500 mb-2 text-sm">你达到了第 {gameState.level} 关</p>
             {Math.max(0, gameState.level - 1) === progress.blitzRecord && gameState.level > 1 && (
                 <div className="text-orange-500 font-bold mb-2 animate-bounce">新纪录！</div>
             )}
             <button 
               onClick={() => setView(AppView.HOME)}
               className="w-full py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300"
             >
               返回主菜单
             </button>
           </div>
         </div>
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-gray-100 font-sans select-none">
      <div className="h-full max-w-md mx-auto bg-white shadow-2xl relative">
        {view === AppView.HOME && renderHome()}
        {view === AppView.GAME && renderGame()}
        {view === AppView.SETTINGS && renderSettings()}
      </div>
    </div>
  );
}

export default App;
