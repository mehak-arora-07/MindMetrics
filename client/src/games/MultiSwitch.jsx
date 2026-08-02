import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNextGamePath } from "../utils/gameSequence";
// Drop into client/src/games/MultiSwitch.jsx
// Same visual family as CPT — grid layout (arena + sidebar), dark cards,
// mint/gold/red accents.
//
// Question bank: fetches from GET /api/questions/multi_switch (gameId
// "multi_switch" in the question_bank collection). Each doc looks like:
//   { questionId, difficulty, data: { set, rule, answer }, gameId }
// `set` is the full array of numbers shown, `answer` is the pre-computed
// correct subset — no client-side rule logic needed, just compare
// selections against `answer`. Falls back to the local RULE_BANK below if
// the fetch fails, same pattern as CPT.
//
// Session connection: same pattern as DualTask/CPT — reads assessmentId
// straight from localStorage, POSTs directly to /api/sessions, handles a
// 401 by clearing the session and bouncing to login.

const ROUNDS_TOTAL = 5;
const QUESTIONS_PER_ROUND = 1;
const SESSION_TIME_LIMIT_MS = 60000;
const SCORE_PER_HIT = 10;
const SCORE_PENALTY_PER_FALSE_POSITIVE = 5;

// ---- Local question bank (swap for the real fetch once the backend endpoint exists) ----
// Same shape as the real question_bank docs: { questionId, difficulty, data: { set, rule, answer } }
const RULE_BANK = [
  { questionId: "MS001", difficulty: "Easy", data: { set: [3, 8, 5, 12, 7, 16], rule: "Click Multiples of 4", answer: [8, 12, 16] } },
  { questionId: "MS002", difficulty: "Easy", data: { set: [20, 9, 24, 13, 4, 17], rule: "Click Multiples of 4", answer: [20, 24, 4] } },
  { questionId: "MS003", difficulty: "Easy", data: { set: [40, 33, 8, 12, 21, 30], rule: "Click Multiples of 4", answer: [40, 8, 12] } },
  { questionId: "MS004", difficulty: "Medium", data: { set: [2, 6, 9, 11, 15, 17], rule: "Click Prime Numbers", answer: [2, 11, 17] } },
  { questionId: "MS005", difficulty: "Medium", data: { set: [4, 13, 19, 8, 23, 10], rule: "Click Prime Numbers", answer: [13, 19, 23] } },
  { questionId: "MS006", difficulty: "Medium", data: { set: [6, 29, 14, 31, 9, 12], rule: "Click Prime Numbers", answer: [29, 31] } },
  { questionId: "MS007", difficulty: "Hard", data: { set: [3, 18, 7, 22, 9, 15], rule: "Click Odd Numbers Greater Than 5", answer: [7, 9, 15] } },
  { questionId: "MS008", difficulty: "Hard", data: { set: [11, 4, 19, 6, 13, 8], rule: "Click Odd Numbers Greater Than 5", answer: [11, 19, 13] } },
  { questionId: "MS009", difficulty: "Hard", data: { set: [5, 21, 10, 27, 14, 33], rule: "Click Odd Numbers Greater Than 5", answer: [21, 27, 33] } },
];

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

@keyframes ms-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ms-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

@keyframes ms-flash {
  0% { opacity: 0.5; }
  100% { opacity: 0; }
}

