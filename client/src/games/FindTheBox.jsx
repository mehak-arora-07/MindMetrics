import { useState, useRef, useEffect } from "react";

// Drop into client/src/games/FindTheBox.jsx
// Same visual family as DualTask / MemoryMatrix / HiddenSymbol — dark arena, mint/gold/red accents.
// POSTs the completed session to POST /api/sessions on game end.
// Pass `userId` and `assessmentId` in as props from wherever those live
// in your app (auth context / the active assessment route).
//
// Matches the Sessions mongoose schema:
//   { sessionId, userId, assessmentId, gameId, accuracy, avgTimeMs, metrics, completed }
// Assessment (overallScore / status) is intentionally NOT touched here —
// that should be aggregated server-side (or by whatever orchestrates the
// full multi-game assessment) once all games in the assessment are done.

const SESSION_TIME_LIMIT_MS = 75000; // overall safety net, same pattern as DualTask

const ROUNDS = [
  { label: "Round 1", tier: "Easy", timeLimitMs: 15000, boxCount: 5 },
  { label: "Round 2", tier: "Easy", timeLimitMs: 13000, boxCount: 5 },
  { label: "Round 3", tier: "Medium", timeLimitMs: 11000, boxCount: 5 },
  { label: "Round 4", tier: "Medium", timeLimitMs: 10000, boxCount: 6 },
  { label: "Round 5", tier: "Hard", timeLimitMs: 9000, boxCount: 6 },
  { label: "Round 6", tier: "Hard", timeLimitMs: 8000, boxCount: 6 },
];

const POINTS_PER_TIER = { Easy: 10, Medium: 15, Hard: 20 };
const ROUND_REVEAL_MS = 500; // brief correct/wrong reveal before the pause
const ROUND_BREAK_MS = 700;
const MAX_POSSIBLE_SCORE = ROUNDS.reduce((sum, r) => sum + POINTS_PER_TIER[r.tier], 0);

const ALL_LABELS = ["A", "B", "C", "D", "E", "F"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickQuestion(tier, usedIds, bank) {
  const candidates = bank.filter((q) => q.tier === tier && !usedIds.includes(q.id));
  const pool = candidates.length > 0 ? candidates : bank.filter((q) => !usedIds.includes(q.id));
  const finalPool = pool.length > 0 ? pool : bank;
  return finalPool[randInt(0, finalPool.length - 1)];
}

function buildBoxLabels(boxCount, correctLetter) {
  // guarantee the correct letter is included, fill the rest from ALL_LABELS
  const labels = new Set([correctLetter]);
  const shuffled = [...ALL_LABELS].sort(() => Math.random() - 0.5);
  for (const l of shuffled) {
    if (labels.size >= boxCount) break;
    labels.add(l);
  }
  return Array.from(labels).sort();
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

.fb-intro-screen {
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

.fb-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.fb-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}

.fb-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.fb-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.fb-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.fb-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.fb-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.fb-wrap {
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

.fb-arena {
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

.fb-arena.shake {
  animation: fb-shake 0.28s ease;
}

@keyframes fb-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.fb-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.fb-flash.on {
  animation: fb-flash 0.35s ease;
}

@keyframes fb-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.fb-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.fb-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.fb-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.fb-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.fb-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.fb-board-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 20px;
  text-align: center;
}

.fb-phase-label {
  color: #8B93A7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.fb-round-timer {
  width: 260px;
  height: 5px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
}

.fb-round-timer-fill {
  height: 100%;
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 0.05s linear;
}

.fb-hint {
  color: #A78BFA;
  font-size: 14px;
  font-weight: 600;
  max-width: 480px;
}

.fb-sentence {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 700;
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 520px;
  line-height: 1.5;
}

.fb-boxes {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 420px;
}

.fb-box {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  color: #E5E7EB;
  font-size: 20px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.fb-box:active {
  transform: scale(0.94);
}

.fb-box.fb-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.45);
  color: #05221A;
  cursor: default;
}

.fb-box.fb-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.45);
  color: #3D0B0B;
  cursor: default;
}

.fb-box.fb-disabled {
  cursor: default;
  opacity: 0.6;
}

