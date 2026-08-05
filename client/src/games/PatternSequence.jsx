import { useState, useRef, useEffect, useCallback } from "react";
import { saveGameSession } from "../utils/session";
import { useNavigate } from "react-router-dom";
import { getNextGamePath } from "../utils/gameSequence";
import { motion } from "framer-motion";
import { setCurrentGameIndex } from "../utils/session";
import useDisableBackButton from "../hooks/useDisableBackButton";

// Drop into client/src/games/PatternSequence.jsx
//
// Fetches real questions from GET /api/questions/pattern_sequence
// (matching your actual questions.js route: { success, questions }).
// Falls back to a small local procedural generator only if that fetch
// fails, so the game never breaks even if the server hiccups.
//
// Saves completed sessions via POST /api/sessions
// (matching your actual sessions.js route + Sessions.js schema:
// assessmentId, gameId, accuracy, avgTimeMs, metrics, completed).

const TOTAL_QUESTIONS = 10;
const CORRECT_POINTS = 10;
const BASE_TIME_LIMIT_MS = 12000;
const MIN_TIME_LIMIT_MS = 6000;

const TIER_NAMES = ["Warm-up", "Getting Sharper", "Sharp", "Very Sharp", "Expert", "Master"];
function tierName(level) {
  return TIER_NAMES[Math.min(level - 1, TIER_NAMES.length - 1)];
}

// Which difficulty string to prefer from the bank at a given level.
// Your QuestionBank schema only allows "Easy" | "Medium" | "Hard".
function difficultyForLevel(level) {
  if (level <= 2) return "Easy";
  if (level <= 4) return "Medium";
  return "Hard";
}

// ---- Fallback generator, used ONLY if the real bank fetch fails ----
function generateFallbackQuestion(level) {
  const type = Math.floor(Math.random() * 3);
  const length = 4 + Math.min(Math.floor(level / 2), 3);
  let seq = [];
  let answer;

  if (type === 0) {
    const start = 1 + Math.floor(Math.random() * (8 + level));
    const step = 1 + Math.floor(Math.random() * (2 + Math.floor(level / 2)));
    seq = Array.from({ length }, (_, i) => start + step * i);
    answer = start + step * length;
  } else if (type === 1) {
    const start = 1 + Math.floor(Math.random() * 3);
    const ratio = 2 + Math.floor(Math.random() * (level > 3 ? 2 : 1));
    seq = Array.from({ length }, (_, i) => start * Math.pow(ratio, i));
    answer = start * Math.pow(ratio, length);
  } else {
    const start = 5 + Math.floor(Math.random() * 10);
    const a = 2 + Math.floor(Math.random() * (2 + level));
    const b = 1 + Math.floor(Math.random() * (2 + level));
    seq = [start];
    for (let i = 1; i < length; i++) {
      seq.push(i % 2 === 1 ? seq[i - 1] + a : seq[i - 1] - b);
    }
    answer = length % 2 === 1 ? seq[length - 1] - b : seq[length - 1] + a;
  }

  const optionsSet = new Set([answer]);
  while (optionsSet.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const candidate = answer + (offset === 0 ? 3 : offset);
    if (candidate !== answer) optionsSet.add(candidate);
  }
  const options = Array.from(optionsSet)
    .sort(() => Math.random() - 0.5)
    .map(String);

  return {
    patternText: seq.join(", ") + ", ?",
    options,
    answer: String(answer),
    difficulty: level <= 2 ? "Easy" : level <= 4 ? "Medium" : "Hard",
  };
}

function timeLimitForLevel(level) {
  const ramp = Math.min(level / 8, 1);
  return Math.round(BASE_TIME_LIMIT_MS - ramp * (BASE_TIME_LIMIT_MS - MIN_TIME_LIMIT_MS));
}

function useCountUp(value, duration = 700, active = true) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    let frame;
    function step(ts) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, active]);
  return display;
}

const RING_R = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

