import { useState, useRef, useEffect, useCallback } from "react";

// Drop into client/src/games/MemoryMatrix.jsx
// Same visual family as WhackACircle — dark arena, mint/gold/red accents.
// Currently console.logs the final payload — once your teammate's
// POST /api/game-results endpoint is ready, swap the console.log in
// endGame() for an actual fetch/axios call (see comment near the bottom).
//
// Mongo shape this feeds (per the spec):
//   game_result: { id, assessmentId, gameId, accuracy, score, avgTime, additionalData }
//   session:     { id, startedAt, endedAt, ... }

const SESSION_TIME_LIMIT_MS = 30000; // overall 30-40s window, we land in the middle

const LEVELS = [
  { grid: 3, cells: 3, showMs: 1000 },
  { grid: 3, cells: 4, showMs: 1200 },
  { grid: 4, cells: 5, showMs: 1400 },
  { grid: 4, cells: 6, showMs: 1900 },
  { grid: 5, cells: 8, showMs: 2200 },
];

function pickHighlightedCells(gridSize, count) {
  const pool = Array.from({ length: gridSize * gridSize }, (_, i) => i);
  // Fisher-Yates, then take the first `count` — matches the shuffle-and-slice
  // logic from the spec (cells = [1..9], shuffle, take first N).
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, count));
}

