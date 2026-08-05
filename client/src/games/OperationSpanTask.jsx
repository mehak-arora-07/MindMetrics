import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNextGamePath } from "../utils/gameSequence";
import { motion } from "framer-motion";
import { setCurrentGameIndex } from "../utils/session";
import useDisableBackButton from "../hooks/useDisableBackButton";


// Drop into client/src/games/OperationSpanTask.jsx
// Same visual family as DualTask/KeepTrackTask/MemoryMatrix/HiddenSymbol — dark arena, mint/gold/red accents.
// POSTs the completed session to POST /api/sessions on game end, same pattern as the other games.
//
// This is the classic Operation Span (OSPAN) task — one of the gold-standard
// working memory measures. Each trial: solve/verify a simple math equation
// (Processing), then a letter flashes briefly (Storage). After a set of N
// trials, recall every letter shown, in the order it appeared (Executive
// Function — juggling both tasks without letting one interfere with the
// other). Set size grows each round, same escalating-difficulty shape as
// every other game here.
//
// Matches the Sessions mongoose schema:
//   { sessionId, userId, assessmentId, gameId, accuracy, avgTimeMs, metrics, completed }
// "accuracy" is the average of processing accuracy (math judgments) and
// storage accuracy (letter recall) — both live individually inside metrics
// too, since OSPAN is meant to separate the two out.

const SESSION_TIME_LIMIT_MS = 150000; // 5 sets, each with its own math+letter trials, so a long clock

const SETS = [
  { label: "Round 1", setSize: 3, mathDifficulty: "easy", mathTimeLimitMs: 6000, letterDisplayMs: 900 },
  { label: "Round 2", setSize: 4, mathDifficulty: "easy", mathTimeLimitMs: 5500, letterDisplayMs: 900 },
  { label: "Round 3", setSize: 5, mathDifficulty: "medium", mathTimeLimitMs: 5000, letterDisplayMs: 850 },
  { label: "Round 4", setSize: 6, mathDifficulty: "medium", mathTimeLimitMs: 4500, letterDisplayMs: 850 },
  { label: "Round 5", setSize: 6, mathDifficulty: "hard", mathTimeLimitMs: 4000, letterDisplayMs: 800 },
];

const MATH_POINTS = 5; // per correct true/false judgment
const LETTER_POINTS = 10; // per letter recalled in the correct serial position
const RECALL_REVEAL_MS = 900; // brief correct/wrong reveal on the recall slots
const SET_BREAK_MS = 1000; // the "set complete" pause between sets
const MATH_FEEDBACK_MS = 400; // brief correct/wrong flash on the equation itself
const MAX_POSSIBLE_SCORE = SETS.reduce(
  (sum, s) => sum + s.setSize * MATH_POINTS + s.setSize * LETTER_POINTS,
  0
);

// Fixed recognition matrix — every letter a set can show is drawn from here,
// so the recall grid always contains exactly what could have appeared.
// No vowels, nothing easily confused with another letter.
const RECALL_LETTER_MATRIX = ["F", "H", "J", "K", "L", "N", "P", "Q", "R", "S", "T", "Y"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickLetterSequence(setSize, exclude = []) {
  const pool = RECALL_LETTER_MATRIX.filter((l) => !exclude.includes(l));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, setSize);
}

