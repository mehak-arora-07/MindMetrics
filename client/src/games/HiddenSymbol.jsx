import { useState, useRef, useEffect, useCallback } from "react";

// Drop into client/src/games/HiddenSymbol.jsx
// Same visual family as MemoryMatrix / WhackACircle — dark arena, mint/gold/red accents.
// No database — logs the final payload to console only.
//
// Mongo shape this feeds:
//   game_result: { id, assessmentId, gameId, accuracy, score, avgTime, additionalData }
//   session:     { id, startedAt, endedAt, ... }

const SESSION_TIME_LIMIT_MS = 20000; // shorter clock — this one's meant to be hard

const ROUNDS = [
  { grid: 7, cellPx: 48 },
  { grid: 8, cellPx: 44 },
  { grid: 8, cellPx: 42 },
  { grid: 9, cellPx: 38 },
  { grid: 9, cellPx: 36 },
  { grid: 10, cellPx: 32 },
  { grid: 11, cellPx: 29 },
  { grid: 12, cellPx: 26 },
];

// Same-category pairs only (letter-vs-letter, digit-vs-digit) so the odd
// cell can't be spotted just by shape family — you actually have to read it.
const LETTER_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGIT_POOL = "0123456789".split("");

function randomRoundChars() {
  const pool = Math.random() < 0.5 ? LETTER_POOL : DIGIT_POOL;
  const fill = pool[Math.floor(Math.random() * pool.length)];
  let target = fill;
  while (target === fill) {
    target = pool[Math.floor(Math.random() * pool.length)];
  }
  return { fill, target };
}

function randomTargetIndex(gridSize) {
  return Math.floor(Math.random() * gridSize * gridSize);
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

.hs-intro-screen {
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

.hs-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.hs-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 440px;
  margin: 0;
  line-height: 1.6;
}

.hs-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.hs-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.hs-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.hs-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.hs-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.hs-wrap {
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

.hs-arena {
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

.hs-arena.shake {
  animation: hs-shake 0.28s ease;
}

@keyframes hs-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.hs-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.hs-flash.on {
  animation: hs-flash 0.35s ease;
}

@keyframes hs-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.hs-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hs-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.hs-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.hs-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.hs-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.hs-board-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.hs-board {
  display: grid;
  gap: 6px;
}

.hs-cell {
  border-radius: 8px;
  border: 1px solid #232A3D;
  background: #0B0F19;
  color: #6B7284;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, color 0.15s ease;
}

.hs-cell:active {
  transform: scale(0.92);
}

.hs-cell.hs-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.5);
  color: #05221A;
  cursor: default;
}

.hs-cell.hs-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.45);
  color: #3D0B0B;
  cursor: default;
}

