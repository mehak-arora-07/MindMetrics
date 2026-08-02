import { useState, useRef, useEffect } from "react";

// Drop into client/src/games/RuleDiscovery.jsx
// Same visual family as MultiSwitch/CPT — grid layout (arena + sidebar),
// dark cards, mint/gold/red accents.
//
// Question bank: fetches from GET /api/questions/rule_discovery (gameId
// "rule_discovery" in the question_bank collection). Each doc looks like:
//   { questionId, difficulty, data: { set, rule, answer }, gameId }
// `rule` is never shown to the player — only `set` (items to classify) and
// `answer` (which items the hidden rule actually accepts) are used at
// runtime. Falls back to the local RULE_BANK below if the fetch fails.
//
// Session connection: same pattern as MultiSwitch/DualTask/CPT — reads
// assessmentId straight from localStorage, POSTs directly to
// /api/sessions, handles a 401 by clearing the session and bouncing to
// login, and mirrors all running totals into refs so endGame() (reached
// through nested setTimeout chains) never reads stale state.

const ROUND_DIFFICULTIES = ["Easy", "Medium", "Hard"];
const ROUNDS_TOTAL = ROUND_DIFFICULTIES.length;
const MIN_TESTED_BEFORE_GUESS = 3;
const SESSION_TIME_LIMIT_MS = 90000;

const CORRECT_GUESS_POINTS = 30;
const WRONG_GUESS_POINTS = -10;
const CORRECT_CLASSIFY_POINTS = 5;
const WRONG_CLASSIFY_POINTS = -3;

// ---- Local question bank (swap for the real fetch once the backend endpoint exists) ----
const RULE_BANK = [
  { questionId: "RD001", difficulty: "Easy", data: { set: [2, 5, 8, 11, 14, 17, 20, 23], rule: "Even Numbers", answer: [2, 8, 14, 20] } },
  { questionId: "RD002", difficulty: "Easy", data: { set: [3, 6, 9, 12, 15, 18, 4, 10], rule: "Odd Numbers", answer: [3, 9, 15] } },
  { questionId: "RD003", difficulty: "Medium", data: { set: [2, 4, 7, 9, 11, 15, 17, 20], rule: "Prime Numbers", answer: [2, 7, 11, 17] } },
  { questionId: "RD004", difficulty: "Hard", data: { set: [4, 8, 12, 15, 18, 22, 25, 30], rule: "Numbers Greater Than 10", answer: [12, 15, 18, 22, 25, 30] } },
  { questionId: "RD005", difficulty: "Hard", data: { set: [3, 6, 10, 15, 18, 21, 27, 33], rule: "Multiples of 3", answer: [3, 6, 15, 18, 21, 27, 33] } },
];