// Fallback ONLY — used if GET /api/questions/operation_span can't be
// reached or returns no questions. The real question bank (equation,
// statedResult, correctResult, isTrue, difficulty) is fetched from the DB
// in the component below.
function generateEquationFallback(difficulty) {
  let a, b, op, correctAnswer;

  if (difficulty === "easy") {
    op = Math.random() < 0.5 ? "+" : "-";
    a = randInt(2, 9);
    b = randInt(2, 9);
    if (op === "-" && b > a) [a, b] = [b, a];
    correctAnswer = op === "+" ? a + b : a - b;
  } else if (difficulty === "medium") {
    op = Math.random() < 0.5 ? "×" : "+";
    if (op === "×") {
      a = randInt(2, 9);
      b = randInt(2, 9);
      correctAnswer = a * b;
    } else {
      a = randInt(10, 50);
      b = randInt(10, 50);
      correctAnswer = a + b;
    }
  } else {
    op = Math.random() < 0.5 ? "×" : "-";
    if (op === "×") {
      a = randInt(4, 12);
      b = randInt(4, 12);
      correctAnswer = a * b;
    } else {
      a = randInt(50, 99);
      b = randInt(10, 49);
      correctAnswer = a - b;
    }
  }

  const isTrue = Math.random() < 0.5;
  let statedResult = correctAnswer;
  if (!isTrue) {
    let offset = 0;
    while (offset === 0) offset = randInt(-6, 6);
    statedResult = correctAnswer + offset;
  }

  return { text: `${a} ${op} ${b} = ${statedResult}`, isTrue };
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

.os-intro-screen {
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

.os-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.os-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}

.os-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.os-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.os-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.os-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.os-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.os-wrap {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  background: #0B0F19;
  height: 100vh;
  padding: 32px;
  font-family: 'Inter', -apple-system, sans-serif;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.os-arena {
  position: relative;
  background:
    radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.08), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.08), transparent 40%),
    #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.05s ease;
}

.os-arena.shake {
  animation: os-shake 0.28s ease;
}

@keyframes os-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.os-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.os-flash.on {
  animation: os-flash 0.35s ease;
}

@keyframes os-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.os-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.os-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.os-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.os-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.os-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.os-board-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  text-align: center;
}

.os-phase-label {
  color: #8B93A7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.os-equation {
  color: #E5E7EB;
  font-size: 34px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 14px;
  padding: 22px 34px;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.os-equation.os-eq-correct {
  border-color: #34D399;
  background: rgba(52, 211, 153, 0.08);
}

.os-equation.os-eq-wrong {
  border-color: #F87171;
  background: rgba(248, 113, 113, 0.08);
}

.os-math-timer {
  width: 100%;
  max-width: 320px;
  height: 5px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
}

.os-math-timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #F59E0B);
  transition: width 0.2s linear;
}

.os-yesno-row {
  display: flex;
  gap: 14px;
}