.hs-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hs-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.hs-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.hs-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.hs-stat .value.score { color: #F59E0B; }
.hs-stat .value.wrong { color: #F87171; }
.hs-stat .value.level { color: #34D399; }

.hs-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.hs-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.hs-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.hs-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.hs-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.hs-center-msg p {
  color: #8B93A7;
  font-size: 14px;
  margin: 0;
  max-width: 340px;
}

.hs-btn {
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

.hs-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.hs-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.hs-results-grid .label { color: #8B93A7; font-size: 11px; }
.hs-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

const MAX_POSSIBLE_SCORE = ROUNDS.length * 10; // 50

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) {
    return { title: "Room to grow" };
  }
  if (pct < 0.7) {
    return { title: "Sharp eyes!" };
  }
  return { title: "Woah, eagle vision 🦅" };
}

export default function HiddenSymbol({ onComplete }) {
  const [phase, setPhase] = useState("instructions"); // instructions | playing | levelBreak | done
  const [roundIndex, setRoundIndex] = useState(0);
  const [chars, setChars] = useState({ fill: "B", target: "P" });
  const [targetIndex, setTargetIndex] = useState(0);
  const [clickedCorrect, setClickedCorrect] = useState(false);
  const [wrongCells, setWrongCells] = useState(new Set());
  const [correctFinds, setCorrectFinds] = useState(0);
  const [wrongClicksTotal, setWrongClicksTotal] = useState(0);
  const [score, setScore] = useState(0);
  const [highestLevelReached, setHighestLevelReached] = useState(0);
  const [roundTimes, setRoundTimes] = useState([]);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const roundStartRef = useRef(null);
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

  const beginRound = useCallback((idx) => {
    const round = ROUNDS[idx];
    setChars(randomRoundChars());
    setTargetIndex(randomTargetIndex(round.grid));
    setClickedCorrect(false);
    setWrongCells(new Set());
    roundStartRef.current = performance.now();
    setPhase("playing");
  }, []);

  function startGame() {
    endedRef.current = false;
    setRoundIndex(0);
    setScore(0);
    setCorrectFinds(0);
    setWrongClicksTotal(0);
    setHighestLevelReached(0);
    setRoundTimes([]);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    startedAtRef.current = new Date().toISOString();
    beginRound(0);
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
    if (phase !== "playing") return;
    if (clickedCorrect || wrongCells.has(cellIndex)) return;

    if (cellIndex === targetIndex) {
      const elapsed = Math.round(performance.now() - roundStartRef.current);
      setRoundTimes((prev) => [...prev, elapsed]);
      setClickedCorrect(true);
      setCorrectFinds((c) => c + 1);
      setScore((s) => s + 10);
      setHighestLevelReached((prev) => Math.max(prev, roundIndex + 1));
      setPhase("levelBreak");

      setTimeout(() => {
        const nextIndex = roundIndex + 1;
        if (nextIndex >= ROUNDS.length) {
          if (!endedRef.current) {
            endedRef.current = true;
            endGame();
          }
          return;
        }
        setRoundIndex(nextIndex);
        beginRound(nextIndex);
      }, 700);
    } else {
      setWrongCells((w) => new Set(w).add(cellIndex));
      setWrongClicksTotal((c) => c + 1);
      setScore((s) => Math.max(0, s - 5));
      triggerShake();
      triggerFlash();
    }
  }

  function endGame() {
    clearInterval(sessionTickRef.current);
    const endedAt = new Date().toISOString();
    const totalAttempted = correctFinds + wrongClicksTotal;
    const accuracy = totalAttempted > 0 ? Math.round((correctFinds / totalAttempted) * 100) : 0;
    const avgTime = roundTimes.length
      ? Math.round(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length)
      : 0;

    const payload = {
      id: crypto.randomUUID(),
      assessmentId: null, // fill from the active assessment/_id
      gameId: "hidden_symbol",
      accuracy,
      score,
      avgTime,
      additionalData: {
        highestLevelReached,
        wrongClicks: wrongClicksTotal,
      },
      session: {
        startedAt: startedAtRef.current,
        endedAt,
        timeLimitMs: SESSION_TIME_LIMIT_MS,
      },
    };

    console.log("Session payload ready:", payload);

    // No database wired up yet — once /api/game-results exists, replace the
    // console.log above with an actual POST:
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

  const round = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];
  const totalAttempted = correctFinds + wrongClicksTotal;
  const accuracy = totalAttempted > 0 ? Math.round((correctFinds / totalAttempted) * 100) : 0;
  const avgTime = roundTimes.length
    ? Math.round(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="hs-intro-screen">
        <style>{styles}</style>
        <h1>Hidden Symbol</h1>
        <p className="sub">
          The grid fills with one character. Exactly one cell is different —
          find it as fast as you can. Letters only get swapped for other
          letters, numbers only for other numbers, so it's genuinely tricky.
          {ROUNDS.length} rounds, starting at {ROUNDS[0].grid}×{ROUNDS[0].grid}
          and climbing to {ROUNDS[ROUNDS.length - 1].grid}×{ROUNDS[ROUNDS.length - 1].grid}.
          You've got {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="hs-intro-cards">
          <div className="hs-intro-card">
            <div className="dot" />
            <div className="title">Scan</div>
            <div className="desc">One character fills the grid.</div>
          </div>
          <div className="hs-intro-card">
            <div className="dot" />
            <div className="title">Spot it</div>
            <div className="desc">Exactly one cell doesn't match.</div>
          </div>
          <div className="hs-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Wrong click</div>
            <div className="desc">Costs points, doesn't end the round.</div>
          </div>
        </div>
        <button className="hs-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }

  return (
    <div className="hs-wrap">
      <style>{styles}</style>

      <div className={`hs-arena ${shake ? "shake" : ""}`}>
        <div className={`hs-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        <div className="hs-arena-header">
          <div>
            <h2>Hidden Symbol</h2>
            <p>Find the one cell that doesn't match the rest.</p>
          </div>
          {(phase === "playing" || phase === "levelBreak") && (
            <div className={`hs-badge ${phase === "playing" ? "" : "warn"}`}>
              Round {roundIndex + 1}/{ROUNDS.length}
            </div>
          )}
        </div>

        {(phase === "playing" || phase === "levelBreak") && (
          <div className="hs-board-area">
            <div
              className="hs-board"
              style={{
                gridTemplateColumns: `repeat(${round.grid}, ${round.cellPx}px)`,
                gridTemplateRows: `repeat(${round.grid}, ${round.cellPx}px)`,
              }}
            >
              {Array.from({ length: round.grid * round.grid }, (_, i) => {
                let cls = "hs-cell";
                if (clickedCorrect && i === targetIndex) cls += " hs-correct";
                if (wrongCells.has(i)) cls += " hs-wrong";
                const label = i === targetIndex ? chars.target : chars.fill;
                return (
                  <button
                    key={i}
                    className={cls}
                    style={{ fontSize: Math.round(round.cellPx * 0.4) }}
                    onClick={() => handleCellClick(i)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="hs-center-msg">
            <h2>{getResultCopy(score).title}</h2>
            <div className="hs-results-grid">
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
                <div className="value">{highestLevelReached}/{ROUNDS.length}</div>
              </div>
              <div>
                <div className="label">Wrong Clicks</div>
                <div className="value">{wrongClicksTotal}</div>
              </div>
              <div>
                <div className="label">Avg Time / Round</div>
                <div className="value">{avgTime}ms</div>
              </div>
              <div>
                <div className="label">Correct Finds</div>
                <div className="value">{correctFinds}</div>
              </div>
            </div>
            <button className="hs-btn" onClick={() => setPhase("instructions")}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="hs-sidebar">
        <div className="hs-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="hs-progress-bar">
            <div
              className="hs-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="hs-stat">
          <div className="label">Level</div>
          <div className="value level">{Math.min(roundIndex + 1, ROUNDS.length)}/{ROUNDS.length}</div>
        </div>
        <div className="hs-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="hs-stat">
          <div className="label">Wrong Clicks</div>
          <div className="value wrong">{wrongClicksTotal}</div>
        </div>
        <div className="hs-stat">
          <div className="label">Accuracy</div>
          <div className="value">{accuracy || 0}%</div>
        </div>
      </div>
    </div>
  );
}