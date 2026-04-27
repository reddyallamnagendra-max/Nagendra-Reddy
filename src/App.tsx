/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('snake-high-score');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Update high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  // --- Game Logic Helpers ---
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Ensure food doesn't spawn on the snake
      const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    setFood({ x: 5, y: 5 });
    setDirection('UP');
    setNextDirection('UP');
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeed(INITIAL_SPEED);
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'arrowdown':
        case 's':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'arrowleft':
        case 'a':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'arrowright':
        case 'd':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
        case ' ':
          if (!isGameOver) setIsPaused(p => !p);
          else resetGame();
          break;
        case 'r':
          resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isGameOver]);

  // --- Game Loop ---
  useEffect(() => {
    if (isPaused || isGameOver) return;

    const moveSnake = () => {
      setDirection(nextDirection);
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };

        switch (nextDirection) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Check Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check Food Collision
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
          setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [isPaused, isGameOver, nextDirection, food, speed, generateFood, direction]);

  // --- Rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.shadowBlur = isHead ? 15 : 5;
      ctx.shadowColor = '#00ff41';
      ctx.fillStyle = isHead ? '#00ff41' : '#008f11';
      
      // Rounded rectangles for segments
      const padding = 1;
      const size = cellSize - padding * 2;
      ctx.fillRect(
        segment.x * cellSize + padding,
        segment.y * cellSize + padding,
        size,
        size
      );
    });

    // Draw Food
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff3131';
    ctx.fillStyle = '#ff3131';
    const foodPadding = 4;
    const foodSize = cellSize - foodPadding * 2;
    ctx.beginPath();
    ctx.arc(
        food.x * cellSize + cellSize / 2,
        food.y * cellSize + cellSize / 2,
        foodSize / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [snake, food]);

  return (
    <div className="w-full flex items-center justify-center p-4 min-h-screen bg-[#0F1110]">
      <div className="w-[1024px] h-[768px] bg-[#0F1110] text-[#00FF41] font-mono flex flex-col items-center justify-center overflow-hidden p-10 relative">
        {/* App Container */}
        <div className="w-full h-full border-[8px] border-[#00FF41] flex flex-row shadow-[0_0_20px_rgba(0,255,65,0.2)] bg-[#050505]">
          {/* Sidebar / Info Panel */}
          <div className="w-[300px] border-r-4 border-[#00FF41] flex flex-col bg-[#0F1110]">
            <div className="p-8 border-b-4 border-[#00FF41]">
              <h1 className="text-4xl font-bold tracking-tighter">SNAKE_OS</h1>
              <p className="text-xs mt-2 opacity-60">SYSTEM VERSION 1.0.4</p>
            </div>
            
            <div className="p-8 flex flex-col gap-10 flex-grow">
              <div className="space-y-2">
                <span className="text-xs flex items-center gap-2 opacity-50 uppercase tracking-widest">
                  <Zap size={12} className="text-[#00FF41]" />
                  Score
                </span>
                <div className="text-6xl font-bold leading-none flicker-fast">{score.toString().padStart(4, '0')}</div>
              </div>

              <div className="space-y-2">
                <span className="text-xs block opacity-50 uppercase tracking-widest">High Score</span>
                <div className="text-3xl font-bold opacity-80 leading-none">{highScore.toString().padStart(4, '0')}</div>
              </div>

              <div className="mt-auto space-y-6">
                <div className="space-y-3">
                  <span className="text-xs block opacity-50 uppercase tracking-widest">Controls</span>
                  <div className="grid grid-cols-3 gap-2 text-center w-32 border-[#00FF41]/20">
                    <div className={`col-start-2 border border-[#00FF41] py-1 ${(nextDirection === 'UP') ? 'bg-[#00FF41] text-black' : ''}`}>W</div>
                    <div className={`col-start-1 row-start-2 border border-[#00FF41] py-1 ${(nextDirection === 'LEFT') ? 'bg-[#00FF41] text-black' : ''}`}>A</div>
                    <div className={`col-start-2 row-start-2 border border-[#00FF41] py-1 ${(nextDirection === 'DOWN') ? 'bg-[#00FF41] text-black' : ''}`}>S</div>
                    <div className={`col-start-3 row-start-2 border border-[#00FF41] py-1 ${(nextDirection === 'RIGHT') ? 'bg-[#00FF41] text-black' : ''}`}>D</div>
                  </div>
                </div>
                <div className="text-[10px] leading-tight opacity-40 uppercase">
                  PRESS [SPACE] TO PAUSE<br />
                  PRESS [R] TO RESTART
                </div>
              </div>
            </div>
          </div>

          {/* Game Field */}
          <div className="flex-grow bg-[#050505] relative flex items-center justify-center p-8 group overflow-hidden">
            {/* Aesthetic Scanline Effect Overlay (Dense) */}
            <div className="absolute inset-0 pointer-events-none opacity-10 z-30" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00FF41 3px)' }}></div>
            
            {/* Wall Proximity Alerts */}
            <div className="absolute top-0 left-0 p-2 text-[10px] opacity-20 z-10">SEC_GRID_ACTIVE</div>
            <div className={`absolute bottom-0 right-0 p-2 text-[10px] z-10 transition-opacity ${isGameOver ? 'opacity-100 text-[#FF3131] flicker-fast' : 'opacity-20'}`}>
              PROXIMITY_ALERT
            </div>

            {/* Game Canvas Container */}
            <div className="relative w-[500px] h-[500px] border border-[#1a1a1a]">
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full h-full block"
              />

          {/* Overlays */}
          <AnimatePresence>
            {(isPaused || isGameOver) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-40"
                  >
                    {isGameOver ? (
                      <div className="space-y-6">
                        <h2 className="text-4xl font-black text-[#FF3131] uppercase tracking-widest flicker">Crash_Detected</h2>
                        <div className="h-0.5 w-full bg-[#FF3131]/30"></div>
                        <button 
                          onClick={resetGame}
                          className="bg-[#00FF41] text-black px-10 py-3 font-bold uppercase tracking-widest hover:invert transition-all shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                        >
                          REINITIALIZE
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <h2 className="text-4xl font-black uppercase tracking-widest text-[#00FF41]">Paused</h2>
                        <div className="h-0.5 w-full bg-[#00FF41]/30"></div>
                        <button 
                          onClick={() => setIsPaused(false)}
                          className="bg-[#00FF41] text-black px-10 py-3 font-bold uppercase tracking-widest hover:invert transition-all shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                        >
                          UPLINK
                        </button>
                      </div>
                    )}
                  </motion.div>
            )}
          </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="w-full mt-4 flex justify-between items-center px-2 text-[10px] tracking-[0.2em] opacity-30">
          <div className="flex items-center gap-2">
            <Activity size={10} className="animate-pulse" />
            KERNEL_STATUS: {isGameOver ? 'HALTED' : 'NOMINAL'}
          </div>
          <div>FRAME_RATE: {speed < 100 ? '90FPS' : '60FPS'}</div>
          <div>INPUT_MODE: KEYBOARD_V1</div>
        </div>
      </div>
    </div>
  );
}