.os-yesno-btn {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  padding: 14px 32px;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.os-yesno-btn:active {
  transform: scale(0.96);
}

.os-yesno-btn.yes:hover { border-color: #34D399; color: #34D399; }
.os-yesno-btn.no:hover { border-color: #F87171; color: #F87171; }

.os-yesno-btn:disabled {
  cursor: default;
  opacity: 0.5;
}

.os-letter-box {
  min-width: 220px;
  padding: 34px 30px;
  border-radius: 20px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
}

.os-letter-box .letter {
  color: #E5E7EB;
  font-size: 54px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.os-recall-instructions {
  color: #E5E7EB;
  font-size: 15px;
  font-weight: 600;
  max-width: 420px;
}

.os-recall-slots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.os-slot {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E5E7EB;
  font-size: 20px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.os-slot.os-slot-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  border-color: transparent;
  color: #05221A;
}

.os-slot.os-slot-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  border-color: transparent;
  color: #3D0B0B;
}

.os-letter-grid {
  display: grid;
  grid-template-columns: repeat(6, 52px);
  gap: 10px;
}

.os-letter-btn {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 17px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  padding: 12px 0;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.os-letter-btn:active {
  transform: scale(0.94);
}

.os-letter-btn.os-used {
  cursor: default;
  opacity: 0.35;
}

.os-backspace-btn {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #F87171;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}

.os-backspace-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.os-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.os-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.os-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.os-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.os-stat .value.score { color: #F59E0B; }
.os-stat .value.wrong { color: #F87171; }
.os-stat .value.level { color: #34D399; }

.os-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.os-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.os-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.os-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.os-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.os-btn {
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

.os-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto; 
}

.os-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 12px;
}

.os-results-grid .label { color: #8B93A7; font-size: 11px; }
.os-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }

.os-btn-row {
  display: flex;
  gap: 12px;
}
`;

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) {
    return { title: "Room to grow" };
  }
  if (pct < 0.7) {
    return { title: "Solid working memory" };
  }
  return { title: "Exceptional working memory 🧠" };
}

export default function OperationSpanTask({ onComplete, onNextGame, userId, assessmentId }) {
    const navigate = useNavigate();
useDisableBackButton();
  const [phase, setPhase] = useState("instructions"); // instructions | math | letterFlash | recall | setBreak | done
  const [setIndex, setSetIndex] = useState(0);
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentEquation, setCurrentEquation] = useState(null);
  const [mathAnswered, setMathAnswered] = useState(null); // null | "correct" | "wrong" | "timeout"
  const [mathTimeLeftMs, setMathTimeLeftMs] = useState(0);
  const [currentLetter, setCurrentLetter] = useState(null);
  const [recallInput, setRecallInput] = useState([]);
  const [recallRevealed, setRecallRevealed] = useState(false);
  const [mathCorrectCount, setMathCorrectCount] = useState(0);
  const [mathTotalAnswered, setMathTotalAnswered] = useState(0);
  const [mathReactionTimesMs, setMathReactionTimesMs] = useState([]);
  const [recallCorrectLetters, setRecallCorrectLetters] = useState(0);
  const [recallTotalLetters, setRecallTotalLetters] = useState(0);
  const [maxSetReached, setMaxSetReached] = useState(0);
  const [setTimesMs, setSetTimesMs] = useState([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const trialStartRef = useRef(null);
  const setStartRef = useRef(null);
  const letterSequenceRef = useRef([]);
  const recallRevealedRef = useRef(false);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);
  const mathTickRef = useRef(null);

  // Mirrors of the metric state — the math timeout, the letter-flash
  // setTimeout chain, and the recall-completion handler all trace back to
  // closures created earlier in the sequence, so reading state directly
  // inside endGame() (reached at the end of that chain) can't be trusted
  // to see the latest values. Refs sidestep that, same pattern as
  // KeepTrackTask.
  const scoreRef = useRef(0);
  const mathCorrectCountRef = useRef(0);
  const mathTotalAnsweredRef = useRef(0);
  const mathReactionTimesMsRef = useRef([]);
  const recallCorrectLettersRef = useRef(0);
  const recallTotalLettersRef = useRef(0);
  const maxSetReachedRef = useRef(0);
  const setTimesMsRef = useRef([]);

  // Question bank (fetched from the DB). Kept in state for the loading
  // gate below, and mirrored into a ref so pickEquation() — called from
  // deep inside setTimeout chains — always reads the latest pool instead
  // of whatever it was at the time that particular closure was created.
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSource, setBankSource] = useState(null); // 'api' | 'local'
  const masterEquationPoolRef = useRef([]);
  const usedQuestionIdsRef = useRef(new Set());

  // ---- Load real questions from the DB on mount ----
  useEffect(() => {
    async function loadQuestionBank() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/questions/operation_span`);
        const result = await res.json();

        if (!result.success || !result.questions || result.questions.length === 0) {
          throw new Error("Bank empty or request unsuccessful");
        }

        const normalized = result.questions.map((q) => ({
          questionId: q.questionId,
          difficulty: q.difficulty, // "Easy" | "Medium" | "Hard"
          text: `${q.data.equation} = ${q.data.statedResult}`,
          isTrue: q.data.isTrue,
          correctResult: q.data.correctResult,
        }));

        masterEquationPoolRef.current = normalized;
        setBankSource("api");
      } catch (err) {
        console.warn("Falling back to local equation generator — bank fetch failed:", err.message);
        masterEquationPoolRef.current = [];
        setBankSource("local");
      } finally {
        setBankLoaded(true);
      }
    }
    loadQuestionBank();
  }, []);

  // Picks the next equation for a trial. Prefers unused DB questions
  // matching this set's difficulty; falls back to any DB question of that
  // difficulty once the unused ones run out; falls back to the local
  // generator only if the bank is empty (fetch failed).
  function pickEquation(mathDifficulty) {
    const label = mathDifficulty.charAt(0).toUpperCase() + mathDifficulty.slice(1);
    const pool = masterEquationPoolRef.current;

    if (pool.length > 0) {
      const sameDifficulty = pool.filter((q) => q.difficulty === label);
      const unused = sameDifficulty.filter((q) => !usedQuestionIdsRef.current.has(q.questionId));
      const candidates = unused.length > 0 ? unused : sameDifficulty.length > 0 ? sameDifficulty : pool;

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      usedQuestionIdsRef.current.add(chosen.questionId);
      return { text: chosen.text, isTrue: chosen.isTrue };
    }

    return generateEquationFallback(mathDifficulty);
  }

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  function beginTrial(setIdx, trialIdx) {
    if (endedRef.current) return;
    clearInterval(mathTickRef.current);
    const set = SETS[setIdx];
    const eq = pickEquation(set.mathDifficulty);
    setCurrentEquation(eq);
    setMathAnswered(null);
    setMathTimeLeftMs(set.mathTimeLimitMs);
    trialStartRef.current = performance.now();
    setPhase("math");

    mathTickRef.current = setInterval(() => {
      setMathTimeLeftMs((t) => {
        const next = t - 100;
        if (next <= 0) {
          clearInterval(mathTickRef.current);
          if (!endedRef.current) answerMath(null);
          return 0;
        }
        return next;
      });
    }, 100);
  }

  function answerMath(userSaysYes) {
    if (phase !== "math" || mathAnswered !== null || endedRef.current) return;
    clearInterval(mathTickRef.current);

    const eq = currentEquation;
    const isTimeout = userSaysYes === null;
    const isCorrectJudgment = !isTimeout && userSaysYes === eq.isTrue;

    setMathTotalAnswered((c) => {
      mathTotalAnsweredRef.current = c + 1;
      return c + 1;
    });

    if (isCorrectJudgment) {
      setMathCorrectCount((c) => {
        mathCorrectCountRef.current = c + 1;
        return c + 1;
      });
      setScore((s) => {
        scoreRef.current = s + MATH_POINTS;
        return s + MATH_POINTS;
      });
      const rt = Math.round(performance.now() - trialStartRef.current);
      setMathReactionTimesMs((arr) => {
        const next = [...arr, rt];
        mathReactionTimesMsRef.current = next;
        return next;
      });
    } else {
      triggerShake();
      triggerFlash();
    }

    setMathAnswered(isTimeout ? "timeout" : isCorrectJudgment ? "correct" : "wrong");

    setTimeout(() => {
      if (endedRef.current) return;
      flashLetter(setIndex, trialIndex);
    }, MATH_FEEDBACK_MS);
  }

  function flashLetter(setIdx, trialIdx) {
    const set = SETS[setIdx];
    const [letter] = pickLetterSequence(1, letterSequenceRef.current);
    letterSequenceRef.current = [...letterSequenceRef.current, letter];
    setCurrentLetter(letter);
    setPhase("letterFlash");

    setTimeout(() => {
      if (endedRef.current) return;
      setCurrentLetter(null);
      const nextTrialIdx = trialIdx + 1;
      if (nextTrialIdx < set.setSize) {
        setTrialIndex(nextTrialIdx);
        beginTrial(setIdx, nextTrialIdx);
      } else {
        setRecallInput([]);
        setRecallRevealed(false);
        recallRevealedRef.current = false;
        setPhase("recall");
      }
    }, set.letterDisplayMs);
  }

  function beginSet(idx) {
    letterSequenceRef.current = [];
    setTrialIndex(0);
    setStartRef.current = performance.now();
    beginTrial(idx, 0);
  }

  function startGame() {
    endedRef.current = false;
    setSetIndex(0);
    setScore(0);
    setMathCorrectCount(0);
    setMathTotalAnswered(0);
    setMathReactionTimesMs([]);
    setRecallCorrectLetters(0);
    setRecallTotalLetters(0);
    setMaxSetReached(0);
    setSetTimesMs([]);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    scoreRef.current = 0;
    mathCorrectCountRef.current = 0;
    mathTotalAnsweredRef.current = 0;
    mathReactionTimesMsRef.current = [];
    recallCorrectLettersRef.current = 0;
    recallTotalLettersRef.current = 0;
    maxSetReachedRef.current = 0;
    setTimesMsRef.current = [];
    usedQuestionIdsRef.current = new Set();
    startedAtRef.current = new Date().toISOString();
    beginSet(0);
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

  function tapRecallLetter(letter) {
    const set = SETS[setIndex];
    if (phase !== "recall" || recallRevealed || endedRef.current) return;
    if (recallInput.includes(letter) || recallInput.length >= set.setSize) return;

    const nextInput = [...recallInput, letter];
    setRecallInput(nextInput);

    if (nextInput.length === set.setSize) {
      const actual = letterSequenceRef.current;
      const correctPositions = nextInput.reduce(
        (acc, l, i) => acc + (l === actual[i] ? 1 : 0),
        0
      );

      setRecallCorrectLetters((c) => {
        recallCorrectLettersRef.current = c + correctPositions;
        return c + correctPositions;
      });
      setRecallTotalLetters((c) => {
        recallTotalLettersRef.current = c + set.setSize;
        return c + set.setSize;
      });
      setScore((s) => {
        scoreRef.current = s + correctPositions * LETTER_POINTS;
        return s + correctPositions * LETTER_POINTS;
      });
      setMaxSetReached((prev) => {
        maxSetReachedRef.current = Math.max(prev, setIndex + 1);
        return Math.max(prev, setIndex + 1);
      });
      const elapsed = Math.round(performance.now() - setStartRef.current);
      setSetTimesMs((prev) => {
        const next = [...prev, elapsed];
        setTimesMsRef.current = next;
        return next;
      });

      if (correctPositions < set.setSize) triggerShake();
      setRecallRevealed(true);
      recallRevealedRef.current = true;

      setTimeout(() => {
        if (endedRef.current) return;
        setPhase("setBreak");

        setTimeout(() => {
          if (endedRef.current) return;
          const nextIdx = setIndex + 1;
          if (nextIdx >= SETS.length) {
            endedRef.current = true;
            endGame();
            return;
          }
          setSetIndex(nextIdx);
          beginSet(nextIdx);
        }, SET_BREAK_MS);
      }, RECALL_REVEAL_MS);
    }
  }

  function removeLastRecallLetter() {
    if (phase !== "recall" || recallRevealedRef.current || endedRef.current) return;
    setRecallInput((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Backspace" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        removeLastRecallLetter();
      }
    }
    // capture: true so this reliably fires even if something else in the
    // app also listens for Backspace (e.g. a global back-navigation
    // shortcut) — same fix applied to the CPT game.
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

async function endGame() {
  clearInterval(sessionTickRef.current);
  clearInterval(mathTickRef.current);

  const finalScore = scoreRef.current;
  const finalMathCorrect = mathCorrectCountRef.current;
  const finalMathAnswered = mathTotalAnsweredRef.current;
  const finalMathReactionTimes = mathReactionTimesMsRef.current;
  const finalRecallCorrect = recallCorrectLettersRef.current;
  const finalRecallTotal = recallTotalLettersRef.current;
  const finalMaxSetReached = maxSetReachedRef.current;
  const finalSetTimes = setTimesMsRef.current;

  const processingAccuracy =
    finalMathAnswered > 0
      ? Math.round(
          (finalMathCorrect / finalMathAnswered) * 100
        )
      : 0;

  const storageAccuracy =
    finalRecallTotal > 0
      ? Math.round(
          (finalRecallCorrect / finalRecallTotal) * 100
        )
      : 0;

  const accuracy = Math.round(
    (processingAccuracy + storageAccuracy) / 2
  );

  const avgMathReactionMs =
    finalMathReactionTimes.length
      ? Math.round(
          finalMathReactionTimes.reduce(
            (a, b) => a + b,
            0
          ) / finalMathReactionTimes.length
        )
      : 0;

  const payload = {
    assessmentId:
      localStorage.getItem("assessmentId"),
    gameId: "operation_span",
    accuracy,
    avgTimeMs: avgMathReactionMs,
    metrics: {
      score: finalScore,
      maxPossibleScore: MAX_POSSIBLE_SCORE,
      setsCompleted: finalSetTimes.length,
      maxSetReached: finalMaxSetReached,
      processingAccuracy,
      storageAccuracy,
      mathCorrect: finalMathCorrect,
      mathAnswered: finalMathAnswered,
      avgMathReactionMs,
      mathReactionTimesMs:
        finalMathReactionTimes,
      correctLettersRecalled:
        finalRecallCorrect,
      totalLettersPresented:
        finalRecallTotal,
      setTimesMs: finalSetTimes,
    },
    completed: true,
  };

  console.log(
    "Assessment ID:",
    localStorage.getItem("assessmentId")
  );
  console.log("Payload being sent:", payload);

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(
            "token"
          )}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      alert(
        "Your login session expired. Please log in again."
      );

      window.location.href = "/";
      return;
    }

    if (!res.ok) {
      console.error(
        "Failed to save session:",
        res.status,
        data
      );
      return;
    }

    console.log(
      "Session saved successfully:",
      data
    );

    setPhase("done");

    const nextPath =
      getNextGamePath("operation_span");

    if (nextPath) {
      setCurrentGameIndex(7)
      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 3000);
    }
  } catch (err) {
    console.error(
      "Failed to save session:",
      err
    );
  }
}

  const set = SETS[Math.min(setIndex, SETS.length - 1)];
  const processingAccuracy =
    mathTotalAnswered > 0 ? Math.round((mathCorrectCount / mathTotalAnswered) * 100) : 0;
  const storageAccuracy =
    recallTotalLetters > 0 ? Math.round((recallCorrectLetters / recallTotalLetters) * 100) : 0;
  const avgMathReactionMs = mathReactionTimesMs.length
    ? Math.round(mathReactionTimesMs.reduce((a, b) => a + b, 0) / mathReactionTimesMs.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="os-intro-screen">
        <style>{styles}</style>
        <h1>Operation Span</h1>
        <p className="sub">
          Solve a quick math check — say whether the equation shown is
          correct — then a letter flashes on screen. Repeat that for a whole
          round, then recall every letter in the exact order it appeared.
          Rounds get bigger as you go. You've got {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="os-intro-cards">
          <div className="os-intro-card">
            <div className="dot" />
            <div className="title">Solve</div>
            <div className="desc">Judge whether the shown equation is correct.</div>
          </div>
          <div className="os-intro-card">
            <div className="dot" />
            <div className="title">Remember</div>
            <div className="desc">A letter flashes right after — keep it in mind.</div>
          </div>
          <div className="os-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Recall</div>
            <div className="desc">Tap every letter back, in the order it appeared.</div>
          </div>
        </div>
        <button className="os-btn" onClick={startGame} disabled={!bankLoaded}>
          {bankLoaded ? "Start the Game" : ""}
        </button>
      </div>
    );
  }
