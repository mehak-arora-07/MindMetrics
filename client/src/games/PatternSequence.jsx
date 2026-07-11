import { useState, useRef, useEffect, useCallback } from "react";

// Drop into client/src/games/PatternSequence.jsx
// Currently console.logs the final payload — once /api/sessions is ready,
// swap the console.log in endGame() for an actual fetch call (see bottom).

const TOTAL_QUESTIONS = 10;
const OPTIONS_COUNT = 4;
const BASE_TIME_LIMIT_MS = 12000;
const MIN_TIME_LIMIT_MS = 6000;

// Difficulty scales with level: higher level = longer/trickier sequences,
// shorter time limit. Level increases every 3 correct answers in a row.
function generateSequence(level) {
  const type = Math.floor(Math.random() * 3); // 0: arithmetic, 1: geometric, 2: alternating
  const length = 4 + Math.min(Math.floor(level / 2), 3); // 4 to 7 items shown

  let seq = [];
  let answer;

  if (type === 0) {
    // arithmetic: start + step * i
    const start = 1 + Math.floor(Math.random() * (8 + level));
    const step = 1 + Math.floor(Math.random() * (2 + Math.floor(level / 2)));
    seq = Array.from({ length }, (_, i) => start + step * i);
    answer = start + step * length;
  } else if (type === 1) {
    // geometric: start * ratio^i
    const start = 1 + Math.floor(Math.random() * 3);
    const ratio = 2 + Math.floor(Math.random() * (level > 3 ? 2 : 1));
    seq = Array.from({ length }, (_, i) => start * Math.pow(ratio, i));
    answer = start * Math.pow(ratio, length);
  } else {
    // alternating +a -b pattern
    const start = 5 + Math.floor(Math.random() * 10);
    const a = 2 + Math.floor(Math.random() * (2 + level));
    const b = 1 + Math.floor(Math.random() * (2 + level));
    seq = [start];
    for (let i = 1; i < length; i++) {
      seq.push(i % 2 === 1 ? seq[i - 1] + a : seq[i - 1] - b);
    }
    answer = length % 2 === 1 ? seq[length - 1] - b : seq[length - 1] + a;
  }

  // build wrong options near the real answer
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

.ps-intro-screen {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background:
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(167, 139, 250, 0.1), transparent 40%),
    #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px;
  text-align: center;
}

.ps-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.ps-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 440px;
  margin: 0;
  line-height: 1.6;
}

.ps-example {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 20px 28px;
  color: #E5E7EB;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
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
}