@keyframes ms-item-in {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

.ms-screen { animation: ms-fade-in 0.35s ease; }

.ms-intro-screen {
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

.ms-intro-screen h1 { color: #E5E7EB; font-size: 32px; font-weight: 700; margin: 0; }
.ms-intro-screen .sub { color: #8B93A7; font-size: 15px; max-width: 460px; margin: 0; line-height: 1.6; }

.ms-example {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 26px;
  color: #E5E7EB;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.ms-example .chip {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 16px;
}

.ms-example .chip.match { border-color: #34D399; color: #34D399; }

.ms-btn {
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
.ms-btn:active { transform: scale(0.97); }
.ms-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ms-btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.ms-wrap {
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

.ms-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.ms-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ms-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ms-topbar h2 { color: #E5E7EB; font-size: 17px; font-weight: 600; margin: 0; }

.ms-round-badge {
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #A78BFA;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
}

.ms-rule-banner {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px 20px;
  color: #E5E7EB;
  font-size: 14px;
  text-align: center;
}

.ms-rule-banner b { color: #34D399; }

.ms-arena {
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
  gap: 24px;
  overflow: hidden;
  padding: 30px 24px;
}

.ms-arena.shake { animation: ms-shake 0.28s ease; }

.ms-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}
.ms-flash.on { animation: ms-flash 0.3s ease; }

.ms-stimuli-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
}

.ms-stim {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: #0B0F19;
  border: 2px solid #232A3D;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  cursor: pointer;
  animation: ms-item-in 0.2s ease;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.ms-stim:active { transform: scale(0.94); }

.ms-stim.selected {
  border-color: #3B82F6;
  background: rgba(59, 130, 246, 0.12);
}

.ms-stim.result-correct {
  border-color: #34D399;
  background: rgba(52, 211, 153, 0.15);
  cursor: default;
}

.ms-stim.result-wrong {
  border-color: #F87171;
  background: rgba(248, 113, 113, 0.15);
  cursor: default;
}

.ms-stim.result-missed {
  border-color: #F59E0B;
  background: rgba(245, 158, 11, 0.12);
  cursor: default;
}

.ms-submit-btn {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.ms-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ms-progress-bar {
  width: 100%;
  height: 5px;
  background: #232A3D;
  border-radius: 5px;
  overflow: hidden;
}

.ms-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.15s linear;
}

.ms-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.ms-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.ms-stat .label { color: #8B93A7; font-size: 11px; margin-bottom: 4px; }
.ms-stat .value { color: #E5E7EB; font-size: 18px; font-weight: 600; }
.ms-stat .value.hits { color: #34D399; }
.ms-stat .value.misses { color: #F87171; }
.ms-stat .value.fp { color: #F59E0B; }

.ms-center-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 24px;
  background: rgba(11, 15, 25, 0.75);
  z-index: 4;
}

.ms-center-msg h3 { color: #E5E7EB; font-size: 20px; margin: 0; }
.ms-center-msg p { color: #8B93A7; font-size: 13px; margin: 0; max-width: 320px; }

.ms-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.ms-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 12px;
}
.ms-results-grid .label { color: #8B93A7; font-size: 11px; }
.ms-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function getResultCopy(accuracy) {
  if (accuracy < 40) return { title: "Room to grow" };
  if (accuracy < 75) return { title: "Solid focus!" };
  return { title: "Sharp switching 🔀" };
}

// Groups question docs by their rule text, then hands back exactly
// ROUNDS_TOTAL rounds of QUESTIONS_PER_ROUND questions each. If the pool
// has fewer than ROUNDS_TOTAL distinct rules (e.g. the local fallback
// bank only has 3), it cycles back through the available rules rather
// than leaving later rounds empty.
function buildSession(pool) {
  const byRule = new Map();
  pool.forEach((q) => {
    const key = q.data.rule;
    if (!byRule.has(key)) byRule.set(key, []);
    byRule.get(key).push(q);
  });

  const allGroups = [...byRule.values()].sort(() => Math.random() - 0.5);
  if (allGroups.length === 0) return [];

  const ruleGroups = Array.from(
    { length: ROUNDS_TOTAL },
    (_, i) => allGroups[i % allGroups.length]
  );

  return ruleGroups.map((group) =>
    Array.from({ length: QUESTIONS_PER_ROUND }, (_, i) => group[i % group.length])
  );
}

export default function MultiSwitch({ onComplete, userId, assessmentId, onNextGame }) {
    const navigate = useNavigate();

  const [phase, setPhase] = useState("instructions"); // instructions | roundIntro | question | questionEnd | roundEnd | done
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSource, setBankSource] = useState(null); // "api" | "local"
  const [rounds, setRounds] = useState([]); // [[q,q,q], [q,q,q], [q,q,q]]
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState(new Set());
  const [resultValues, setResultValues] = useState(null); // { correct: Set, wrong: Set, missed: Set }
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falsePositives, setFalsePositives] = useState(0);

  const startedAtRef = useRef(null);
  const questionStartRef = useRef(null);
  const firstClickRef = useRef(null);
  const questionLogRef = useRef([]); // { roundIndex, questionIndex, rtMs }
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);

  // Refs mirroring state — endGame() is reached through nested setTimeout
  // chains whose closures don't see later state updates, so reading
  // hits/misses/etc there directly would show stale (often zero) values.
  // Refs are always current regardless of which closure reads them.
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falsePositivesRef = useRef(0);

  useEffect(() => {
    async function loadQuestionBank() {
      try {
        const res = await fetch("http://localhost:5000/api/questions/multi_switch");
        const result = await res.json();

        if (!result.success || !result.questions || result.questions.length === 0) {
          throw new Error("Bank empty or request unsuccessful");
        }

        setRounds(buildSession(result.questions));
        setBankSource("api");
      } catch (err) {
        console.warn("Falling back to local RULE_BANK — API fetch failed:", err.message);
        setRounds(buildSession(RULE_BANK));
        setBankSource("local");
      } finally {
        setBankLoaded(true);
      }
    }
    loadQuestionBank();
  }, []);

  function startGame() {
    endedRef.current = false;
    setRoundIndex(0);
    setHits(0);
    setMisses(0);
    setFalsePositives(0);
    hitsRef.current = 0;
    missesRef.current = 0;
    falsePositivesRef.current = 0;
    questionLogRef.current = [];
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

  function beginRound(idx) {
    setPhase("roundIntro");
    setTimeout(() => {
      if (endedRef.current) return;
      setQuestionIndex(0);
      beginQuestion(idx, 0);
    }, 1400);
  }

  function beginQuestion(roundIdx, qIdx) {
    setSelectedValues(new Set());
    setResultValues(null);
    questionStartRef.current = performance.now();
    firstClickRef.current = null;
    setPhase("question");
  }

  function toggleValue(value) {
    if (phase !== "question") return;
    if (firstClickRef.current === null) {
      firstClickRef.current = performance.now();
    }
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function submitQuestion() {
    if (phase !== "question") return;
    const question = rounds[roundIndex][questionIndex];
    const rt = Math.round((firstClickRef.current ?? performance.now()) - questionStartRef.current);

    const correct = new Set();
    const wrong = new Set();
    const missed = new Set();

    question.data.set.forEach((v) => {
      const shouldMatch = question.data.answer.includes(v);
      const wasSelected = selectedValues.has(v);
      if (shouldMatch && wasSelected) correct.add(v);
      else if (shouldMatch && !wasSelected) missed.add(v);
      else if (!shouldMatch && wasSelected) wrong.add(v);
    });

    setHits((h) => {
      hitsRef.current = h + correct.size;
      return h + correct.size;
    });
    setMisses((m) => {
      missesRef.current = m + missed.size;
      return m + missed.size;
    });
    setFalsePositives((f) => {
      falsePositivesRef.current = f + wrong.size;
      return f + wrong.size;
    });
    setResultValues({ correct, wrong, missed });

    if (missed.size > 0 || wrong.size > 0) {
      triggerShake();
      triggerFlash();
    }

    questionLogRef.current = [...questionLogRef.current, { roundIndex, questionIndex, rtMs: rt }];
    setPhase("questionEnd");

    setTimeout(() => {
      if (endedRef.current) return;
      const nextQ = questionIndex + 1;
      if (nextQ >= QUESTIONS_PER_ROUND) {
        finishRound();
      } else {
        setQuestionIndex(nextQ);
        beginQuestion(roundIndex, nextQ);
      }
    }, 700);
  }

  function finishRound() {
    setPhase("roundEnd");
    setTimeout(() => {
      if (endedRef.current) return;
      const nextRound = roundIndex + 1;
      if (nextRound >= ROUNDS_TOTAL) {
        endedRef.current = true;
        endGame();
      } else {
        setRoundIndex(nextRound);
        beginRound(nextRound);
      }
    }, 1400);
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  }
  function triggerFlash() {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  }

  async function endGame() {
    clearInterval(sessionTickRef.current);

    // Read from refs, not state — see the comment on the ref declarations
    // above for why the state values here can't be trusted at this point.
    const finalHits = hitsRef.current;
    const finalMisses = missesRef.current;
    const finalFalsePositives = falsePositivesRef.current;
    const log = questionLogRef.current;

    // Switch cost: average RT on the first question of each round (right
    // after the rule changes) minus average RT on the other questions.
    const firstQuestionRTs = log.filter((t) => t.questionIndex === 0).map((t) => t.rtMs);
    const otherQuestionRTs = log.filter((t) => t.questionIndex !== 0).map((t) => t.rtMs);
    const avgFirstQuestionRT = firstQuestionRTs.length
      ? Math.round(firstQuestionRTs.reduce((a, b) => a + b, 0) / firstQuestionRTs.length)
      : 0;
    const avgOtherQuestionsRT = otherQuestionRTs.length
      ? Math.round(otherQuestionRTs.reduce((a, b) => a + b, 0) / otherQuestionRTs.length)
      : 0;
    const switchCostMs = avgFirstQuestionRT - avgOtherQuestionsRT;

    const allRTs = log.map((t) => t.rtMs);
    const avgTimeMs = allRTs.length ? Math.round(allRTs.reduce((a, b) => a + b, 0) / allRTs.length) : 0;
    const totalJudged = finalHits + finalMisses + finalFalsePositives;
    const accuracy = totalJudged > 0 ? Math.round((finalHits / totalJudged) * 100) : 0;
    const score = Math.max(0, finalHits * SCORE_PER_HIT - finalFalsePositives * SCORE_PENALTY_PER_FALSE_POSITIVE);

    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "multi_switch",
      accuracy,
      avgTimeMs,
      metrics: {
        score,
        roundsCompleted: ROUNDS_TOTAL,
        questionsPerRound: QUESTIONS_PER_ROUND,
        hits: finalHits,
        misses: finalMisses,
        falsePositives: finalFalsePositives,
        switchCostMs,
        avgFirstQuestionRT,
        avgOtherQuestionsRT,
        questionLog: log,
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString(),
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
      const nextPath = getNextGamePath("multi_switch");

      if (nextPath) {
      navigate(nextPath);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    }

    if (onComplete) onComplete(payload);
    setPhase("done");
  }

  const currentQuestion = rounds.length ? rounds[roundIndex]?.[questionIndex] : null;

  function renderStim(value) {
    let cls = "ms-stim";
    if (resultValues) {
      if (resultValues.correct.has(value)) cls += " result-correct";
      else if (resultValues.wrong.has(value)) cls += " result-wrong";
      else if (resultValues.missed.has(value)) cls += " result-missed";
    } else if (selectedValues.has(value)) {
      cls += " selected";
    }
    const disabled = phase !== "question";
    return (
      <button key={`${value}`} className={cls} onClick={() => toggleValue(value)} disabled={disabled}>
        {value}
      </button>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="ms-intro-screen ms-screen">
        <style>{styles}</style>
        <h1>Multi Switch</h1>
        <p className="sub">
          Every round has a different rule — click only the numbers that
          match it, then hit Submit. {ROUNDS_TOTAL} rounds, {QUESTIONS_PER_ROUND}{" "}
          questions each, and the rule changes every round. You've got{" "}
          {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="ms-example">
          <span className="chip">3</span>
          <span className="chip match">8</span>
          <span className="chip">5</span>
          <span className="chip match">12</span>
          <span className="chip">7</span>
          <span style={{ color: "#8B93A7", fontWeight: 500 }}>= click only multiples of 4</span>
        </div>
        <button className="ms-btn" onClick={startGame} disabled={!bankLoaded}>
          {bankLoaded ? "Start the Test" : "Loading questions…"}
        </button>
        {bankLoaded && (
          <p style={{ color: "#4B5468", fontSize: 11 }}>
            {bankSource === "api" ? "Question bank loaded from database" : "Using offline question set"}
          </p>
        )}
      </div>
    );
  }

  if (phase === "done") {
    const log = questionLogRef.current;
    const firstQuestionRTs = log.filter((t) => t.questionIndex === 0).map((t) => t.rtMs);
    const otherQuestionRTs = log.filter((t) => t.questionIndex !== 0).map((t) => t.rtMs);
    const avgFirstQuestionRT = firstQuestionRTs.length
      ? Math.round(firstQuestionRTs.reduce((a, b) => a + b, 0) / firstQuestionRTs.length)
      : 0;
    const avgOtherQuestionsRT = otherQuestionRTs.length
      ? Math.round(otherQuestionRTs.reduce((a, b) => a + b, 0) / otherQuestionRTs.length)
      : 0;
    const switchCostMs = avgFirstQuestionRT - avgOtherQuestionsRT;
    const totalJudged = hits + misses + falsePositives;
    const accuracy = totalJudged > 0 ? Math.round((hits / totalJudged) * 100) : 0;

    const score = Math.max(0, hits * SCORE_PER_HIT - falsePositives * SCORE_PENALTY_PER_FALSE_POSITIVE);

    return (
      <div className="ms-intro-screen ms-screen">
        <style>{styles}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "#E5E7EB", fontSize: 22, marginBottom: 4 }}>Session complete</h2>
          <p style={{ color: "#8B93A7", fontSize: 14, margin: "0 0 20px" }}>
            {getResultCopy(accuracy).title}
          </p>
          <div className="ms-results-grid">
            <div>
              <div className="label">Score</div>
              <div className="value">{score}</div>
            </div>
            <div>
              <div className="label">Accuracy</div>
              <div className="value">{accuracy}%</div>
            </div>
            <div>
              <div className="label">Hits</div>
              <div className="value">{hits}</div>
            </div>
            <div>
              <div className="label">Misses</div>
              <div className="value">{misses}</div>
            </div>
            <div>
              <div className="label">False Positives</div>
              <div className="value">{falsePositives}</div>
            </div>
            <div>
              <div className="label">Switch Cost</div>
              <div className="value">{switchCostMs}ms</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-wrap ms-screen">
      <style>{styles}</style>

      <div className="ms-main">
        <div className="ms-topbar">
          <h2>Multi Switch</h2>
          <div className="ms-round-badge">
            Round {Math.min(roundIndex + 1, ROUNDS_TOTAL)} of {ROUNDS_TOTAL}
          </div>
        </div>

        <div className="ms-progress-bar">
          <div className="ms-progress-fill" style={{ width: `${(roundIndex / ROUNDS_TOTAL) * 100}%` }} />
        </div>

        {currentQuestion && (phase === "question" || phase === "questionEnd") && (
          <div className="ms-rule-banner">
            <b>{currentQuestion.data.rule}</b> — Question {questionIndex + 1}/{QUESTIONS_PER_ROUND}
          </div>
        )}

        <div className={`ms-arena ${shake ? "shake" : ""}`}>
          <div className={`ms-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

          {currentQuestion && (phase === "question" || phase === "questionEnd") && (
            <>
              <div className="ms-stimuli-grid">{currentQuestion.data.set.map(renderStim)}</div>
              {phase === "question" && (
                <button className="ms-submit-btn" onClick={submitQuestion}>
                  Submit
                </button>
              )}
            </>
          )}

          {phase === "roundIntro" && rounds[roundIndex] && (
            <div className="ms-center-msg">
              <h3>Round {roundIndex + 1}</h3>
              <p>
                New rule: <b style={{ color: "#34D399" }}>{rounds[roundIndex][0].data.rule}</b>
              </p>
            </div>
          )}

          {phase === "roundEnd" && (
            <div className="ms-center-msg">
              <h3>Round {roundIndex + 1} complete</h3>
            </div>
          )}
        </div>
      </div>

      <div className="ms-sidebar">
        <div className="ms-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="ms-progress-bar" style={{ marginTop: 8 }}>
            <div
              className="ms-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="ms-stat">
          <div className="label">Score</div>
          <div className="value hits">
            {Math.max(0, hits * SCORE_PER_HIT - falsePositives * SCORE_PENALTY_PER_FALSE_POSITIVE)}
          </div>
        </div>
        <div className="ms-stat">
          <div className="label">Avg Reaction Time</div>
          <div className="value">
            {(() => {
              const log = questionLogRef.current;
              if (!log.length) return "0ms";
              const avg = Math.round(log.reduce((a, b) => a + b.rtMs, 0) / log.length);
              return `${avg}ms`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}