if (phase === "done") {
  return (
    <div className="os-intro-screen">
      <style>{styles}</style>

      <div
        style={{
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#E5E7EB",
            fontSize: 22,
            marginBottom: 24,
          }}
        >
          Scores
        </h2>

        <div className="os-results-grid">
          <div>
            <div className="label">Score</div>
            <div className="value">{score}</div>
          </div>

          <div>
            <div className="label">Processing Accuracy</div>
            <div className="value">{processingAccuracy}%</div>
          </div>

          <div>
            <div className="label">Storage Accuracy</div>
            <div className="value">{storageAccuracy}%</div>
          </div>

          <div>
            <div className="label">Max Set Reached</div>
            <div className="value">
              {maxSetReached}/{SETS.length}
            </div>
          </div>

          <div>
            <div className="label">Letters Recalled</div>
            <div className="value">
              {recallCorrectLetters}/{recallTotalLetters}
            </div>
          </div>

          <div>
            <div className="label">Avg Math Reaction</div>
            <div className="value">{avgMathReactionMs}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
return (
  <motion.div
    className="os-wrap"
     initial={{
    opacity: 0,
    y: 10,
  }}
  animate={{
    opacity: 1,
    y: 0,
  }}
  transition={{
    duration: 0.2,
    ease: "easeOut",
  }}
  >
    <style>{styles}</style>
      <div className={`os-arena ${shake ? "shake" : ""}`}>
        <div className={`os-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        {phase !== "done" && (
          <div className="os-arena-header">
            <div>
              <h2>Operation Span</h2>
            </div>
            <div className={`os-badge ${set.mathDifficulty === "hard" ? "warn" : ""}`}>
              Round {setIndex + 1} of {SETS.length}
            </div>
          </div>
        )}

        {phase !== "done" && (
          <div className="os-progress-bar" style={{ marginTop: 4, marginLeft: 24, marginRight: 24 }}>
            <div
              className="os-progress-fill"
              style={{ width: `${(setIndex / SETS.length) * 100}%` }}
            />
          </div>
        )}

        {phase === "math" && currentEquation && (
          <div className="os-board-area">
            <div className="os-phase-label">
              Solve — Trial {trialIndex + 1}/{set.setSize}
            </div>
            <div
              className={`os-equation ${
                mathAnswered === "correct"
                  ? "os-eq-correct"
                  : mathAnswered === "wrong" || mathAnswered === "timeout"
                  ? "os-eq-wrong"
                  : ""
              }`}
            >
              {currentEquation.text}
            </div>
            <div className="os-math-timer">
              <div
                className="os-math-timer-fill"
                style={{ width: `${(mathTimeLeftMs / set.mathTimeLimitMs) * 100}%` }}
              />
            </div>
            <div className="os-yesno-row">
              <button
                className="os-yesno-btn yes"
                onClick={() => answerMath(true)}
                disabled={mathAnswered !== null}
              >
                YES
              </button>
              <button
                className="os-yesno-btn no"
                onClick={() => answerMath(false)}
                disabled={mathAnswered !== null}
              >
                NO
              </button>
            </div>
          </div>
        )}

        {phase === "letterFlash" && currentLetter && (
          <div className="os-board-area">
            <div className="os-phase-label">Remember</div>
            <div className="os-letter-box">
              <div className="letter">{currentLetter}</div>
            </div>
          </div>
        )}

        {phase === "recall" && (
          <div className="os-board-area">
            <div className="os-phase-label">Recall</div>
            <div className="os-recall-instructions">
              Tap the {set.setSize} letters back in the order they appeared.
            </div>
            <div className="os-recall-slots">
              {Array.from({ length: set.setSize }, (_, i) => {
                let cls = "os-slot";
                if (recallRevealed) {
                  cls += recallInput[i] === letterSequenceRef.current[i] ? " os-slot-correct" : " os-slot-wrong";
                }
                return (
                  <div key={i} className={cls}>
                    {recallInput[i] || ""}
                  </div>
                );
              })}
            </div>
            <div className="os-letter-grid">
              {RECALL_LETTER_MATRIX.map((letter) => {
                const used = recallInput.includes(letter);
                return (
                  <button
                    key={letter}
                    className={`os-letter-btn ${used ? "os-used" : ""}`}
                    onClick={() => tapRecallLetter(letter)}
                    disabled={used || recallRevealed}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <button
              className="os-backspace-btn"
              onClick={removeLastRecallLetter}
              disabled={recallInput.length === 0 || recallRevealed}
            >
              ⌫ Backspace
            </button>
          </div>
        )}

        {phase === "setBreak" && (
          <div className="os-board-area">
            <div className="os-letter-box" style={{ padding: "20px 26px" }}>
              <div className="letter" style={{ fontSize: 18 }}>
                {set.label} complete
              </div>
            </div>
          </div>
        )}

      
      </div>
{phase !== "done" && (
      <div className="os-sidebar">
        <div className="os-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="os-progress-bar">
            <div
              className="os-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="os-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="os-stat">
          <div className="label">Avg Reaction Time</div>
          <div className="value">{avgMathReactionMs || 0}ms</div>
        </div>
      </div>
)}
    </motion.div>
  );
}