function pickForDifficulty(pool, difficulty, usedIds) {
  const candidates = pool.filter((q) => q.difficulty === difficulty && !usedIds.has(q.questionId));
  if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
  const anyUnused = pool.filter((q) => !usedIds.has(q.questionId));
  if (anyUnused.length > 0) return anyUnused[Math.floor(Math.random() * anyUnused.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildSession(pool) {
  const usedIds = new Set();
  return ROUND_DIFFICULTIES.map((diff) => {
    const q = pickForDifficulty(pool, diff, usedIds);
    usedIds.add(q.questionId);
    return q;
  });
}

function buildRuleOptions(pool, correctRule) {
  const otherRules = [...new Set(pool.map((q) => q.data.rule).filter((r) => r !== correctRule))];
  const distractors = otherRules.sort(() => Math.random() - 0.5).slice(0, 3);
  while (distractors.length < 3) {
    distractors.push(`Rule ${distractors.length + 1}`);
  }
  return [...distractors, correctRule].sort(() => Math.random() - 0.5);
}

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

@keyframes rd-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes rd-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

@keyframes rd-flash {
  0% { opacity: 0.5; }
  100% { opacity: 0; }
}

@keyframes rd-item-in {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

.rd-screen { animation: rd-fade-in 0.35s ease; }

.rd-intro-screen {
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

.rd-intro-screen h1 { color: #E5E7EB; font-size: 32px; font-weight: 700; margin: 0; }
.rd-intro-screen .sub { color: #8B93A7; font-size: 15px; max-width: 460px; margin: 0; line-height: 1.6; }

.rd-example {
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
}

.rd-example .chip {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 18px;
}

.rd-example .chip.accept { border-color: #34D399; color: #34D399; }
.rd-example .chip.reject { border-color: #F87171; color: #F87171; }

.rd-btn {
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
.rd-btn:active { transform: scale(0.97); }
.rd-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rd-btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.rd-wrap {
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

.rd-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.rd-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rd-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rd-topbar h2 { color: #E5E7EB; font-size: 17px; font-weight: 600; margin: 0; }

.rd-round-badge {
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #A78BFA;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
}

.rd-progress-bar {
  width: 100%;
  height: 5px;
  background: #232A3D;
  border-radius: 5px;
  overflow: hidden;
}

.rd-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.15s linear;
}

.rd-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.rd-arena {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  display: flex;
  gap: 20px;
  overflow: hidden;
  padding: 24px;
}

.rd-arena.shake { animation: rd-shake 0.28s ease; }

.rd-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}
.rd-flash.on { animation: rd-flash 0.3s ease; }

.rd-classify-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.rd-item-box {
  width: 130px;
  height: 130px;
  border-radius: 20px;
  background: #0B0F19;
  border: 2px solid #232A3D;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E5E7EB;
  font-size: 44px;
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  animation: rd-item-in 0.2s ease;
}

.rd-decision-row {
  display: flex;
  gap: 14px;
}

.rd-accept-btn, .rd-reject-btn {
  border: none;
  border-radius: 10px;
  padding: 14px 26px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.rd-accept-btn:active, .rd-reject-btn:active { transform: scale(0.95); }

.rd-accept-btn {
  background: rgba(52, 211, 153, 0.15);
  border: 2px solid #34D399;
  color: #34D399;
}

.rd-reject-btn {
  background: rgba(248, 113, 113, 0.15);
  border: 2px solid #F87171;
  color: #F87171;
}

.rd-guess-btn {
  background: rgba(167, 139, 250, 0.15);
  border: 2px solid #A78BFA;
  color: #A78BFA;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.rd-guess-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.rd-log-col {
  position: absolute;
  top: 24px;
  right: 24px;
  bottom: 24px;
  width: 190px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  z-index: 2;
}

.rd-log-title {
  color: #8B93A7;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rd-log-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #E5E7EB;
}

.rd-log-entry .result {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.rd-log-entry .result.accepted { background: rgba(52, 211, 153, 0.15); color: #34D399; }
.rd-log-entry .result.rejected { background: rgba(248, 113, 113, 0.15); color: #F87171; }

.rd-guess-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.rd-guess-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 420px;
}

.rd-guess-option {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}
.rd-guess-option:active { transform: scale(0.96); }

.rd-guess-option.correct {
  border-color: #34D399;
  background: rgba(52, 211, 153, 0.15);
  color: #34D399;
}

.rd-guess-option.wrong {
  border-color: #F87171;
  background: rgba(248, 113, 113, 0.12);
  color: #F87171;
}

.rd-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.rd-stat .label { color: #8B93A7; font-size: 11px; margin-bottom: 4px; }
.rd-stat .value { color: #E5E7EB; font-size: 18px; font-weight: 600; }
.rd-stat .value.score { color: #F59E0B; }
.rd-stat .value.solved { color: #34D399; }

.rd-center-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 24px;
  background: rgba(11, 15, 25, 0.85);
  z-index: 4;
}

.rd-center-msg h3 { color: #E5E7EB; font-size: 20px; margin: 0; }
.rd-center-msg p { color: #8B93A7; font-size: 13px; margin: 0; max-width: 340px; }

.rd-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.rd-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 12px;
}
.rd-results-grid .label { color: #8B93A7; font-size: 11px; }
.rd-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

export default function RuleDiscovery({ onComplete, onNextGame, userId, assessmentId }) {
  const [phase, setPhase] = useState("instructions"); // instructions | roundIntro | classify | guessing | guessResult | roundEnd | done
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSource, setBankSource] = useState(null); // "api" | "local"
  const [pool, setPool] = useState([]);
  const [rounds, setRounds] = useState([]); // one question doc per round
  const [roundIndex, setRoundIndex] = useState(0);
  const [itemQueue, setItemQueue] = useState([]); // shuffled remaining items for this round
  const [currentItem, setCurrentItem] = useState(null);
  const [testedLog, setTestedLog] = useState([]); // { item, playerChoice, actuallyAccepted, playerCorrect }
  const [guessOptions, setGuessOptions] = useState([]);
  const [selectedGuess, setSelectedGuess] = useState(null);
  const [guessWasCorrect, setGuessWasCorrect] = useState(null);
  const [roundGuessCount, setRoundGuessCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);
  const [score, setScore] = useState(0);

  const [rulesSolved, setRulesSolved] = useState(0);
  const [classificationCorrect, setClassificationCorrect] = useState(0);
  const [classificationTotal, setClassificationTotal] = useState(0);
  const [totalRuleGuesses, setTotalRuleGuesses] = useState(0);
  const [solveTimesMs, setSolveTimesMs] = useState([]);
  const [classifyReactionTimesMs, setClassifyReactionTimesMs] = useState([]);

  const startedAtRef = useRef(null);
  const roundStartRef = useRef(null);
  const itemShownAtRef = useRef(null);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);

  // Refs mirroring state — endGame() is reached through nested setTimeout
  // chains whose closures don't see later state updates, so reading these
  // values directly there would show stale (often zero) numbers.
  const scoreRef = useRef(0);
  const rulesSolvedRef = useRef(0);
  const classificationCorrectRef = useRef(0);
  const classificationTotalRef = useRef(0);
  const totalRuleGuessesRef = useRef(0);
  const solveTimesMsRef = useRef([]);
  const classifyReactionTimesMsRef = useRef([]);

  useEffect(() => {
    async function loadQuestionBank() {
      try {
        const res = await fetch("http://localhost:5000/api/questions/rule_discovery");
        const result = await res.json();

        if (!result.success || !result.questions || result.questions.length === 0) {
          throw new Error("Bank empty or request unsuccessful");
        }

        setPool(result.questions);
        setRounds(buildSession(result.questions));
        setBankSource("api");
      } catch (err) {
        console.warn("Falling back to local RULE_BANK — API fetch failed:", err.message);
        setPool(RULE_BANK);
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
    setScore(0);
    setRulesSolved(0);
    setClassificationCorrect(0);
    setClassificationTotal(0);
    setTotalRuleGuesses(0);
    setSolveTimesMs([]);
    setClassifyReactionTimesMs([]);
    scoreRef.current = 0;
    rulesSolvedRef.current = 0;
    classificationCorrectRef.current = 0;
    classificationTotalRef.current = 0;
    totalRuleGuessesRef.current = 0;
    solveTimesMsRef.current = [];
    classifyReactionTimesMsRef.current = [];
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
    setTestedLog([]);
    setRoundGuessCount(0);
    roundStartRef.current = performance.now();

    setTimeout(() => {
      if (endedRef.current) return;
      const question = rounds[idx];
      const shuffled = [...question.data.set].sort(() => Math.random() - 0.5);
      setItemQueue(shuffled.slice(1));
      setCurrentItem(shuffled[0]);
      itemShownAtRef.current = performance.now();
      setPhase("classify");
    }, 1400);
  }

  function classify(playerChoice) {
    if (phase !== "classify") return;
    const question = rounds[roundIndex];
    const actuallyAccepted = question.data.answer.includes(currentItem);
    const playerCorrect =
      (playerChoice === "accept" && actuallyAccepted) || (playerChoice === "reject" && !actuallyAccepted);

    const rt = Math.round(performance.now() - itemShownAtRef.current);
    setClassifyReactionTimesMs((prev) => {
      const next = [...prev, rt];
      classifyReactionTimesMsRef.current = next;
      return next;
    });

    setTestedLog((prev) => [...prev, { item: currentItem, playerChoice, actuallyAccepted, playerCorrect }]);
    setClassificationTotal((c) => {
      classificationTotalRef.current = c + 1;
      return c + 1;
    });
    if (playerCorrect) {
      setClassificationCorrect((c) => {
        classificationCorrectRef.current = c + 1;
        return c + 1;
      });
      setScore((s) => {
        scoreRef.current = s + CORRECT_CLASSIFY_POINTS;
        return s + CORRECT_CLASSIFY_POINTS;
      });
    } else {
      setScore((s) => {
        scoreRef.current = s + WRONG_CLASSIFY_POINTS;
        return s + WRONG_CLASSIFY_POINTS;
      });
      triggerShake();
      triggerFlash();
    }

    if (itemQueue.length > 0) {
      const [next, ...rest] = itemQueue;
      setItemQueue(rest);
      setCurrentItem(next);
      itemShownAtRef.current = performance.now();
    } else {
      openGuessScreen();
    }
  }

  function openGuessScreen() {
    const question = rounds[roundIndex];
    setGuessOptions(buildRuleOptions(pool.length ? pool : RULE_BANK, question.data.rule));
    setSelectedGuess(null);
    setGuessWasCorrect(null);
    setPhase("guessing");
  }

  function submitGuess(option) {
    if (phase !== "guessing") return;
    const question = rounds[roundIndex];
    const isCorrect = option === question.data.rule;

    setSelectedGuess(option);
    setGuessWasCorrect(isCorrect);
    setRoundGuessCount((c) => c + 1);
    setTotalRuleGuesses((c) => {
      totalRuleGuessesRef.current = c + 1;
      return c + 1;
    });

    if (isCorrect) {
      const solveTime = Math.round(performance.now() - roundStartRef.current);
      setSolveTimesMs((prev) => {
        const next = [...prev, solveTime];
        solveTimesMsRef.current = next;
        return next;
      });
      setRulesSolved((c) => {
        rulesSolvedRef.current = c + 1;
        return c + 1;
      });
      setScore((s) => {
        scoreRef.current = s + CORRECT_GUESS_POINTS;
        return s + CORRECT_GUESS_POINTS;
      });
    } else {
      setScore((s) => {
        scoreRef.current = s + WRONG_GUESS_POINTS;
        return s + WRONG_GUESS_POINTS;
      });
      triggerShake();
      triggerFlash();
    }

    setPhase("guessResult");

    setTimeout(() => {
      if (endedRef.current) return;
      finishRound();
    }, 1400);
  }

  function finishRound() {
    setPhase("roundEnd");
    setTimeout(() => {
      if (endedRef.current) return;
      const next = roundIndex + 1;
      if (next >= ROUNDS_TOTAL) {
        endedRef.current = true;
        endGame();
      } else {
        setRoundIndex(next);
        beginRound(next);
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

    const finalScore = scoreRef.current;
    const finalRulesSolved = rulesSolvedRef.current;
    const finalClassificationCorrect = classificationCorrectRef.current;
    const finalClassificationTotal = classificationTotalRef.current;
    const finalTotalRuleGuesses = totalRuleGuessesRef.current;
    const finalSolveTimesMs = solveTimesMsRef.current;
    const finalClassifyReactionTimesMs = classifyReactionTimesMsRef.current;

    const ruleDiscoveryAccuracy = Math.round((finalRulesSolved / ROUNDS_TOTAL) * 100);
    const averageRuleGuesses = finalRulesSolved > 0 ? +(finalTotalRuleGuesses / finalRulesSolved).toFixed(2) : 0;
    const averageDiscoveryTimeMs = finalSolveTimesMs.length
      ? Math.round(finalSolveTimesMs.reduce((sum, t) => sum + t, 0) / finalSolveTimesMs.length)
      : 0;
    const classificationAccuracy =
      finalClassificationTotal > 0 ? Math.round((finalClassificationCorrect / finalClassificationTotal) * 100) : 0;
    const avgClassifyReactionTimeMs = finalClassifyReactionTimesMs.length
      ? Math.round(
          finalClassifyReactionTimesMs.reduce((sum, t) => sum + t, 0) / finalClassifyReactionTimesMs.length
        )
      : 0;

    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "rule_discovery",
      accuracy: ruleDiscoveryAccuracy,
      avgTimeMs: averageDiscoveryTimeMs,
      metrics: {
        roundsTotal: ROUNDS_TOTAL,
        rulesSolved: finalRulesSolved,
        ruleDiscoveryAccuracy,
        averageRuleGuesses,
        averageDiscoveryTimeMs,
        classificationCorrect: finalClassificationCorrect,
        classificationTotal: finalClassificationTotal,
        classificationAccuracy,
        avgClassifyReactionTimeMs,
        classifyReactionTimesMs: finalClassifyReactionTimesMs,
        totalRuleGuesses: finalTotalRuleGuesses,
        score: finalScore,
        solveTimesMs: finalSolveTimesMs,
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
    } catch (err) {
      console.error("Failed to save session:", err);
    }

    if (onComplete) onComplete(payload);
    setPhase("done");
  }

  const canGuess = testedLog.length >= MIN_TESTED_BEFORE_GUESS;
  const avgReactionTimeMs = classifyReactionTimesMs.length
    ? Math.round(
        classifyReactionTimesMs.reduce((sum, t) => sum + t, 0) / classifyReactionTimesMs.length
      )
    : 0;

  if (phase === "instructions") {
    return (
      <div className="rd-intro-screen rd-screen">
        <style>{styles}</style>
        <h1>Rule Discovery</h1>
        <p className="sub">
          A hidden rule decides which items belong and which don't. Test
          items one at a time with Accept or Reject, watch the feedback, and
          once you've tested a few, guess the rule from a multiple-choice
          list. Keep track of accepted and rejected items. {ROUNDS_TOTAL} rounds,
           a new hidden rule each time. You've
          got {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="rd-example">
          <span className="chip">4</span>
          <span>→</span>
          <span className="chip accept">Accepted</span>
          <span style={{ margin: "0 6px" }} />
          <span className="chip">7</span>
          <span>→</span>
          <span className="chip reject">Rejected</span>
        </div>
        <button className="rd-btn" onClick={startGame} disabled={!bankLoaded}>
          {bankLoaded ? "Start the Game" : "Loading questions…"}
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
    const ruleDiscoveryAccuracy = Math.round((rulesSolved / ROUNDS_TOTAL) * 100);
    const averageRuleGuesses = rulesSolved > 0 ? +(totalRuleGuesses / rulesSolved).toFixed(2) : 0;
    const averageDiscoveryTimeMs = solveTimesMs.length
      ? Math.round(solveTimesMs.reduce((sum, t) => sum + t, 0) / solveTimesMs.length)
      : 0;
    const classificationAccuracy =
      classificationTotal > 0 ? Math.round((classificationCorrect / classificationTotal) * 100) : 0;

    return (
      <div className="rd-intro-screen rd-screen">
        <style>{styles}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "#E5E7EB", fontSize: 22, marginBottom: 24 }}>Session complete</h2>
          <div className="rd-results-grid">
            <div>
              <div className="label">Score</div>
              <div className="value">{score}</div>
            </div>
            <div>
              <div className="label">Rules Solved</div>
              <div className="value">{rulesSolved}/{ROUNDS_TOTAL}</div>
            </div>
            <div>
              <div className="label">Rule Discovery Accuracy</div>
              <div className="value">{ruleDiscoveryAccuracy}%</div>
            </div>
            <div>
              <div className="label">Classification Accuracy</div>
              <div className="value">{classificationAccuracy}%</div>
            </div>
            <div>
              <div className="label">Avg Guesses to Solve</div>
              <div className="value">{averageRuleGuesses}</div>
            </div>
            <div>
              <div className="label">Avg Discovery Time</div>
              <div className="value">{averageDiscoveryTimeMs}ms</div>
            </div>
          </div>
          <div className="rd-btn-row" style={{ marginTop: 24 }}>
            {onNextGame && (
              <button className="rd-btn" onClick={onNextGame}>
                Next Game →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rd-wrap rd-screen">
      <style>{styles}</style>

      <div className="rd-main">
        <div className="rd-topbar">
          <h2>Rule Discovery</h2>
          <div className="rd-round-badge">
            Round {Math.min(roundIndex + 1, ROUNDS_TOTAL)} of {ROUNDS_TOTAL}
          </div>
        </div>

        <div className="rd-progress-bar">
          <div className="rd-progress-fill" style={{ width: `${(roundIndex / ROUNDS_TOTAL) * 100}%` }} />
        </div>

        <div className={`rd-arena ${shake ? "shake" : ""}`}>
          <div className={`rd-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

          {phase === "classify" && (
            <>
              <div className="rd-classify-col">
                <div className="rd-item-box">{currentItem}</div>
                <div className="rd-decision-row">
                  <button className="rd-accept-btn" onClick={() => classify("accept")}>
                    Accept
                  </button>
                  <button className="rd-reject-btn" onClick={() => classify("reject")}>
                    Reject
                  </button>
                </div>
                <button className="rd-guess-btn" onClick={openGuessScreen} disabled={!canGuess}>
                  {canGuess ? "Guess the Rule" : `Test ${MIN_TESTED_BEFORE_GUESS - testedLog.length} more to guess`}
                </button>
              </div>

              <div className="rd-log-col">
                <div className="rd-log-title">Tested Items</div>
                {testedLog
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <div className="rd-log-entry" key={i}>
                      <span>{entry.item}</span>
                      <span className={`result ${entry.actuallyAccepted ? "accepted" : "rejected"}`}>
                        {entry.actuallyAccepted ? "Accepted" : "Rejected"}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}

          {(phase === "guessing" || phase === "guessResult") && (
            <div className="rd-guess-col">
              <div className="rd-log-title">What's the hidden rule?</div>
              <div className="rd-guess-options">
                {guessOptions.map((opt) => {
                  let cls = "rd-guess-option";
                  if (selectedGuess) {
                    if (opt === rounds[roundIndex].data.rule) cls += " correct";
                    else if (opt === selectedGuess) cls += " wrong";
                  }
                  return (
                    <button key={opt} className={cls} onClick={() => submitGuess(opt)} disabled={!!selectedGuess}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {phase === "guessResult" && (
                <p style={{ color: "#8B93A7", fontSize: 13 }}>
                  {guessWasCorrect
                    ? `Correct. The hidden rule was ${rounds[roundIndex].data.rule}.`
                    : `Not quite. The hidden rule was ${rounds[roundIndex].data.rule}.`}
                </p>
              )}
            </div>
          )}

          {phase === "roundIntro" && (
            <div className="rd-center-msg">
              <h3>Round {roundIndex + 1}</h3>
              <p>A new hidden rule is loaded. Start testing items to figure it out.</p>
            </div>
          )}

          {phase === "roundEnd" && (
            <div className="rd-center-msg">
              <h3>Round {roundIndex + 1} complete</h3>
              <p>Next round loading…</p>
            </div>
          )}
        </div>
      </div>

      <div className="rd-sidebar">
        <div className="rd-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="rd-progress-bar" style={{ marginTop: 8 }}>
            <div
              className="rd-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="rd-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="rd-stat">
          <div className="label">Avg Reaction Time</div>
          <div className="value">{avgReactionTimeMs}ms</div>
        </div>
      </div>
    </div>
  );
}