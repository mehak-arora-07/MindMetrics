import { useState, useRef, useEffect, useCallback } from "react";

// Drop into client/src/games/PatternSequence.jsx
// Currently console.logs the final payload — once /api/sessions is ready,
// swap the console.log in endGame() for an actual fetch call (see bottom).

const TOTAL_QUESTIONS = 10;
const OPTIONS_COUNT = 4;
const BASE_TIME_LIMIT_MS = 12000;
const MIN_TIME_LIMIT_MS = 6000;

const TIER_NAMES = ["Warm-up", "Getting Sharper", "Sharp", "Very Sharp", "Expert", "Master"];
function tierName(level) {
  return TIER_NAMES[Math.min(level - 1, TIER_NAMES.length - 1)];
}

function generateSequence(level) {
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
  while (optionsSet.size < OPTIONS_COUNT) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const candidate = answer + (offset === 0 ? 3 : offset);
    if (candidate !== answer) optionsSet.add(candidate);
  }
  const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

  return { seq, answer, options };
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
  min-height: 100vh;
  border: none !important;
  text-align: left !important;
}

@keyframes ps-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ps-flow {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes ps-tile-pop {
  from { opacity: 0; transform: scale(0.6) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes ps-flame-pop {
  0% { transform: scale(0.7); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes ps-toast-in {
  0% { opacity: 0; transform: translate(-50%, -16px); }
  15% { opacity: 1; transform: translate(-50%, 0); }
  85% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -10px); }
}

@keyframes ps-confetti {
  from { transform: translate(0, 0) scale(1); opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
}

.ps-screen { animation: ps-fade-in 0.35s ease; }

.ps-intro-screen {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px;
  text-align: center;
}

.ps-eyebrow {
  color: #7C8A9E;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.ps-intro-screen h1 {
  color: #EDEFF3;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.3px;
  margin: 0;
}

.ps-intro-screen .sub {
  color: #8B93A7;
  font-size: 14.5px;
  max-width: 420px;
  margin: 0;
  line-height: 1.65;
}

.ps-example {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 18px 26px;
  color: #EDEFF3;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 1.5px;
}

.ps-example span { color: #3B82F6; }

.ps-btn {
  background: #34D399;
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 12px 30px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.ps-btn:hover { background: #3EE0A8; box-shadow: 0 4px 18px rgba(52, 211, 153, 0.25); }
.ps-btn:active { transform: scale(0.97); }

.ps-wrap {
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.05), transparent 45%),
    radial-gradient(circle at 85% 90%, rgba(167, 139, 250, 0.05), transparent 45%),
    #0B0F19;
  background-image:
    radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.05), transparent 45%),
    radial-gradient(circle at 85% 90%, rgba(167, 139, 250, 0.05), transparent 45%),
    radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    #0B0F19;
  background-size: auto, auto, 26px 26px, auto;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  position: relative;
}

.ps-top-bar {
  width: 100%;
  max-width: 640px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ps-top-bar h2 {
  color: #EDEFF3;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.2px;
}

.ps-top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ps-tier-badge {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60A5FA;
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

.ps-flame .icon {
  animation: ps-flame-pop 0.3s ease;
  display: inline-block;
}

.ps-progress-bar {
  width: 100%;
  max-width: 640px;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.ps-progress-fill {
  height: 100%;
  background: #34D399;
  transition: width 0.3s ease;
}

.ps-card {
  background: rgba(255, 255, 255, 0.035);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 36px 40px 40px;
  width: 100%;
  max-width: 640px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  position: relative;
  animation: ps-fade-in 0.3s ease;
}

.ps-ring-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 6px;
}

.ps-ring-svg { transform: rotate(-90deg); }

.ps-card .prompt {
  color: #8B93A7;
  font-size: 13px;
  margin: 6px 0 20px;
}

.ps-sequence {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
  margin-bottom: 34px;
  position: relative;
}

.ps-seq-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  min-width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #EDEFF3;
  font-size: 17px;
  font-weight: 700;
  opacity: 0;
  animation: ps-tile-pop 0.35s ease forwards;
  position: relative;
  z-index: 2;
}

.ps-seq-item.mark {
  border-color: #3B82F6;
  color: #60A5FA;
  background: rgba(59, 130, 246, 0.1);
}

.ps-seq-link {
  width: 22px;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(59, 130, 246, 0.7) 50%,
    rgba(59, 130, 246, 0.15) 100%
  );
  background-size: 200% 100%;
  animation: ps-flow 1.8s linear infinite;
  opacity: 0;
  animation: ps-flow 1.8s linear infinite, ps-fade-in 0.3s ease forwards;
}

.ps-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  position: relative;
}

.ps-option {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid var(--accent, rgba(255, 255, 255, 0.15));
  border-radius: 10px;
  padding: 15px;
  color: #EDEFF3;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.ps-option:hover:not(:disabled) {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.06);
}

.ps-option:active:not(:disabled) { transform: scale(0.97); }
.ps-option:disabled { cursor: default; }

.ps-option.correct {
  border-color: rgba(52, 211, 153, 0.5);
  background: rgba(52, 211, 153, 0.12);
  color: #34D399;
  transform: scale(1.03);
}

.ps-option.wrong {
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(248, 113, 113, 0.1);
  color: #F87171;
}

.ps-feedback {
  margin-top: 18px;
  font-size: 13px;
  color: #8B93A7;
  min-height: 18px;
}

.ps-confetti-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  pointer-events: none;
  animation: ps-confetti 0.6s ease-out forwards;
}

.ps-levelup-toast {
  position: absolute;
  top: 12px;
  left: 50%;
  background: linear-gradient(90deg, rgba(52, 211, 153, 0.16), rgba(59, 130, 246, 0.16));
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #EDEFF3;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 20px;
  animation: ps-toast-in 1.4s ease forwards;
  z-index: 10;
  white-space: nowrap;
}

.ps-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.ps-results-grid div {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 15px;
}

.ps-results-grid .label { color: #8B93A7; font-size: 11px; margin-bottom: 4px; }
.ps-results-grid .value {
  color: #EDEFF3;
  font-size: 19px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
`;

const CONFETTI_COLORS = ["#34D399", "#3B82F6", "#F59E0B", "#A78BFA"];

export default function PatternSequence({ onComplete }) {
  const [phase, setPhase] = useState("instructions");
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(BASE_TIME_LIMIT_MS);
  const [confetti, setConfetti] = useState([]);
  const [levelUpToast, setLevelUpToast] = useState(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [questionTimesMs, setQuestionTimesMs] = useState([]);
  const [highestLvl, setHighestLvl] = useState(1);

  const questionStartRef = useRef(null);
  const startedAtRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timeLimitRef = useRef(BASE_TIME_LIMIT_MS);

  const loadQuestion = useCallback((lvl) => {
    const q = generateSequence(lvl);
    setCurrent(q);
    setSelected(null);
    setFeedback("");
    const limit = timeLimitForLevel(lvl);
    timeLimitRef.current = limit;
    setTimeLeft(limit);
    questionStartRef.current = performance.now();
  }, []);

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
    setStreak(0);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAttempts(0);
    setQuestionTimesMs([]);
    setHighestLvl(1);
    startedAtRef.current = new Date().toISOString();
    loadQuestion(1);
  }

  function spawnConfetti() {
    const dots = Array.from({ length: 8 }, (_, i) => ({
      id: crypto.randomUUID(),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: (Math.random() - 0.5) * 160,
      dy: (Math.random() - 0.5) * 100 - 30,
    }));
    setConfetti(dots);
    setTimeout(() => setConfetti([]), 650);
  }

  function handleAnswer(option) {
    if (selected !== null) return;
    clearInterval(timerIntervalRef.current);

    const timeTakenMs = Math.round(performance.now() - questionStartRef.current);
    const isCorrect = option === current.answer;

    setSelected(option ?? "timeout");
    setAttempts((a) => a + 1);
    setQuestionTimesMs((arr) => [...arr, timeTakenMs]);

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setFeedback("Correct");
      spawnConfetti();
      setStreak((s) => {
        const ns = s + 1;
        if (ns % 3 === 0) {
          setLevel((lvl) => {
            const nl = lvl + 1;
            setHighestLvl((h) => Math.max(h, nl));
            setLevelUpToast(`Level up — ${tierName(nl)}`);
            setTimeout(() => setLevelUpToast(null), 1400);
            return nl;
          });
        }
        return ns;
      });
    } else {
      setStreak(0);
      setFeedback(option === null ? "Time's up" : "Not quite");
    }

    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= TOTAL_QUESTIONS) {
        endGame();
      } else {
        setQuestionIndex(nextIndex);
        loadQuestion(level);
      }
    }, 800);
  }

  function endGame() {
    const endedAt = new Date().toISOString();
    const avgTimePerQuestionMs = questionTimesMs.length
      ? Math.round(questionTimesMs.reduce((a, b) => a + b, 0) / questionTimesMs.length)
      : 0;

    const payload = {
      sessionId: crypto.randomUUID(),
      userId: null,
      gameId: "pattern_sequence",
      startedAt: startedAtRef.current,
      endedAt,
      completed: true,
      metrics: {
        questionsTotal: TOTAL_QUESTIONS,
        attempts,
        correct: correctCount,
        avgTimePerQuestionMs,
        highestLvl,
      },
    };

    console.log("Session payload ready:", payload);

    // Once /api/sessions exists, replace the console.log above with:
    //
    // fetch("http://localhost:5000/api/sessions", {
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

  const avgTimePerQuestionMs = questionTimesMs.length
    ? Math.round(questionTimesMs.reduce((a, b) => a + b, 0) / questionTimesMs.length)
    : 0;
  const accuracy = Math.round((correctCount / TOTAL_QUESTIONS) * 100);

  const animatedCorrect = useCountUp(correctCount, 700, phase === "done");
  const animatedAccuracy = useCountUp(accuracy, 700, phase === "done");
  const animatedLevel = useCountUp(highestLvl, 700, phase === "done");
  const animatedTime = useCountUp(avgTimePerQuestionMs, 700, phase === "done");

  if (phase === "instructions") {
    return (
      <div className="ps-intro-screen ps-screen">
        <style>{styles}</style>
        <div className="ps-eyebrow">Cognitive Assessment</div>
        <h1>Pattern Sequence</h1>
        <p className="sub">
          You'll see a short sequence of numbers. Identify the pattern and
          select what comes next. Chain correct answers to level up —
          sequences get longer and the clock gets tighter.
        </p>
        <div className="ps-example">
          2 &nbsp; 4 &nbsp; 6 &nbsp; 8 &nbsp; <span>?</span>
        </div>
        <button className="ps-btn" onClick={startGame}>
          Begin Assessment
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="ps-wrap ps-screen">
        <style>{styles}</style>
        <div className="ps-card">
          <div className="ps-eyebrow" style={{ marginBottom: 10 }}>
            Assessment Complete
          </div>
          <h2 style={{ color: "#EDEFF3", fontSize: 21, fontWeight: 600, marginBottom: 28 }}>
            Here's how you did
          </h2>
          <div className="ps-results-grid">
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
          <button
            className="ps-btn"
            style={{ marginTop: 26 }}
            onClick={() => setPhase("instructions")}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const ringOffset = RING_CIRC * (1 - timeLeft / timeLimitRef.current);

  return (
    <div className="ps-wrap ps-screen">
      <style>{styles}</style>

      <div className="ps-top-bar">
        <h2>Pattern Sequence</h2>
        <div className="ps-top-right">
          {streak >= 2 && (
            <div className="ps-flame" key={streak}>
              <span className="icon">🔥</span> {streak}
            </div>
          )}
          <div className="ps-tier-badge">{tierName(level)}</div>
        </div>
      </div>

      <div className="ps-progress-bar">
        <div
          className="ps-progress-fill"
          style={{ width: `${(questionIndex / TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>

      {current && (
        <div className="ps-card" key={questionIndex}>
          {levelUpToast && <div className="ps-levelup-toast">{levelUpToast}</div>}

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

          <div className="prompt">
            Question {questionIndex + 1} of {TOTAL_QUESTIONS} — what comes next?
          </div>

          <div className="ps-sequence">
            {current.seq.map((n, i) => (
              <div key={`tile-${i}`} style={{ display: "contents" }}>
                <div
                  className="ps-seq-item"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {n}
                </div>
                <div
                  className="ps-seq-link"
                  style={{ animationDelay: `${i * 70 + 40}ms, ${i * 70 + 40}ms` }}
                />
              </div>
            ))}
            <div
              className="ps-seq-item mark"
              style={{ animationDelay: `${current.seq.length * 70}ms` }}
            >
              ?
            </div>
          </div>

          <div className="ps-options">
            {confetti.map((c) => (
              <div
                key={c.id}
                className="ps-confetti-dot"
                style={{ background: c.color, "--dx": `${c.dx}px`, "--dy": `${c.dy}px` }}
              />
            ))}
            {current.options.map((opt, i) => {
              let cls = "ps-option";
              if (selected !== null) {
                if (opt === current.answer) cls += " correct";
                else if (opt === selected) cls += " wrong";
              }
              const accentColors = ["#34D399", "#3B82F6", "#A78BFA", "#F59E0B"];
              return (
                <button
                  key={opt}
                  className={cls}
                  disabled={selected !== null}
                  onClick={() => handleAnswer(opt)}
                  style={{ "--accent": accentColors[i % accentColors.length] }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="ps-feedback">{feedback}</div>
        </div>
      )}
    </div>
  );
}