const styles = `
* { box-sizing: border-box; }

html, body, #root {
  margin: 0 !important;
  padding: 0 !important;
  background: #0B0F19;
  width: 100% !important;
  max-width: none !important;
  height: 100vh;
  overflow: hidden;
  border: none !important;
  text-align: left !important;
}

@keyframes ps-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ps-flame-pop {
  0% { transform: scale(0.7); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes ps-toast-in {
  0% { opacity: 0; transform: translate(-50%, -14px); }
  15% { opacity: 1; transform: translate(-50%, 0); }
  85% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -8px); }
}
@keyframes ps-pattern-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.ps-screen { animation: ps-fade-in 0.35s ease; }

.ps-intro-screen {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background:
    radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.08), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08), transparent 40%),
    #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px;
  text-align: center;
}

.ps-intro-screen h1 { color: #E5E7EB; font-size: 32px; font-weight: 700; margin: 0; }
.ps-intro-screen .sub { color: #8B93A7; font-size: 15px; max-width: 460px; margin: 0; line-height: 1.6; }

.ps-example {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 26px;
  color: #E5E7EB;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 1.5px;
}
.ps-example span { color: #3B82F6; }

.ps-btn {
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
.ps-btn:active { transform: scale(0.97); }
.ps-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ps-wrap {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  height: 100vh;
  width: 100%;
  padding: 32px;
  font-family: 'Inter', -apple-system, sans-serif;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.06), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.06), transparent 40%),
    #0B0F19;
}

.ps-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.ps-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ps-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ps-topbar h2 { color: #E5E7EB; font-size: 17px; font-weight: 600; margin: 0; }
.ps-topright { display: flex; align-items: center; gap: 10px; }

.ps-round-badge {
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #A78BFA;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
}

.ps-flame {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #F59E0B;
}
.ps-flame .icon { animation: ps-flame-pop 0.3s ease; display: inline-block; }

.ps-progress-bar {
  width: 100%;
  height: 5px;
  background: #232A3D;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 8px;
}
.ps-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.15s linear;
}

.ps-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
}

.ps-prompt-banner {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px 20px;
  color: #E5E7EB;
  font-size: 14px;
  text-align: center;
}

.ps-arena {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 36px 30px;
  overflow: hidden;
}

.ps-ring-wrap { display: flex; justify-content: center; }
.ps-ring-svg { transform: rotate(-90deg); }

.ps-pattern-display {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 18px 28px;
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  max-width: 90%;
  opacity: 0;
  animation: ps-pattern-in 0.3s ease forwards;
}

.ps-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 380px;
}

.ps-option {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #232A3D;
  border-radius: 10px;
  padding: 15px;
  color: #E5E7EB;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}
.ps-option:hover:not(:disabled) { border-color: #3B82F6; background: rgba(59, 130, 246, 0.06); }
.ps-option:active:not(:disabled) { transform: scale(0.97); }
.ps-option:disabled { cursor: default; }
.ps-option.correct { border-color: #34D399; background: rgba(52, 211, 153, 0.12); color: #34D399; }
.ps-option.wrong { border-color: #F87171; background: rgba(248, 113, 113, 0.1); color: #F87171; }

.ps-levelup-toast {
  position: absolute;
  top: 14px;
  left: 50%;
  background: linear-gradient(90deg, rgba(52, 211, 153, 0.16), rgba(59, 130, 246, 0.16));
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #E5E7EB;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 20px;
  animation: ps-toast-in 1.4s ease forwards;
  z-index: 10;
  white-space: nowrap;
}

.ps-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}
.ps-stat .label { color: #8B93A7; font-size: 11px; margin-bottom: 4px; }
.ps-stat .value { color: #E5E7EB; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ps-stat .value.correct { color: #34D399; }

.ps-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}
.ps-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 12px;
}
.ps-results-grid .label { color: #8B93A7; font-size: 11px; }
.ps-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

export default function PatternSequence({ onComplete, userId, assessmentId }) {
    const navigate = useNavigate();
useDisableBackButton();
  const [phase, setPhase] = useState("instructions"); // instructions | playing | done
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME_LIMIT_MS);
  const [levelUpToast, setLevelUpToast] = useState(null);

  const [masterPool, setMasterPool] = useState([]); // fetched once from the real bank
  const [workingPool, setWorkingPool] = useState([]); // consumed per session
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSource, setBankSource] = useState(null); // "api" | "local"

  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [questionTimesMs, setQuestionTimesMs] = useState([]);
  const [highestLvl, setHighestLvl] = useState(1);
  const [score, setScore] = useState(0);

  const questionStartRef = useRef(null);
  const startedAtRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timeLimitRef = useRef(BASE_TIME_LIMIT_MS);

  // Mirrors of the scoring state. handleAnswer schedules endGame() inside a
  // setTimeout right after calling setCorrectCount/setHighestLvl with
  // functional updaters — but endGame's own closure still sees the
  // pre-update values of correctCount/highestLvl until the next render.
  // Refs avoid that off-by-one entirely.
  const correctCountRef = useRef(0);
  const attemptsRef = useRef(0);
  const questionTimesMsRef = useRef([]);
  const highestLvlRef = useRef(1);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);

  // ---- Load real questions from the bank on mount ----
  useEffect(() => {
    async function loadQuestionBank() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/questions/pattern_sequence`);
        const result = await res.json();

        console.log("Fetched question count:", result.questions?.length);
        console.log("Fetched question IDs:", result.questions?.map((q) => q.questionId));

        if (!result.success || !result.questions || result.questions.length === 0) {
          throw new Error("Bank empty or request unsuccessful");
        }

        const normalized = result.questions.map((q) => ({
          questionId: q.questionId,
          difficulty: q.difficulty,
          patternText: q.data.pattern,
          options: [
            q.data["Option A"],
            q.data["Option B"],
            q.data["Option C"],
            q.data["Option D"],
          ],
          answer: q.data.Correct,
        }));

        setMasterPool(normalized);
        setBankSource("api");
      } catch (err) {
        console.warn("Falling back to local generator — bank fetch failed:", err.message);
        setMasterPool([]); // empty means "use generateFallbackQuestion" per-question
        setBankSource("local");
      } finally {
        setBankLoaded(true);
      }
    }
    loadQuestionBank();
  }, []);

  const loadQuestion = useCallback(
    (lvl, pool) => {
      let q;
      const targetDifficulty = difficultyForLevel(lvl);

      if (pool.length > 0) {
        const matching = pool.filter((item) => item.difficulty === targetDifficulty);
        const candidates = matching.length > 0 ? matching : pool;
        const idx = Math.floor(Math.random() * candidates.length);
        q = candidates[idx];
        setWorkingPool(pool.filter((item) => item.questionId !== q.questionId));
      } else {
        q = generateFallbackQuestion(lvl);
      }

      setCurrent(q);
      setSelected(null);
      const limit = timeLimitForLevel(lvl);
      timeLimitRef.current = limit;
      setTimeLeft(limit);
      questionStartRef.current = performance.now();
    },
    []
  );

  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) {
          clearInterval(timerIntervalRef.current);
          handleAnswer(null);
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => clearInterval(timerIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIndex, selected]);

  function startGame() {
    setPhase("playing");
    setLevel(1);
    levelRef.current = 1;
    setStreak(0);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAttempts(0);
    setQuestionTimesMs([]);
    setHighestLvl(1);
    setScore(0);
    correctCountRef.current = 0;
    attemptsRef.current = 0;
    questionTimesMsRef.current = [];
    highestLvlRef.current = 1;
    scoreRef.current = 0;
    startedAtRef.current = new Date().toISOString();
    const freshPool = [...masterPool];
    setWorkingPool(freshPool);
    loadQuestion(1, freshPool);
  }

  function handleAnswer(option) {
    if (selected !== null) return;
    clearInterval(timerIntervalRef.current);

    const timeTakenMs = Math.round(performance.now() - questionStartRef.current);
    const isCorrect = option === current.answer;

    setSelected(option ?? "timeout");
    setAttempts((a) => {
      attemptsRef.current = a + 1;
      return a + 1;
    });
    setQuestionTimesMs((arr) => {
      const next = [...arr, timeTakenMs];
      questionTimesMsRef.current = next;
      return next;
    });

    if (isCorrect) {
      setCorrectCount((c) => {
        correctCountRef.current = c + 1;
        return c + 1;
      });
      setScore((s) => {
        scoreRef.current = s + CORRECT_POINTS;
        return s + CORRECT_POINTS;
      });
      setStreak((s) => {
        const ns = s + 1;
        if (ns % 3 === 0) {
          setLevel((lvl) => {
            const nl = lvl + 1;
            levelRef.current = nl;
            setHighestLvl((h) => {
              highestLvlRef.current = Math.max(h, nl);
              return Math.max(h, nl);
            });
            setLevelUpToast(`Level up — ${tierName(nl)}`);
            setTimeout(() => setLevelUpToast(null), 1400);
            return nl;
          });
        }
        return ns;
      });
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= TOTAL_QUESTIONS) {
        endGame();
      } else {
        setQuestionIndex(nextIndex);
        loadQuestion(levelRef.current, workingPool);
      }
    }, 800);
  }

  async function endGame() {
  const endedAt = new Date().toISOString();

  const finalCorrectCount = correctCountRef.current;
  const finalAttempts = attemptsRef.current;
  const finalQuestionTimesMs = questionTimesMsRef.current;
  const finalHighestLvl = highestLvlRef.current;
  const finalScore = scoreRef.current;

  const avgTimePerQuestionMs = finalQuestionTimesMs.length
    ? Math.round(
        finalQuestionTimesMs.reduce((a, b) => a + b, 0) /
          finalQuestionTimesMs.length
      )
    : 0;

  const accuracy =
    TOTAL_QUESTIONS > 0
      ? Math.round(
          (finalCorrectCount / TOTAL_QUESTIONS) * 100
        )
      : 0;

  const payload = {
    assessmentId: localStorage.getItem("assessmentId"),
    gameId: "pattern_sequence",
    accuracy,
    avgTimeMs: avgTimePerQuestionMs,
    completed: true,
    metrics: {
      score: finalScore,
      questionsTotal: TOTAL_QUESTIONS,
      attempts: finalAttempts,
      correct: finalCorrectCount,
      avgTimePerQuestionMs,
      highestLvl: finalHighestLvl,
      startedAt: startedAtRef.current,
      endedAt,
    },
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

  const nextPath = getNextGamePath("pattern_sequence");
  if (nextPath) {
    setCurrentGameIndex(2)
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

  const avgTimePerQuestionMs = questionTimesMs.length
    ? Math.round(questionTimesMs.reduce((a, b) => a + b, 0) / questionTimesMs.length)
    : 0;

  const animatedCorrect = useCountUp(correctCount, 700, phase === "done");
  const animatedAccuracy = useCountUp(
    Math.round((correctCount / TOTAL_QUESTIONS) * 100),
    700,
    phase === "done"
  );
  const animatedTime = useCountUp(avgTimePerQuestionMs, 700, phase === "done");

  if (phase === "instructions") {
    return (
      <div className="ps-intro-screen ps-screen">
        <style>{styles}</style>
        <h1>Pattern Sequence</h1>
        <p className="sub">
          You'll see a short pattern — numbers, letters, or shapes. Identify
          the rule and select what comes next. Chain correct answers to
          level up.
        </p>
        <div className="ps-example">
          2 &nbsp; 4 &nbsp; 6 &nbsp; 8 &nbsp; <span>?</span>
        </div>
        <button className="ps-btn" onClick={startGame} disabled={!bankLoaded}>
          {bankLoaded ? "Start the Game" : ""}
        </button>
        {bankLoaded && (
          <p style={{ color: "#4B5468", fontSize: 11 }}>
            {bankSource === "api" ? "" : "Using offline question set"}
          </p>
        )}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="ps-intro-screen ps-screen">
        <style>{styles}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "#E5E7EB", fontSize: 22, marginBottom: 24 }}>Scores</h2>
          <div className="ps-results-grid">
            <div>
              <div className="label">Score</div>
              <div className="value">{score}</div>
            </div>
            <div>
              <div className="label">Correct</div>
              <div className="value">
                {animatedCorrect}/{TOTAL_QUESTIONS}
              </div>
            </div>
            <div>
              <div className="label">Accuracy</div>
              <div className="value">{animatedAccuracy}%</div>
            </div>
            <div>
              <div className="label">Reached</div>
              <div className="value">{tierName(highestLvl)}</div>
            </div>
            <div>
              <div className="label">Avg Time / Question</div>
              <div className="value">{animatedTime}ms</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ringOffset = RING_CIRC * (1 - timeLeft / timeLimitRef.current);

  return (
  <motion.div
    className="ps-wrap ps-screen"
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
      <div className="ps-main">
        <div className="ps-topbar">
          <h2>Pattern Sequence</h2>
          <div className="ps-topright">
            {streak >= 2 && (
              <div className="ps-flame" key={streak}>
                <span className="icon">🔥</span> {streak}
              </div>
            )}
            <div className="ps-round-badge">Round {questionIndex + 1} of {TOTAL_QUESTIONS}</div>
          </div>
        </div>

        <div className="ps-progress-bar">
          <div
            className="ps-progress-fill"
            style={{ width: `${(questionIndex / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>

        <div className="ps-prompt-banner">
          Question {questionIndex + 1} of {TOTAL_QUESTIONS} — what comes next?
        </div>

        <div className="ps-arena">
          {levelUpToast && <div className="ps-levelup-toast">{levelUpToast}</div>}

          {current && (
            <>
              <div className="ps-ring-wrap">
                <svg className="ps-ring-svg" width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                  <circle
                    cx="32"
                    cy="32"
                    r={RING_R}
                    fill="none"
                    stroke={timeLeft < 3000 ? "#F87171" : "#3B82F6"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={ringOffset}
                    style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }}
                  />
                </svg>
              </div>

              <div className="ps-pattern-display" key={questionIndex}>
                {current.patternText}
              </div>

              <div className="ps-options">
                {current.options.map((opt) => {
                  let cls = "ps-option";
                  if (selected !== null) {
                    if (opt === current.answer) cls += " correct";
                    else if (opt === selected) cls += " wrong";
                  }
                  return (
                    <button
                      key={opt}
                      className={cls}
                      disabled={selected !== null}
                      onClick={() => handleAnswer(opt)}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ps-sidebar">
        <div className="ps-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeft / 1000)}s</div>
          <div className="ps-progress-bar">
            <div
              className="ps-progress-fill timer"
              style={{ width: `${(timeLeft / timeLimitRef.current) * 100}%` }}
            />
          </div>
        </div>
        <div className="ps-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="ps-stat">
          <div className="label">Avg Reaction Time</div>
          <div className="value">{avgTimePerQuestionMs || 0}ms</div>
        </div>
      </div>
    </motion.div>
  );
}
