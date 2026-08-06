import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNextGamePath } from "../utils/gameSequence";
import { motion } from "framer-motion";
import { setCurrentGameIndex } from "../utils/session";
import useDisableBackButton from "../hooks/useDisableBackButton";



const SESSION_TIME_LIMIT_MS = 60000; // more phases per round than the other games, so a longer clock

const ROUNDS = [
  { label: "Round 1", colorCount: 3, mathCount: 1, displayMs: 1000, difficulty: "normal" },
  { label: "Round 2", colorCount: 4, mathCount: 2, displayMs: 850, difficulty: "hard" },
  { label: "Round 3", colorCount: 4, mathCount: 1, displayMs: 700, difficulty: "hard" },
];

const MATH_POINTS = 10;
const MEMORY_POINTS = 20;
const ROUND_REVEAL_MS = 300; // brief correct/wrong reveal before the pause screen
const ROUND_BREAK_MS = 700; // the actual "round complete" pause — 0.5-1s window
const MAX_POSSIBLE_SCORE = ROUNDS.reduce((sum, r) => sum + r.mathCount * MATH_POINTS + MEMORY_POINTS, 0);

const COLORS = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink", "Teal"];
const COLOR_HEX = {
  Red: "#F87171",
  Blue: "#60A5FA",
  Green: "#34D399",
  Yellow: "#FBBF24",
  Purple: "#C084FC",
  Orange: "#FB923C",
  Pink: "#F472B6",
  Teal: "#2DD4BF",
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateColorSequence(length) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    seq.push(COLORS[randInt(0, COLORS.length - 1)]);
  }
  return seq;
}

function generateMathQuestion(difficulty = "normal") {
  if (difficulty === "hard") {
    // bigger numbers / tougher multiplication for the round 3 "difficult" question
    const ops = ["+", "-", "×"];
    const op = ops[randInt(0, ops.length - 1)];
    let a, b, answer, question;
    if (op === "×") {
      a = randInt(12, 25);
      b = randInt(12, 25);
      answer = a * b;
      question = `${a} × ${b}`;
    } else {
      a = randInt(100, 999);
      b = randInt(100, 999);
      if (op === "-" && b > a) [a, b] = [b, a];
      answer = op === "+" ? a + b : a - b;
      question = `${a} ${op === "+" ? "+" : "−"} ${b}`;
    }
    return { question, answer };
  }

  const ops = ["+", "-", "×", "÷"];
  const op = ops[randInt(0, ops.length - 1)];
  let a, b, answer, question;

  if (op === "+") {
    a = randInt(10, 99);
    b = randInt(10, 99);
    answer = a + b;
    question = `${a} + ${b}`;
  } else if (op === "-") {
    a = randInt(10, 99);
    b = randInt(10, 99);
    if (b > a) [a, b] = [b, a];
    answer = a - b;
    question = `${a} − ${b}`;
  } else if (op === "×") {
    a = randInt(2, 12);
    b = randInt(2, 12);
    answer = a * b;
    question = `${a} × ${b}`;
  } else {
    b = randInt(2, 12);
    answer = randInt(2, 12);
    a = b * answer;
    question = `${a} ÷ ${b}`;
  }
  return { question, answer };
}

function buildMemoryQuestion(sequence) {
  const position = randInt(0, sequence.length - 1);
  const correctAnswer = sequence[position];
  const wrongPool = COLORS.filter((c) => c !== correctAnswer);
  const shuffledWrong = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...shuffledWrong, correctAnswer].sort(() => Math.random() - 0.5);
  return { position, correctAnswer, options, questionText: `What was color number ${position + 1}?` };
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

.cs-intro-screen {
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

.cs-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.cs-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}

.cs-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.cs-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.cs-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.cs-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.cs-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.cs-wrap {
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

.cs-arena {
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

.cs-arena.shake {
  animation: cs-shake 0.28s ease;
}

@keyframes cs-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.cs-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.cs-flash.on {
  animation: cs-flash 0.35s ease;
}

@keyframes cs-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.cs-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cs-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.cs-round-progress-bar {
  height: 5px;
  background: #232A3D;
  margin: 0 24px 8px;
  border-radius: 5px;
  overflow: hidden;
}

.cs-round-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.3s ease;
}

.cs-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.cs-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.cs-board-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  text-align: center;
}

.cs-phase-label {
  color: #8B93A7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cs-color-box {
  width: 220px;
  height: 220px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #05131A;
  font-size: 26px;
  font-weight: 700;
  font-family: 'Inter', -apple-system, sans-serif;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
}