const styles = `
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  background: #0B0F19;
  width: 100%;
  min-height: 100vh;
}

.mm-intro-screen {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background:
    radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.1), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1), transparent 40%),
    #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
}

.mm-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.mm-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 440px;
  margin: 0;
  line-height: 1.6;
}

.mm-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.mm-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.mm-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.mm-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.mm-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.mm-wrap {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  background: #0B0F19;
  min-height: 100vh;
  padding: 32px;
  font-family: 'Inter', -apple-system, sans-serif;
  box-sizing: border-box;
  position: relative;
}

.mm-arena {
  position: relative;
  background:
    radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.08), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.08), transparent 40%),
    #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  overflow: hidden;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  transition: transform 0.05s ease;
}

.mm-arena.shake {
  animation: mm-shake 0.28s ease;
}

@keyframes mm-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.mm-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.mm-flash.on {
  animation: mm-flash 0.35s ease;
}

@keyframes mm-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.mm-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.mm-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.mm-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.mm-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.mm-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.mm-board-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.mm-board {
  display: grid;
  gap: 10px;
}

.mm-cell {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 1px solid #232A3D;
  background: #0B0F19;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.mm-cell:active {
  transform: scale(0.94);
}

.mm-cell.mm-shown {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 18px rgba(52, 211, 153, 0.5);
}

.mm-cell.mm-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.45);
  cursor: default;
}

.mm-cell.mm-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.45);
}

.mm-cell.mm-disabled {
  cursor: default;
}

.mm-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mm-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.mm-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.mm-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.mm-stat .value.score { color: #F59E0B; }
.mm-stat .value.wrong { color: #F87171; }
.mm-stat .value.level { color: #34D399; }

.mm-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.mm-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.mm-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.mm-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.mm-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.mm-center-msg p {
  color: #8B93A7;
  font-size: 14px;
  margin: 0;
  max-width: 340px;
}

.mm-btn {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.mm-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.mm-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.mm-results-grid .label { color: #8B93A7; font-size: 11px; }
.mm-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

const MAX_POSSIBLE_SCORE = LEVELS.reduce((sum, l) => sum + l.cells, 0) * 10; // 260

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) {
    return {
      title: "Room to grow",
    };
  }
  if (pct < 0.7) {
    return {
      title: "Nice memory!",
    };
  }
  return {
    title: "Woah, certified memory machine 🧠",
  };
}

export default function MemoryMatrix({ onComplete }) {
  const [phase, setPhase] = useState("instructions"); // instructions | showing | input | levelBreak | done
  const [levelIndex, setLevelIndex] = useState(0);
  const [highlighted, setHighlighted] = useState(new Set());
  const [correctClicked, setCorrectClicked] = useState(new Set());
  const [wrongClicked, setWrongClicked] = useState(new Set());
  const [correctCellsTotal, setCorrectCellsTotal] = useState(0);
  const [wrongCellsTotal, setWrongCellsTotal] = useState(0);
  const [score, setScore] = useState(0);
  const [highestLevelReached, setHighestLevelReached] = useState(0);
  const [levelTimes, setLevelTimes] = useState([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const levelInputStartRef = useRef(null);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  const beginLevel = useCallback((idx) => {
    const level = LEVELS[idx];
    const cells = pickHighlightedCells(level.grid, level.cells);
    setHighlighted(cells);
    setCorrectClicked(new Set());
    setWrongClicked(new Set());
    setPhase("showing");

    setTimeout(() => {
      levelInputStartRef.current = performance.now();
      setPhase("input");
    }, level.showMs);
  }, []);

  function startGame() {
    endedRef.current = false;
    setLevelIndex(0);
    setScore(0);
    setCorrectCellsTotal(0);
    setWrongCellsTotal(0);
    setHighestLevelReached(0);
    setLevelTimes([]);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    startedAtRef.current = new Date().toISOString();
    beginLevel(0);
  }

  // overall session countdown
  useEffect(() => {
    if (phase === "instructions" || phase === "done") return;
    sessionTickRef.current = setInterval(() => {
      setTimeLeftMs((t) => {
        const next = t - 200;
        if (next <= 0) {
          clearInterval(sessionTickRef.current);
          if (!endedRef.current) {
            endedRef.current = true;
            endGame();
          }
          return 0;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(sessionTickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleCellClick(cellIndex) {
    if (phase !== "input") return;
    if (correctClicked.has(cellIndex) || wrongClicked.has(cellIndex)) return;

    if (highlighted.has(cellIndex)) {
      const nextCorrect = new Set(correctClicked).add(cellIndex);
      setCorrectClicked(nextCorrect);
      setScore((s) => s + 10);
      setCorrectCellsTotal((c) => c + 1);

      if (nextCorrect.size === highlighted.size) {
        finishLevel(true);
      }
    } else {
      setWrongClicked((w) => new Set(w).add(cellIndex));
      setScore((s) => Math.max(0, s - 5));
      setWrongCellsTotal((c) => c + 1);
      triggerShake();
      triggerFlash();
    }
  }

  function finishLevel(cleared) {
    const elapsed = Math.round(performance.now() - levelInputStartRef.current);
    setLevelTimes((prev) => [...prev, elapsed]);
    setHighestLevelReached((prev) => Math.max(prev, levelIndex + (cleared ? 1 : 0)));
    setPhase("levelBreak");

    setTimeout(() => {
      const nextIndex = levelIndex + 1;
      if (nextIndex >= LEVELS.length) {
        if (!endedRef.current) {
          endedRef.current = true;
          endGame();
        }
        return;
      }
      setLevelIndex(nextIndex);
      beginLevel(nextIndex);
    }, 700);
  }

  function endGame() {
    clearInterval(sessionTickRef.current);
    const endedAt = new Date().toISOString();
    const totalAttempted = correctCellsTotal + wrongCellsTotal;
    const accuracy = totalAttempted > 0 ? Math.round((correctCellsTotal / totalAttempted) * 100) : 0;
    const avgTime = levelTimes.length
      ? Math.round(levelTimes.reduce((a, b) => a + b, 0) / levelTimes.length)
      : 0;

    const payload = {
      id: crypto.randomUUID(),
      assessmentId: null, // fill from the active assessment/_id
      gameId: "memory_matrix",
      accuracy,
      score,
      avgTime,
      additionalData: {
        highestLevelReached,
        wrongCellClicks: wrongCellsTotal,
      },
      session: {
        startedAt: startedAtRef.current,
        endedAt,
        timeLimitMs: SESSION_TIME_LIMIT_MS,
      },
    };

    console.log("Session payload ready:", payload);

    // Once /api/game-results exists, replace the console.log above with:
    //
    // fetch("http://localhost:5000/api/game-results", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${localStorage.getItem("token")}`,
    //   },
    //   body: JSON.stringify(payload),
    // });

    if (onComplete) onComplete(payload);
    setPhase("done");
  }

  const level = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  const totalAttempted = correctCellsTotal + wrongCellsTotal;
  const accuracy = totalAttempted > 0 ? Math.round((correctCellsTotal / totalAttempted) * 100) : 0;
  const avgTime = levelTimes.length
    ? Math.round(levelTimes.reduce((a, b) => a + b, 0) / levelTimes.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="mm-intro-screen">
        <style>{styles}</style>
        <h1>Memory Matrix</h1>
        <p className="sub">
          5 levels, grids from 3×3 up to 5×5. Watch the highlighted cells,
          then click them back from memory once they disappear. The grid
          grows and your memorize window shrinks as you go — you've got
          about 30 seconds total.
        </p>
        <div className="mm-intro-cards">
          <div className="mm-intro-card">
            <div className="dot" />
            <div className="title">Memorize</div>
            <div className="desc">Cells light up briefly. Watch closely.</div>
          </div>
          <div className="mm-intro-card">
            <div className="dot" />
            <div className="title">Recall</div>
            <div className="desc">Click every cell that was highlighted.</div>
          </div>
          <div className="mm-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Wrong click</div>
            <div className="desc">Costs points, doesn't end the level.</div>
          </div>
        </div>
        <button className="mm-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }

  return (
    <div className="mm-wrap">
      <style>{styles}</style>

      <div className={`mm-arena ${shake ? "shake" : ""}`}>
        <div className={`mm-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        <div className="mm-arena-header">
          <div>
            <h2>Memory Matrix</h2>
            <p>
              Memorize the mint cells, then click them back from memory.
              Grid grows and the pattern gets bigger each level.
            </p>
          </div>
          {(phase === "showing" || phase === "input" || phase === "levelBreak") && (
            <div className={`mm-badge ${phase === "showing" ? "" : "warn"}`}>
              {phase === "showing" ? "Memorize" : "Level " + (levelIndex + 1) + "/" + LEVELS.length}
            </div>
          )}
        </div>

        {(phase === "showing" || phase === "input" || phase === "levelBreak") && (
          <div className="mm-board-area">
            <div
              className="mm-board"
              style={{
                gridTemplateColumns: `repeat(${level.grid}, 64px)`,
                gridTemplateRows: `repeat(${level.grid}, 64px)`,
              }}
            >
              {Array.from({ length: level.grid * level.grid }, (_, i) => {
                let cls = "mm-cell";
                if (phase === "showing" && highlighted.has(i)) cls += " mm-shown";
                if (phase !== "showing" && correctClicked.has(i)) cls += " mm-correct";
                if (phase !== "showing" && wrongClicked.has(i)) cls += " mm-wrong";
                if (phase !== "input") cls += " mm-disabled";
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => handleCellClick(i)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="mm-center-msg">
            <h2>{getResultCopy(score).title}</h2>
            <p>{getResultCopy(score).subtitle}</p>
            <div className="mm-results-grid">
              <div>
                <div className="label">Score</div>
                <div className="value">{score}</div>
              </div>
              <div>
                <div className="label">Accuracy</div>
                <div className="value">{accuracy}%</div>
              </div>
              <div>
                <div className="label">Highest Level</div>
                <div className="value">{highestLevelReached}/{LEVELS.length}</div>
              </div>
              <div>
                <div className="label">Wrong Cells</div>
                <div className="value">{wrongCellsTotal}</div>
              </div>
              <div>
                <div className="label">Avg Time / Level</div>
                <div className="value">{avgTime}ms</div>
              </div>
              <div>
                <div className="label">Correct Cells</div>
                <div className="value">{correctCellsTotal}</div>
              </div>
            </div>
            <button className="mm-btn" onClick={() => setPhase("instructions")}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="mm-sidebar">
        <div className="mm-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="mm-progress-bar">
            <div
              className="mm-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="mm-stat">
          <div className="label">Level</div>
          <div className="value level">{Math.min(levelIndex + 1, LEVELS.length)}/{LEVELS.length}</div>
        </div>
        <div className="mm-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="mm-stat">
          <div className="label">Wrong Cells</div>
          <div className="value wrong">{wrongCellsTotal}</div>
        </div>
        <div className="mm-stat">
          <div className="label">Accuracy</div>
          <div className="value">{accuracy || 0}%</div>
        </div>
      </div>
    </div>
  );
}