.fb-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fb-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.fb-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.fb-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.fb-stat .value.score { color: #F59E0B; }
.fb-stat .value.wrong { color: #F87171; }
.fb-stat .value.level { color: #34D399; }

.fb-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.fb-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.fb-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.fb-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.fb-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.fb-btn {
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

.fb-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.fb-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.fb-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.fb-results-grid .label { color: #8B93A7; font-size: 11px; }
.fb-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) return { title: "Room to grow" };
  if (pct < 0.7) return { title: "Solid focus!" };
  return { title: "Sharp eye, sharp mind 🔎" };
}

export default function FindTheBox({ onComplete, userId, assessmentId }) {
  const [phase, setPhase] = useState("instructions"); // instructions | question | reveal | roundBreak | done
  const [roundIndex, setRoundIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [boxLabels, setBoxLabels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [roundTimeLeftMs, setRoundTimeLeftMs] = useState(0);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankError, setBankError] = useState(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const [highestLevelReached, setHighestLevelReached] = useState(0);
  const [responseTimes, setResponseTimes] = useState([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const roundStartRef = useRef(null);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);
  const roundTickRef = useRef(null);
  const usedIdsRef = useRef([]);
  const questionBankRef = useRef([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  // Fetch the question bank from the DB on mount. No local fallback here —
  // the bank lives in the DB now, so Start stays disabled (and an error
  // shown, with a retry) until this actually succeeds.
  function loadQuestionBank() {
    setBankError(null);
    fetch("http://localhost:5000/api/questions/find_the_box", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Bad status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Question bank came back empty");
        }
        // DB shape: { questionId, gameId, difficulty, data: { prompt, hint, answer } }
        // Internal shape the game logic already uses: { id, tier, prompt, hint, answer }
        const mapped = data.map((q) => ({
          id: q.questionId,
          tier: q.difficulty,
          prompt: q.data.prompt,
          hint: q.data.hint,
          answer: q.data.answer,
        }));
        questionBankRef.current = mapped;
        setBankLoaded(true);
        console.log(`Loaded ${mapped.length} Find the Box questions from the DB.`);
      })
      .catch((err) => {
        console.error("Failed to load Find the Box question bank:", err);
        setBankError("Couldn't load questions. Please check your connection and try again.");
        setBankLoaded(false);
      });
  }

  useEffect(() => {
    loadQuestionBank();
  }, []);

  function beginRound(idx) {
    const round = ROUNDS[idx];
    const q = pickQuestion(round.tier, usedIdsRef.current, questionBankRef.current);
    usedIdsRef.current = [...usedIdsRef.current, q.id];
    const labels = buildBoxLabels(round.boxCount, q.answer);

    setQuestion(q);
    setBoxLabels(labels);
    setSelected(null);
    setRoundTimeLeftMs(round.timeLimitMs);
    roundStartRef.current = performance.now();
    setPhase("question");

    clearInterval(roundTickRef.current);
    roundTickRef.current = setInterval(() => {
      setRoundTimeLeftMs((t) => {
        const next = t - 100;
        if (next <= 0) {
          clearInterval(roundTickRef.current);
          if (!endedRef.current) selectBox(null, true);
          return 0;
        }
        return next;
      });
    }, 100);
  }

  function startGame() {
    if (!bankLoaded || questionBankRef.current.length === 0) return;
    endedRef.current = false;
    usedIdsRef.current = [];
    setRoundIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTimeoutCount(0);
    setHighestLevelReached(0);
    setResponseTimes([]);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    startedAtRef.current = new Date().toISOString();
    beginRound(0);
  }

  // overall session countdown — same safety-net pattern as DualTask
  useEffect(() => {
    if (phase === "instructions" || phase === "done") return;
    sessionTickRef.current = setInterval(() => {
      setTimeLeftMs((t) => {
        const next = t - 200;
        if (next <= 0) {
          clearInterval(sessionTickRef.current);
          clearInterval(roundTickRef.current);
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

  function selectBox(label, isTimeout = false) {
    if (phase !== "question" || selected !== null) return;
    clearInterval(roundTickRef.current);

    const isCorrect = !isTimeout && label === question.answer;
    setSelected(isTimeout ? "timeout" : label);

    const elapsed = Math.round(performance.now() - roundStartRef.current);
    setResponseTimes((prev) => [...prev, elapsed]);
    setHighestLevelReached((prev) => Math.max(prev, roundIndex + 1));

    if (isTimeout) {
      setTimeoutCount((c) => c + 1);
      triggerShake();
      triggerFlash();
    } else if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setScore((s) => s + POINTS_PER_TIER[question.tier]);
    } else {
      setWrongCount((c) => c + 1);
      triggerShake();
      triggerFlash();
    }

    setPhase("reveal");

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
    clearInterval(roundTickRef.current);

    const totalAnswered = responseTimes.length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const avgTimeMs = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "find_the_box",
      accuracy,
      avgTimeMs,
      metrics: {
        score,
        maxPossibleScore: MAX_POSSIBLE_SCORE,
        totalQuestions: totalAnswered,
        highestRoundReached: highestLevelReached,
        correct: correctCount,
        wrong: wrongCount,
        timeouts: timeoutCount,
        responseTimesMs: responseTimes,
      },
      completed: true,
    };

    console.log("Assessment ID:", localStorage.getItem("assessmentId"));
    console.log("Payload being sent:", payload);

    try {
      const res = await fetch("http://localhost:5000/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("assessmentId");
        alert("Your login session expired. Please log in again.");
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        console.error("Failed to save session:", res.status, data);
      } else {
        console.log("Session saved successfully:", data);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    }

    if (onComplete) onComplete(payload);
    setPhase("done");
  }

  const round = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];
  const totalAnswered = responseTimes.length;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const avgTime = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="fb-intro-screen">
        <style>{styles}</style>
        <h1>Find the Box</h1>
        <p className="sub">
          Read the sentence (or riddle) and the hint carefully, work out the
          correct letter, then click the box with that label before time runs
          out. Hints get trickier as you go — some ask you to think of an
          answer first. {ROUNDS.length} rounds, {Math.round(SESSION_TIME_LIMIT_MS / 1000)}s total.
        </p>
        <div className="fb-intro-cards">
          <div className="fb-intro-card">
            <div className="dot" />
            <div className="title">Read</div>
            <div className="desc">A sentence or riddle, plus a hint telling you what to extract.</div>
          </div>
          <div className="fb-intro-card">
            <div className="dot" />
            <div className="title">Work it out</div>
            <div className="desc">Figure out the exact letter the hint is pointing to.</div>
          </div>
          <div className="fb-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Click the box</div>
            <div className="desc">Select the box labeled with that letter, fast.</div>
          </div>
        </div>
        <button className="fb-btn" onClick={startGame} disabled={!bankLoaded}>
          {bankLoaded ? "Start the Game" : bankError ? "Questions unavailable" : "Loading questions…"}
        </button>
        {bankError && (
          <>
            <p className="sub" style={{ color: "#F87171", fontSize: 13 }}>{bankError}</p>
            <button className="fb-btn" onClick={loadQuestionBank} style={{ background: "#232A3D", color: "#E5E7EB" }}>
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fb-wrap">
      <style>{styles}</style>

      <div className={`fb-arena ${shake ? "shake" : ""}`}>
        <div className={`fb-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        {phase !== "done" && (
          <div className="fb-arena-header">
            <div>
              <h2>Find the Box</h2>
              <p>Read carefully, then click the right box.</p>
            </div>
            <div className={`fb-badge ${round.tier === "Hard" ? "warn" : ""}`}>
              Round {roundIndex + 1}/{ROUNDS.length} • {round.tier}
            </div>
          </div>
        )}

        {phase === "question" && question && (
          <div className="fb-board-area">
            <div className="fb-phase-label">{round.label}</div>
            <div className="fb-round-timer">
              <div
                className="fb-round-timer-fill"
                style={{ width: `${(roundTimeLeftMs / round.timeLimitMs) * 100}%` }}
              />
            </div>
            <div className="fb-sentence">{question.prompt}</div>
            <div className="fb-hint">{question.hint}</div>
            <div className="fb-boxes">
              {boxLabels.map((label) => (
                <button
                  key={label}
                  className="fb-box"
                  onClick={() => selectBox(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "reveal" && question && (
          <div className="fb-board-area">
            <div className="fb-phase-label">{round.label}</div>
            <div className="fb-sentence">{question.prompt}</div>
            <div className="fb-hint">{question.hint}</div>
            <div className="fb-boxes">
              {boxLabels.map((label) => {
                let cls = "fb-box";
                if (label === question.answer) cls += " fb-correct";
                else if (label === selected) cls += " fb-wrong";
                else cls += " fb-disabled";
                return (
                  <button key={label} className={cls} disabled>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "roundBreak" && (
          <div className="fb-board-area">
            <div
              style={{
                width: 200,
                height: 60,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "#05131A",
                background: selected === question?.answer ? "#34D399" : "#F87171",
              }}
            >
              {selected === question?.answer ? "Correct!" : "Not quite"}
            </div>
            <div className="fb-phase-label">
              {round.label} complete — next round starting…
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="fb-center-msg">
            <h2>Find the Box</h2>
            <p style={{ color: "#8B93A7", fontSize: 14, margin: "-8px 0 4px" }}>
              {getResultCopy(score).title}
            </p>
            <div className="fb-results-grid">
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
                <div className="value">{highestLevelReached}/{ROUNDS.length}</div>
              </div>
              <div>
                <div className="label">Avg Response</div>
                <div className="value">{avgTime}ms</div>
              </div>
              <div>
                <div className="label">Correct</div>
                <div className="value">{correctCount}</div>
              </div>
              <div>
                <div className="label">Wrong / Timeout</div>
                <div className="value">{wrongCount + timeoutCount}</div>
              </div>
            </div>
            <button className="fb-btn" onClick={() => setPhase("instructions")}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="fb-sidebar">
        <div className="fb-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="fb-progress-bar">
            <div
              className="fb-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="fb-stat">
          <div className="label">Round</div>
          <div className="value level">{Math.min(roundIndex + 1, ROUNDS.length)}/{ROUNDS.length}</div>
        </div>
        <div className="fb-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="fb-stat">
          <div className="label">Correct</div>
          <div className="value">{correctCount}</div>
        </div>
        <div className="fb-stat">
          <div className="label">Wrong</div>
          <div className="value wrong">{wrongCount + timeoutCount}</div>
        </div>
      </div>
    </div>
  );
}