.cs-question {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.cs-input {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 20px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  padding: 12px 16px;
  width: 140px;
  text-align: center;
  outline: none;
}

.cs-input:focus {
  border-color: #34D399;
}

.cs-options {
  display: grid;
  grid-template-columns: repeat(2, 140px);
  gap: 12px;
}

.cs-option {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.cs-option:active {
  transform: scale(0.96);
}

.cs-option .swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cs-option.cs-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.45);
  color: #05221A;
  cursor: default;
}

.cs-option.cs-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.45);
  color: #3D0B0B;
  cursor: default;
}

.cs-option.cs-disabled {
  cursor: default;
  opacity: 0.7;
}

.cs-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cs-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.cs-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.cs-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.cs-stat .value.score { color: #F59E0B; }
.cs-stat .value.wrong { color: #F87171; }
.cs-stat .value.level { color: #34D399; }

.cs-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.cs-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.cs-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.cs-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.cs-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.cs-btn {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.cs-btn:active { transform: scale(0.97); }
.cs-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cs-btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cs-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
  margin : 0 auto;
}

.cs-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.cs-results-grid .label { color: #8B93A7; font-size: 11px; }
.cs-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) {
    return { title: "Room to grow" };
  }
  if (pct < 0.7) {
    return { title: "Solid focus!" };
  }
  return { title: "Woah, unshakeable memory 🧠" };
}

export default function DualTask({ onComplete, userId, assessmentId, onNextGame }) {
  const navigate = useNavigate();
  useDisableBackButton();
  const [phase, setPhase] = useState("instructions"); // instructions | sequence | math | memory | roundBreak | done
  const [roundIndex, setRoundIndex] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [seqStepIndex, setSeqStepIndex] = useState(0);
  const [mathQuestions, setMathQuestions] = useState([]);
  const [mathIndex, setMathIndex] = useState(0);
  const [mathInput, setMathInput] = useState("");
  const [mathFeedback, setMathFeedback] = useState(null);
  const [memoryQuestion, setMemoryQuestion] = useState(null);
  const [memorySelected, setMemorySelected] = useState(null);
  const [mathCorrectCount, setMathCorrectCount] = useState(0);
  const [mathTotalAnswered, setMathTotalAnswered] = useState(0);
  const [memoryCorrectCount, setMemoryCorrectCount] = useState(0);
  const [highestLevelReached, setHighestLevelReached] = useState(0);
  const [maxSequenceLength, setMaxSequenceLength] = useState(0);
  const [roundTimes, setRoundTimes] = useState([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const roundStartRef = useRef(null);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);
  const inputRef = useRef(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  function scheduleSequenceStep(seq, idx, displayMs) {
    if (endedRef.current) return;
    if (idx >= seq.length) {
      setSeqStepIndex(-1);
      setPhase("math");
      return;
    }
    setSeqStepIndex(idx);
    setTimeout(() => scheduleSequenceStep(seq, idx + 1, displayMs), displayMs);
  }

  function beginRound(idx) {
    const round = ROUNDS[idx];
    const seq = generateColorSequence(round.colorCount);
    setSequence(seq);
    setMaxSequenceLength((prev) => Math.max(prev, round.colorCount));
    setMathQuestions(Array.from({ length: round.mathCount }, () => generateMathQuestion(round.difficulty)));
    setMathIndex(0);
    setMathInput("");
    setMathFeedback(null);
    setMemoryQuestion(null);
    setMemorySelected(null);
    roundStartRef.current = performance.now();
    setPhase("sequence");
    scheduleSequenceStep(seq, 0, round.displayMs);
  }

  function startGame() {
    endedRef.current = false;
    setRoundIndex(0);
    setScore(0);
    setMathCorrectCount(0);
    setMathTotalAnswered(0);
    setMemoryCorrectCount(0);
    setHighestLevelReached(0);
    setMaxSequenceLength(0);
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

  useEffect(() => {
    if (phase === "math" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, mathIndex]);

  function submitMathAnswer() {
    if (phase !== "math" || mathFeedback) return;
    const q = mathQuestions[mathIndex];
    const userAnswer = parseFloat(mathInput);
    const isCorrect = userAnswer === q.answer;

    setMathTotalAnswered((c) => c + 1);
    if (isCorrect) {
      setMathCorrectCount((c) => c + 1);
      setScore((s) => s + MATH_POINTS);
    } else {
      triggerShake();
      triggerFlash();
    }
    setMathFeedback(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      if (endedRef.current) return;
      setMathFeedback(null);
      setMathInput("");
      const nextIdx = mathIndex + 1;
      if (nextIdx >= mathQuestions.length) {
        setMemoryQuestion(buildMemoryQuestion(sequence));
        setPhase("memory");
      } else {
        setMathIndex(nextIdx);
      }
    }, 500);
  }

  function selectMemoryAnswer(option) {
    if (phase !== "memory" || memorySelected) return;
    const isCorrect = option === memoryQuestion.correctAnswer;
    setMemorySelected(option);
    if (isCorrect) {
      setMemoryCorrectCount((c) => c + 1);
      setScore((s) => s + MEMORY_POINTS);
    } else {
      triggerShake();
      triggerFlash();
    }
    const elapsed = Math.round(performance.now() - roundStartRef.current);
    setRoundTimes((prev) => [...prev, elapsed]);
    setHighestLevelReached((prev) => Math.max(prev, roundIndex + 1));

    // brief reveal of the correct/wrong option, then a clear round-over pause
    setTimeout(() => {
      if (endedRef.current) return;
      setPhase("roundBreak");

      setTimeout(() => {
        if (endedRef.current) return;
        const nextIdx = roundIndex + 1;
        if (nextIdx >= ROUNDS.length) {
          endedRef.current = true;
          endGame();
          return;
        }
        setRoundIndex(nextIdx);
        beginRound(nextIdx);
      }, ROUND_BREAK_MS);
    }, ROUND_REVEAL_MS);
  }

  async function endGame() {
  clearInterval(sessionTickRef.current);

  const totalRoundsPlayed = roundTimes.length;

  const memoryAccuracy =
    totalRoundsPlayed > 0
      ? Math.round(
          (memoryCorrectCount / totalRoundsPlayed) * 100
        )
      : 0;

  const mathAccuracy =
    mathTotalAnswered > 0
      ? Math.round(
          (mathCorrectCount / mathTotalAnswered) * 100
        )
      : 0;

  const totalAttempts =
    totalRoundsPlayed + mathTotalAnswered;

  const totalCorrect =
    memoryCorrectCount + mathCorrectCount;

  const accuracy =
    totalAttempts > 0
      ? Math.round(
          (totalCorrect / totalAttempts) * 100
        )
      : 0;

  const avgTimeMs = roundTimes.length
    ? Math.round(
        roundTimes.reduce((a, b) => a + b, 0) /
          roundTimes.length
      )
    : 0;

  const payload = {
    assessmentId: localStorage.getItem("assessmentId"),
    gameId: "dual_task",
    accuracy,
    avgTimeMs,
    metrics: {
      score,
      maxPossibleScore: MAX_POSSIBLE_SCORE,
      roundsPlayed: totalRoundsPlayed,
      highestRoundReached: highestLevelReached,
      maxSequenceLength,
      memoryAccuracy,
      mathAccuracy,
      memoryCorrect: memoryCorrectCount,
      mathCorrect: mathCorrectCount,
      mathAnswered: mathTotalAnswered,
      roundTimesMs: roundTimes,
    },
    completed: true,
  };

  console.log(
    "Assessment ID:",
    localStorage.getItem("assessmentId")
  );
  console.log("Payload being sent:", payload);

  // Show results and queue the transition to the next game immediately —
  // don't let a failed save trap the player on the last round. The save
  // itself still happens below; failures are logged, not blocking.
  setPhase("done");

  const nextPath = getNextGamePath("dual_task");
  if (nextPath) {
    setCurrentGameIndex(4)
    setTimeout(() => {
      navigate(nextPath, { replace: true });
    }, 3000);
  }

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
        "Failed to save session (results are shown, but this attempt's score was NOT saved):",
        res.status,
        data
      );
      return;
    }

    console.log(
      "Session saved successfully:",
      data
    );
  } catch (err) {
    console.error(
      "Failed to save session:",
      err
    );
  }
}

  const round = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];
  const totalRoundsPlayed = roundTimes.length;
  const memoryAccuracy = totalRoundsPlayed > 0 ? Math.round((memoryCorrectCount / totalRoundsPlayed) * 100) : 0;
  const mathAccuracy = mathTotalAnswered > 0 ? Math.round((mathCorrectCount / mathTotalAnswered) * 100) : 0;
  const totalAttempts = totalRoundsPlayed + mathTotalAnswered;
  const totalCorrect = memoryCorrectCount + mathCorrectCount;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const avgTime = roundTimes.length
    ? Math.round(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="cs-intro-screen">
        <style>{styles}</style>
        <h1>Dual Task</h1>
        <p className="sub">
          Watch a sequence of colors flash by, then solve a few quick math
          questions before you're asked to recall one color from the
          sequence. 3 rounds, and round 3's math question is genuinely
          tough. You've got {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="cs-intro-cards">
          <div className="cs-intro-card">
            <div className="dot" />
            <div className="title">Memorize</div>
            <div className="desc">Colors flash one at a time. Watch closely.</div>
          </div>
          <div className="cs-intro-card">
            <div className="dot" />
            <div className="title">Distract</div>
            <div className="desc">Quick math questions — type the answer.</div>
          </div>
          <div className="cs-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Recall</div>
            <div className="desc">Pick the color that was in that position.</div>
          </div>
        </div>
        <button className="cs-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }
if (phase === "done") {
  return (
    <div className="cs-intro-screen">
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

        <div className="cs-results-grid">
          <div>
            <div className="label">Score</div>
            <div className="value">{score}</div>
          </div>

          <div>
            <div className="label">Accuracy</div>
            <div className="value">{accuracy}%</div>
          </div>

          <div>
            <div className="label">Highest Round</div>
            <div className="value">
              {highestLevelReached}/{ROUNDS.length}
            </div>
          </div>

          <div>
            <div className="label">Max Sequence</div>
            <div className="value">{maxSequenceLength}</div>
          </div>

          <div>
            <div className="label">Memory Accuracy</div>
            <div className="value">{memoryAccuracy}%</div>
          </div>

          <div>
            <div className="label">Math Accuracy</div>
            <div className="value">{mathAccuracy}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
 return (
  <motion.div
    className="cs-wrap"
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
      <div className={`cs-arena ${shake ? "shake" : ""}`}>
        <div className={`cs-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        {phase !== "done" && (
          <div className="cs-arena-header">
            <div>
              <h2>Dual Task</h2>
            </div>
            <div className={`cs-badge ${phase === "sequence" ? "" : "warn"}`}>
              Round {roundIndex + 1} of {ROUNDS.length}
            </div>
          </div>
        )}

        {phase !== "done" && (
          <div className="cs-round-progress-bar">
            <div
              className="cs-round-progress-fill"
              style={{ width: `${(roundIndex / ROUNDS.length) * 100}%` }}
            />
          </div>
        )}

        {phase === "sequence" && (
          <div className="cs-board-area">
            <div className="cs-phase-label">Memorize</div>
            <div
              className="cs-color-box"
              style={{ background: COLOR_HEX[sequence[seqStepIndex]] || "#232A3D" }}
            >
              {sequence[seqStepIndex] || ""}
            </div>
          </div>
        )}

        {phase === "math" && (
          <div className="cs-board-area">
            <div className="cs-phase-label">
              Quick Math — {mathIndex + 1}/{mathQuestions.length}
            </div>
            <div className="cs-question">{mathQuestions[mathIndex]?.question} = ?</div>
            <input
              ref={inputRef}
              className="cs-input"
              type="number"
              value={mathInput}
              disabled={!!mathFeedback}
              onChange={(e) => setMathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitMathAnswer();
              }}
            />
            <button className="cs-btn" onClick={submitMathAnswer} disabled={!!mathFeedback}>
              Submit
            </button>
          </div>
        )}

        {phase === "memory" && memoryQuestion && (
          <div className="cs-board-area">
            <div className="cs-phase-label">Recall</div>
            <div className="cs-question" style={{ fontSize: 22 }}>
              {memoryQuestion.questionText}
            </div>
            <div className="cs-options">
              {memoryQuestion.options.map((opt) => {
                let cls = "cs-option";
                if (memorySelected) {
                  if (opt === memoryQuestion.correctAnswer) cls += " cs-correct";
                  else if (opt === memorySelected) cls += " cs-wrong";
                  else cls += " cs-disabled";
                }
                return (
                  <button key={opt} className={cls} onClick={() => selectMemoryAnswer(opt)}>
                    <span className="swatch" style={{ background: COLOR_HEX[opt] }} />
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "roundBreak" && (
          <div className="cs-board-area">
            <div
              className="cs-color-box"
              style={{
                background: memorySelected === memoryQuestion?.correctAnswer ? "#34D399" : "#F87171",
                fontSize: 18,
              }}
            >
              {memorySelected === memoryQuestion?.correctAnswer ? "Correct!" : "Not quite"}
            </div>
            <div className="cs-phase-label">
              {round.label} round complete
            </div>
          </div>
        )}

      
      </div>

     {phase !== "done" && (
  <div className="cs-sidebar">
    <div className="cs-stat">
      <div className="label">Time Left</div>
      <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
      <div className="cs-progress-bar">
        <div
          className="cs-progress-fill timer"
          style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
        />
      </div>
    </div>

    <div className="cs-stat">
      <div className="label">Score</div>
      <div className="value score">{score}</div>
    </div>

    <div className="cs-stat">
      <div className="label">Avg Reaction Time</div>
      <div className="value">{avgTime || 0}ms</div>
    </div>
  </div>
)}
    </motion.div>
  );
}