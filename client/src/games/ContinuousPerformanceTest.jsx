import { useState, useRef, useEffect, useCallback } from "react";
import { saveGameSession } from "../utils/session";
import { useNavigate } from "react-router-dom";
import { getNextGamePath } from "../utils/gameSequence";

// Drop into client/src/games/CPT.jsx
// Fetches rules from the real question bank on load via
// GET /api/questions/cpt. If that fails for any reason (server down,
// empty bank, network issue), it falls back to the small local RULE_BANK
// below so the game never breaks — the instructions screen shows which
// source is actually active ("loaded from database" vs "offline set").

const TOTAL_ROUNDS = 5;
const HIT_POINTS = 10;
const MISS_PENALTY = -3;
const FALSE_POSITIVE_PENALTY = -5;
const SESSION_TIME_LIMIT_MS = 90000;

// ---- Local rule bank (swap for a fetch once the backend endpoint exists) ----
const RULE_BANK = [
  { ruleId: "CPT001", difficulty: "Easy", cue: "A", target: "X" },
  { ruleId: "CPT002", difficulty: "Easy", cue: "H", target: "P" },
  { ruleId: "CPT003", difficulty: "Easy", cue: "B", target: "N" },
  { ruleId: "CPT004", difficulty: "Easy", cue: "D", target: "L" },
  { ruleId: "CPT005", difficulty: "Medium", cue: "T", target: "M" },
  { ruleId: "CPT006", difficulty: "Medium", cue: "S", target: "R" },
  { ruleId: "CPT007", difficulty: "Medium", cue: "C", target: "W" },
  { ruleId: "CPT008", difficulty: "Hard", cue: "K", target: "R", commonLetters: false },
  { ruleId: "CPT009", difficulty: "Hard", cue: "J", target: "Z", commonLetters: false },
  { ruleId: "CPT010", difficulty: "Hard", cue: "Q", target: "X", commonLetters: false },
];

// Round tiers per your spec: Easy, Easy, Medium, Hard, Expert(single question)
// Shortened so each round only needs 3 true-target hits. The last round is
// intentionally just one true-target trial in a short stream — a single
// question rather than a long run of letters.
const ROUND_CONFIG = [
  { difficulty: "Easy", intervalMs: 750, length: 18, requiredHits: 3, dual: false },
  { difficulty: "Easy", intervalMs: 700, length: 20, requiredHits: 3, dual: false },
  { difficulty: "Medium", intervalMs: 550, length: 22, requiredHits: 3, dual: false },
  { difficulty: "Hard", intervalMs: 420, length: 24, requiredHits: 3, dual: false },
  { difficulty: "Hard", intervalMs: 650, length: 6, requiredHits: 1, dual: false },
];

const LETTER_POOL = "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""); // no O/I, avoid confusion