.ps-wrap {
  min-height: 100vh;
  width: 100%;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.ps-top-bar {
  width: 100%;
  max-width: 640px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ps-top-bar h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.ps-level-badge {
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #A78BFA;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
}

.ps-progress-bar {
  width: 100%;
  max-width: 640px;
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
}

.ps-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.ps-timer-bar {
  width: 100%;
  max-width: 640px;
  height: 4px;
  background: #232A3D;
  border-radius: 4px;
  overflow: hidden;
}

.ps-timer-fill {
  height: 100%;
  background: #F59E0B;
  transition: width 0.05s linear;
}

.ps-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 640px;
  text-align: center;
}

.ps-card .prompt {
  color: #8B93A7;
  font-size: 13px;
  margin-bottom: 16px;
}

.ps-sequence {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.ps-seq-item {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  min-width: 56px;
  padding: 14px 10px;
  color: #E5E7EB;
  font-size: 20px;
  font-weight: 600;
}

.ps-seq-item.mark {
  border-color: #3B82F6;
  color: #3B82F6;
}

.ps-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.ps-option {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  padding: 16px;
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.1s ease;
}

.ps-option:hover {
  border-color: #3B82F6;
  transform: translateY(-1px);
}

.ps-option.correct {
  border-color: #34D399;
  background: rgba(52, 211, 153, 0.12);
  color: #34D399;
}

.ps-option.wrong {
  border-color: #F87171;
  background: rgba(248, 113, 113, 0.12);
  color: #F87171;
}

.ps-feedback {
  margin-top: 18px;
  font-size: 13px;
  color: #8B93A7;
  min-height: 18px;
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
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 14px;
}

.ps-results-grid .label { color: #8B93A7; font-size: 11px; }
.ps-results-grid .value { color: #E5E7EB; font-size: 18px; font-weight: 600; }
`;

export default function PatternSequence({ onComplete }) {
  const [phase, setPhase] = useState("instructions"); // instructions | playing | done
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(BASE_TIME_LIMIT_MS);

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
          handleAnswer(null); // timed out
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

  function handleAnswer(option) {
    if (selected !== null) return; // already answered
    clearInterval(timerIntervalRef.current);

    const timeTakenMs = Math.round(performance.now() - questionStartRef.current);
    const isCorrect = option === current.answer;

    setSelected(option ?? "timeout");
    setAttempts((a) => a + 1);
    setQuestionTimesMs((arr) => [...arr, timeTakenMs]);

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setFeedback("Correct!");
      setStreak((s) => {
        const ns = s + 1;
        if (ns % 3 === 0) {
          setLevel((lvl) => {
            const nl = lvl + 1;
            setHighestLvl((h) => Math.max(h, nl));
            return nl;
          });
        }
        return ns;
      });
    } else {
      setStreak(0);
      setFeedback(option === null ? "Time's up!" : "Not quite.");
    }

    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex >= TOTAL_QUESTIONS) {
        endGame();
      } else {
        setQuestionIndex(nextIndex);
        loadQuestion(level);
      }
    }, 900);
  }

  function endGame() {
    const endedAt = new Date().toISOString();
    const avgTimePerQuestionMs = questionTimesMs.length
      ? Math.round(questionTimesMs.reduce((a, b) => a + b, 0) / questionTimesMs.length)
      : 0;

    const payload = {
      sessionId: crypto.randomUUID(),
      userId: null, // fill from auth context
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

  if (phase === "instructions") {
    return (
      <div className="ps-intro-screen">
        <style>{styles}</style>
        <h1>Pattern Sequence</h1>
        <p className="sub">
          You'll see a short sequence of numbers. Figure out the pattern and
          pick what comes next. Get 3 right in a row and the difficulty
          levels up — sequences get longer and the timer gets shorter.
        </p>
        <div className="ps-example">
          2 &nbsp; 4 &nbsp; 6 &nbsp; 8 &nbsp; <span>?</span>
        </div>
        <button className="ps-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="ps-wrap">
        <style>{styles}</style>
        <div className="ps-card">
          <h2 style={{ color: "#E5E7EB", fontSize: 22, marginBottom: 24 }}>
            Round over!
          </h2>
          <div className="ps-results-grid">
            <div>
              <div className="label">Correct</div>
              <div className="value">
                {correctCount}/{TOTAL_QUESTIONS}
              </div>
            </div>
            <div>
              <div className="label">Accuracy</div>
              <div className="value">
                {Math.round((correctCount / TOTAL_QUESTIONS) * 100)}%
              </div>
            </div>
            <div>
              <div className="label">Highest Level</div>
              <div className="value">{highestLvl}</div>
            </div>
            <div>
              <div className="label">Avg Time / Q</div>
              <div className="value">{avgTimePerQuestionMs}ms</div>
            </div>
          </div>
          <button className="ps-btn" style={{ marginTop: 24 }} onClick={() => setPhase("instructions")}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-wrap">
      <style>{styles}</style>

      <div className="ps-top-bar">
        <h2>Pattern Sequence</h2>
        <div className="ps-level-badge">Level {level}</div>
      </div>

      <div className="ps-progress-bar">
        <div
          className="ps-progress-fill"
          style={{ width: `${(questionIndex / TOTAL_QUESTIONS) * 100}%` }}
        />
      </div>

      <div className="ps-timer-bar">
        <div
          className="ps-timer-fill"
          style={{ width: `${(timeLeft / timeLimitRef.current) * 100}%` }}
        />
      </div>

      {current && (
        <div className="ps-card">
          <div className="prompt">
            Question {questionIndex + 1} of {TOTAL_QUESTIONS} — what comes next?
          </div>
          <div className="ps-sequence">
            {current.seq.map((n, i) => (
              <div key={i} className="ps-seq-item">
                {n}
              </div>
            ))}
            <div className="ps-seq-item mark">?</div>
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
          <div className="ps-feedback">{feedback}</div>
        </div>
      )}
    </div>
  );
}