function pickRule(pool, difficulty) {
  const candidates = pool.filter((r) => r.difficulty === difficulty);
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

// Builds a letter stream and injects exact-count true-target trials
// (cue immediately followed by target) at random non-overlapping spots.
// Everything else is random filler, which naturally creates the
// "cue without target" and "target without cue" lure trials.
function buildStream(rules, length, requiredHits) {
  const stream = Array.from(
    { length },
    () => LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
  );

  const hitsPerRule = Math.ceil(requiredHits / rules.length);
  const usedPositions = new Set();

  rules.forEach((rule) => {
    let placed = 0;
    let guard = 0;
    while (placed < hitsPerRule && guard < 500) {
      guard++;
      const p = 1 + Math.floor(Math.random() * (length - 2));
      if (usedPositions.has(p) || usedPositions.has(p - 1)) continue;
      stream[p - 1] = rule.cue;
      stream[p] = rule.target;
      usedPositions.add(p);
      usedPositions.add(p - 1);
      placed++;
    }
  });

  return stream;
}

function isTrueTargetAt(stream, index, rules) {
  if (index === 0) return false;
  const prev = stream[index - 1];
  const curr = stream[index];
  return rules.some((r) => prev === r.cue && curr === r.target);
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

@keyframes cpt-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cpt-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

@keyframes cpt-flash {
  0% { opacity: 0.5; }
  100% { opacity: 0; }
}

@keyframes cpt-letter-in {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes cpt-burst {
  from { transform: scale(0.6); opacity: 0.9; }
  to { transform: scale(2.4); opacity: 0; }
}

.cpt-screen { animation: cpt-fade-in 0.35s ease; }

.cpt-intro-screen {
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

.cpt-intro-screen h1 { color: #E5E7EB; font-size: 32px; font-weight: 700; margin: 0; }
.cpt-intro-screen .sub { color: #8B93A7; font-size: 15px; max-width: 460px; margin: 0; line-height: 1.6; }

.cpt-example {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 26px;
  color: #E5E7EB;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cpt-example .letter-chip {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 18px;
}

.cpt-example .letter-chip.cue { border-color: #3B82F6; color: #60A5FA; }
.cpt-example .letter-chip.target { border-color: #34D399; color: #34D399; }

.cpt-btn {
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
.cpt-btn:active { transform: scale(0.97); }
.cpt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cpt-btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cpt-wrap {
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

.cpt-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.cpt-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cpt-topbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cpt-topbar h2 { color: #E5E7EB; font-size: 17px; font-weight: 600; margin: 0; }

.cpt-round-badge {
  background: rgba(167, 139, 250, 0.12);
  border: 1px solid rgba(167, 139, 250, 0.35);
  color: #A78BFA;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
}

.cpt-rule-banner {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px 20px;
  color: #E5E7EB;
  font-size: 14px;
  text-align: center;
}

.cpt-rule-banner b.cue { color: #60A5FA; }
.cpt-rule-banner b.target { color: #34D399; }

.cpt-arena {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cpt-arena.shake { animation: cpt-shake 0.28s ease; }

.cpt-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}
.cpt-flash.on { animation: cpt-flash 0.3s ease; }

.cpt-letter {
  font-size: 88px;
  font-weight: 700;
  color: #E5E7EB;
  animation: cpt-letter-in 0.15s ease;
}

.cpt-burst {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 2px solid var(--burst-color, #34D399);
  pointer-events: none;
  animation: cpt-burst 0.45s ease-out forwards;
  z-index: 2;
}

.cpt-respond-hint {
  position: absolute;
  bottom: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #232A3D;
  color: #8B93A7;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 20px;
  pointer-events: none;
}

.cpt-progress-bar {
  width: 100%;
  height: 5px;
  background: #232A3D;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 8px;
}

.cpt-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.15s linear;
}

.cpt-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.cpt-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.cpt-stat .label { color: #8B93A7; font-size: 11px; margin-bottom: 4px; }
.cpt-stat .value { color: #E5E7EB; font-size: 18px; font-weight: 600; }
.cpt-stat .value.hits { color: #34D399; }
.cpt-stat .value.misses { color: #F87171; }
.cpt-stat .value.fp { color: #F59E0B; }

.cpt-center-msg {
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

.cpt-center-msg h3 { color: #E5E7EB; font-size: 20px; margin: 0; }
.cpt-center-msg p { color: #8B93A7; font-size: 13px; margin: 0; max-width: 320px; }

.cpt-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

.cpt-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 12px;
}
.cpt-results-grid .label { color: #8B93A7; font-size: 11px; }
.cpt-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

export default function CPT({ onComplete, onNextGame, userId, assessmentId }) {
    const navigate = useNavigate();

  const [phase, setPhase] = useState("instructions"); // instructions | roundIntro | playing | roundEnd | done
  const [roundIndex, setRoundIndex] = useState(0);
  const [rulesForRound, setRulesForRound] = useState([]);
  const [masterPool, setMasterPool] = useState([]); // fetched once, never consumed
  const [ruleBankPool, setRuleBankPool] = useState([]); // working copy, consumed per session
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankSource, setBankSource] = useState(null); // "api" | "local" — for your own debugging
  const [currentLetter, setCurrentLetter] = useState("");
  const [letterPos, setLetterPos] = useState(0);
  const [flash, setFlash] = useState(null); // "hit" | "miss" | "fp" | null
  const [shake, setShake] = useState(false);
  const [bursts, setBursts] = useState([]);

  // aggregate across all rounds
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falsePositives, setFalsePositives] = useState(0);
  const [reactionTimesMs, setReactionTimesMs] = useState([]);
  const [totalTrueTargets, setTotalTrueTargets] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const streamRef = useRef([]);
  const indexRef = useRef(0);
  const clickedThisWindowRef = useRef(false);
  const windowStartRef = useRef(null);
  const tickRef = useRef(null);

  // Mirrors of the metric state, kept in sync alongside every setHits/
  // setMisses/etc call. endGame() is reached through a chain of
  // setInterval/setTimeout callbacks that all trace back to the closure
  // created when startGame() was first called — that closure never gets
  // refreshed as rounds progress, so reading `hits`/`misses`/etc directly
  // there would always see their *initial* (zero) values even though the
  // UI itself re-renders correctly. Refs sidestep that entirely since
  // ref.current is always the latest value regardless of which closure
  // reads it.
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falsePositivesRef = useRef(0);
  const reactionTimesMsRef = useRef([]);
  const totalTrueTargetsRef = useRef(0);
  const scoreRef = useRef(0);
  const sessionTickRef = useRef(null);
  const endedRef = useRef(false);

  // ---- Loading rules from the real question bank ----
  useEffect(() => {
    async function loadRuleBank() {
      try {
        const res = await fetch("http://localhost:5000/api/questions/cpt");
        const result = await res.json();

        if (!result.success || !result.questions || result.questions.length === 0) {
          throw new Error("Bank empty or request unsuccessful");
        }

        const flattened = result.questions.map((r) => ({
          ruleId: r.questionId,
          difficulty: r.difficulty,
          cue: r.data.cue,
          target: r.data.target,
        }));

        setMasterPool(flattened);
        setBankSource("api");
      } catch (err) {
        console.warn("Falling back to local RULE_BANK — API fetch failed:", err.message);
        setMasterPool(RULE_BANK);
        setBankSource("local");
      } finally {
        setBankLoaded(true);
      }
    }
    loadRuleBank();
  }, []);

  function startGame() {
    setPhase("roundIntro");
    setRoundIndex(0);
    setHits(0);
    setMisses(0);
    setFalsePositives(0);
    setReactionTimesMs([]);
    setTotalTrueTargets(0);
    setScore(0);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    endedRef.current = false;
    hitsRef.current = 0;
    missesRef.current = 0;
    falsePositivesRef.current = 0;
    reactionTimesMsRef.current = [];
    totalTrueTargetsRef.current = 0;
    scoreRef.current = 0;
    const freshPool = [...masterPool];
    setRuleBankPool(freshPool);
    startedAtRef.current = new Date().toISOString();
    beginRound(0, freshPool);
  }

  function beginRound(idx, pool) {
    const config = ROUND_CONFIG[idx];
    const usedIds = new Set();
    const rules = [];
    let workingPool = pool;

    const ruleCount = config.dual ? 2 : 1;
    for (let i = 0; i < ruleCount; i++) {
      const candidates = workingPool.filter(
        (r) => r.difficulty === (config.dual ? (i === 0 ? "Easy" : "Medium") : config.difficulty) && !usedIds.has(r.ruleId)
      );
      const pick = candidates[Math.floor(Math.random() * candidates.length)] || workingPool[0];
      rules.push(pick);
      usedIds.add(pick.ruleId);
    }

    workingPool = workingPool.filter((r) => !usedIds.has(r.ruleId));
    setRuleBankPool(workingPool);
    setRulesForRound(rules);

    const stream = buildStream(rules, config.length, config.requiredHits);
    streamRef.current = stream;
    indexRef.current = -1;
    setTotalTrueTargets((t) => {
      const trueCount = stream.reduce(
        (acc, _, i) => acc + (isTrueTargetAt(stream, i, rules) ? 1 : 0),
        0
      );
      totalTrueTargetsRef.current = t + trueCount;
      return t + trueCount;
    });

    setPhase("roundIntro");
    setTimeout(() => {
      setPhase("playing");
      runTick(rules, config, idx, workingPool);
    }, 1400);
  }

  function evaluateWindow(rules) {
    const idx = indexRef.current;
    if (idx < 0) return;
    const stream = streamRef.current;
    const wasTrueTarget = isTrueTargetAt(stream, idx, rules);
    const clicked = clickedThisWindowRef.current;

    if (wasTrueTarget && clicked) {
      const rt = Math.round(performance.now() - windowStartRef.current);
      setReactionTimesMs((arr) => {
        const next = [...arr, rt];
        reactionTimesMsRef.current = next;
        return next;
      });
      setHits((h) => {
        hitsRef.current = h + 1;
        return h + 1;
      });
      setScore((s) => {
        scoreRef.current = s + HIT_POINTS;
        return s + HIT_POINTS;
      });
      setFlash("hit");
      spawnBurst("#34D399");
    } else if (wasTrueTarget && !clicked) {
      setMisses((m) => {
        missesRef.current = m + 1;
        return m + 1;
      });
      setScore((s) => {
        scoreRef.current = s + MISS_PENALTY;
        return s + MISS_PENALTY;
      });
      setFlash("miss");
    } else if (!wasTrueTarget && clicked) {
      setFalsePositives((f) => {
        falsePositivesRef.current = f + 1;
        return f + 1;
      });
      setScore((s) => {
        scoreRef.current = s + FALSE_POSITIVE_PENALTY;
        return s + FALSE_POSITIVE_PENALTY;
      });
      setFlash("fp");
      triggerShake();
    }
    setTimeout(() => setFlash(null), 250);
  }

  function runTick(rules, config, roundIdx, poolAfterThisRound) {
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      evaluateWindow(rules);

      indexRef.current += 1;
      const idx = indexRef.current;
      const stream = streamRef.current;

      if (idx >= stream.length) {
        clearInterval(tickRef.current);
        finishRound(roundIdx, poolAfterThisRound);
        return;
      }

      clickedThisWindowRef.current = false;
      windowStartRef.current = performance.now();
      setCurrentLetter(stream[idx]);
      setLetterPos(idx);
    }, config.intervalMs);
  }

  function finishRound(justFinishedIdx, poolAfterThisRound) {
    setPhase("roundEnd");
    setTimeout(() => {
      const next = justFinishedIdx + 1;
      if (next >= TOTAL_ROUNDS) {
        if (!endedRef.current) {
          endedRef.current = true;
          endGame();
        }
      } else {
        setRoundIndex(next);
        beginRound(next, poolAfterThisRound.length ? poolAfterThisRound : masterPool);
      }
    }, 1600);
  }

  function handleRespond() {
    if (phase !== "playing") return;
    clickedThisWindowRef.current = true;
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Backspace" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        handleRespond();
      }
    }
    // capture: true makes this fire before any bubble-phase listener
    // elsewhere in the app (e.g. a global "Backspace = go back" shortcut,
    // which would make sense to exist given useNavigate/getNextGamePath
    // are in play here) gets a chance to intercept or stopPropagation() it
    // first.
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  }

  function spawnBurst(color) {
    const id = crypto.randomUUID();
    setBursts((b) => [...b, { id, color }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 450);
  }

  async function endGame() {
    clearInterval(sessionTickRef.current);
    const endedAt = new Date().toISOString();
    // Read from refs, not state — see the comment on the ref declarations
    // above for why the state values here can't be trusted at this point.
    const finalHits = hitsRef.current;
    const finalMisses = missesRef.current;
    const finalFalsePositives = falsePositivesRef.current;
    const finalReactionTimesMs = reactionTimesMsRef.current;
    const finalTotalTrueTargets = totalTrueTargetsRef.current;
    const finalScore = scoreRef.current;

    const avgReactionMs = finalReactionTimesMs.length
      ? Math.round(finalReactionTimesMs.reduce((a, b) => a + b, 0) / finalReactionTimesMs.length)
      : 0;
    const accuracy = finalTotalTrueTargets > 0 ? +(finalHits / finalTotalTrueTargets).toFixed(2) : 0;

    // sessionData here is intentionally NOT the full API payload —
    // saveGameSession() (in utils/session.js) attaches assessmentId and
    // the auth token itself, reading them from the same localStorage
    // App.jsx already manages. This keeps every game consistent instead
    // of each one reimplementing the fetch/token/assessmentId logic.
    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "cpt",
      accuracy,
      avgTimeMs: avgReactionMs,
      metrics: {
        score: finalScore,
        roundsCompleted: TOTAL_ROUNDS,
        totalTrueTargets: finalTotalTrueTargets,
        hits: finalHits,
        misses: finalMisses,
        falsePositives: finalFalsePositives,
        avgReactionMs,
        reactionTimesMs: finalReactionTimesMs,
        startedAt: startedAtRef.current,
        endedAt,
      },
            completed: true,
    };
console.log("Assessment ID:", localStorage.getItem("assessmentId"));
console.log("Payload being sent:", payload);
  try {
    const res = await fetch(
      "http://localhost:5000/api/sessions",
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
          localStorage.removeItem("assessmentId");

          alert("Your login session expired. Please log in again.");
          window.location.href = "/";
          return;
        }
    if (!res.ok) {
      console.error(
        "Failed to save session:",
        res.status,
        data
      );
    } else {
      console.log(
        "Session saved successfully:",
        data
      )
       const nextPath = getNextGamePath("cpt");

  if (nextPath) {
    navigate(nextPath);
  }
    }
  } catch (err) {
    console.error("Failed to save session:", err);
  }

  if (onComplete) onComplete(payload);

  setPhase("done");
  }

  const avgReactionMs = reactionTimesMs.length
    ? Math.round(reactionTimesMs.reduce((a, b) => a + b, 0) / reactionTimesMs.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="cpt-intro-screen cpt-screen">
        <style>{styles}</style>
        <h1>Continuous Performance Test</h1>
        <p className="sub">
          Letters will flash one at a time. Each round has a different rule —
          press BACKSPACE only when the target letter immediately follows
          the cue letter. There are {TOTAL_ROUNDS} rounds, and the rule
          changes every round.
        </p>
        <div className="cpt-example">
          <span className="letter-chip cue">A</span>
          <span>→</span>
          <span className="letter-chip target">X</span>
          <span style={{ color: "#8B93A7", fontWeight: 500 }}>= press BACKSPACE</span>
        </div>
        <button className="cpt-btn" onClick={startGame} disabled={!bankLoaded}>
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
      <div className="cpt-intro-screen cpt-screen">
        <style>{styles}</style>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <h2 style={{ color: "#E5E7EB", fontSize: 22, marginBottom: 24 }}>Scores</h2>
          <div className="cpt-results-grid">
            <div>
              <div className="label">Score</div>
              <div className="value">{score}</div>
            </div>
            <div>
              <div className="label">Hits</div>
              <div className="value">
                {hits}/{totalTrueTargets}
              </div>
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
              <div className="label">Avg Reaction</div>
              <div className="value">{avgReactionMs}ms</div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="cpt-wrap cpt-screen">
      <style>{styles}</style>

      <div className="cpt-main">
        <div className="cpt-topbar">
          <h2>Continuous Performance Test</h2>
          <div className="cpt-round-badge">
            Round {Math.min(roundIndex + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}
          </div>
        </div>

        <div className="cpt-progress-bar">
          <div
            className="cpt-progress-fill"
            style={{ width: `${(roundIndex / TOTAL_ROUNDS) * 100}%` }}
          />
        </div>

        {rulesForRound.length > 0 && (
          <div className="cpt-rule-banner">
            {rulesForRound.map((r, i) => (
              <span key={r.ruleId}>
                Press BACKSPACE for <b className="target">{r.target}</b> only when it follows{" "}
                <b className="cue">{r.cue}</b>
                {i < rulesForRound.length - 1 ? " — and — " : ""}
              </span>
            ))}
          </div>
        )}

        <div className={`cpt-arena ${shake ? "shake" : ""}`}>
          <div
            className="cpt-flash"
            style={{
              background: flash === "hit" ? "#34D399" : flash === "fp" ? "#F87171" : "#F59E0B",
              opacity: flash ? undefined : 0,
            }}
            key={flash ? letterPos : "none"}
          >
            <div className={flash ? "cpt-flash on" : ""} style={{ position: "absolute", inset: 0 }} />
          </div>

          {phase === "playing" && <div className="cpt-letter">{currentLetter}</div>}

          {bursts.map((b) => (
            <div
              key={b.id}
              className="cpt-burst"
              style={{ "--burst-color": b.color }}
            />
          ))}

          {phase === "playing" && (
            <div className="cpt-respond-hint">Press BACKSPACE to respond</div>
          )}

          {phase === "roundIntro" && (
            <div className="cpt-center-msg">
              <h3>Round {roundIndex + 1}</h3>
              {rulesForRound.map((r) => (
                <p key={r.ruleId}>
                  Press BACKSPACE for <b style={{ color: "#34D399" }}>{r.target}</b> only after{" "}
                  <b style={{ color: "#60A5FA" }}>{r.cue}</b>
                </p>
              ))}
            </div>
          )}

          {phase === "roundEnd" && (
            <div className="cpt-center-msg">
              <h3>Round {roundIndex + 1} complete</h3>
            </div>
          )}
        </div>
      </div>

      <div className="cpt-sidebar">
        <div className="cpt-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="cpt-progress-bar">
            <div
              className="cpt-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="cpt-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="cpt-stat">
          <div className="label">Avg Reaction</div>
          <div className="value">{avgReactionMs || "--"} ms</div>
        </div>
      </div>
    </div>
  );
}
