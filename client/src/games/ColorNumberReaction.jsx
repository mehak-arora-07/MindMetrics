import { useState, useRef, useEffect } from "react";

// Drop into client/src/games/ColorNumberReaction.jsx
// Same visual family as DualTask/KeepTrackTask/OperationSpanTask/ContinuousPerformanceTest — dark arena, mint/gold/red accents.
// POSTs the completed session to POST /api/sessions on game end, same pattern as the other games.
//
// Stroop-inspired go/no-go: a color WORD and a NUMBER appear together. The
// word's ink color may or may not match what the word says (the Stroop
// conflict is the word text itself — it's a distractor, the rule only ever
// cares about the ink color you SEE and the number's parity). Press SPACE
// only when both parts of the rule are true. No button, no click target —
// same as the CPT game, response is keyboard-only.
//
// Matches the Sessions mongoose schema:
//   { sessionId, userId, assessmentId, gameId, accuracy, avgTimeMs, metrics, completed }

const SESSION_DURATION_MS = 30000; // ~30 seconds per the spec
const RULE_FLASH_MS = 2500; // how long the rule is shown, alone, before trials start
const STIMULUS_ON_MS = 900; // how long the color/number is visible
const ISI_MS = 500; // blank gap between stimuli
const TRIAL_SLOT_MS = STIMULUS_ON_MS + ISI_MS; // total time a trial "owns" for response purposes
const TOTAL_TRIALS = Math.floor(SESSION_DURATION_MS / TRIAL_SLOT_MS);
const GO_TRIAL_RATE = 0.3; // most trials should be no-go, so impulsive spacebar-mashing gets punished

const CORRECT_POINTS = 10;
const FALSE_CLICK_PENALTY = 5;
const EXPECTED_GO_TRIALS = Math.round(TOTAL_TRIALS * GO_TRIAL_RATE);
const MAX_POSSIBLE_SCORE = EXPECTED_GO_TRIALS * CORRECT_POINTS;

const COLORS = [
  { name: "RED", hex: "#F87171" },
  { name: "BLUE", hex: "#60A5FA" },
  { name: "GREEN", hex: "#34D399" },
  { name: "YELLOW", hex: "#FBBF24" },
  { name: "PURPLE", hex: "#A78BFA" },
];

// The rule is picked once per playthrough for variety across sessions, but
// stays fixed for the whole 30 seconds — same as a real Stroop/go-no-go
// block, the rule doesn't change mid-run.
const RULES = COLORS.flatMap((c) => [
  { targetColor: c.name, parity: "even", label: `Color is ${c.name} AND Number is EVEN` },
  { targetColor: c.name, parity: "odd", label: `Color is ${c.name} AND Number is ODD` },
]);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
  return COLORS[randInt(0, COLORS.length - 1)];
}

function matchesRule(rule, inkColorName, number) {
  const isEven = number % 2 === 0;
  const parityMatches = rule.parity === "even" ? isEven : !isEven;
  return inkColorName === rule.targetColor && parityMatches;
}

function pickNumberWithParity(parity) {
  const n = randInt(0, 9);
  const isEven = n % 2 === 0;
  if ((parity === "even") === isEven) return n;
  // nudge to the other parity, staying in 0-9
  return n === 9 ? 8 : n + 1;
}

function buildStimulus(rule, forceGo) {
  let inkColor, number;

  if (forceGo) {
    inkColor = COLORS.find((c) => c.name === rule.targetColor);
    number = pickNumberWithParity(rule.parity);
  } else {
    // build a random stimulus, then nudge it off-rule if it accidentally matches
    inkColor = randomColor();
    number = randInt(0, 9);
    if (matchesRule(rule, inkColor.name, number)) {
      const others = COLORS.filter((c) => c.name !== rule.targetColor);
      inkColor = others[randInt(0, others.length - 1)];
    }
  }

  const word = randomColor().name; // the printed word — a distractor, independent of ink color
  const isGo = matchesRule(rule, inkColor.name, number);
  return { word, inkColor, number, isGo };
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

.sr-intro-screen {
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

.sr-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.sr-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}

.sr-rule-callout {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 10px;
  max-width: 420px;
}

.sr-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.sr-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.sr-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.sr-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.sr-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.sr-wrap {
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

.sr-arena {
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

.sr-arena.shake {
  animation: sr-shake 0.28s ease;
}

@keyframes sr-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.sr-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.sr-flash.on {
  animation: sr-flash 0.35s ease;
}

@keyframes sr-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.sr-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.sr-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.sr-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.sr-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.sr-board-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 20px;
  text-align: center;
}

.sr-phase-label {
  color: #8B93A7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sr-stimulus-card {
  min-width: 220px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 20px;
  padding: 30px 40px;
  transition: border-color 0.1s ease, background 0.1s ease;
}

.sr-stimulus-card.sr-good {
  border-color: #34D399;
  background: rgba(52, 211, 153, 0.06);
}

.sr-word {
  font-size: 46px;
  font-weight: 800;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  letter-spacing: 0.02em;
}

.sr-number {
  font-size: 34px;
  font-weight: 700;
  color: #E5E7EB;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.sr-blank-placeholder {
  min-width: 220px;
  min-height: 180px;
}

.sr-respond-hint {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #232A3D;
  color: #8B93A7;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: 20px;
  pointer-events: none;
}

.sr-rule-flash-card {
  max-width: 440px;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.4);
  border-radius: 20px;
  padding: 32px 36px;
}

.sr-rule-flash-text {
  color: #34D399;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.4;
}

.sr-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sr-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.sr-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.sr-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.sr-stat .value.score { color: #F59E0B; }
.sr-stat .value.wrong { color: #F87171; }
.sr-stat .value.good { color: #34D399; }

.sr-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.sr-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.sr-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.sr-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.sr-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.sr-btn {
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

.sr-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.sr-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.sr-results-grid .label { color: #8B93A7; font-size: 11px; }
.sr-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function getResultCopy(score) {
  const pct = MAX_POSSIBLE_SCORE > 0 ? score / MAX_POSSIBLE_SCORE : 0;
  if (pct < 0.35) {
    return { title: "Room to grow" };
  }
  if (pct < 0.7) {
    return { title: "Good control!" };
  }
  return { title: "Razor-sharp focus ⚡" };
}

export default function ColorNumberReaction({ onComplete, userId, assessmentId }) {
  const [phase, setPhase] = useState("instructions"); // instructions | ruleFlash | playing | done
  const [rule, setRule] = useState(null);
  const [ruleFlashMsLeft, setRuleFlashMsLeft] = useState(RULE_FLASH_MS);
  const [stimulus, setStimulus] = useState(null); // null while blank (ISI)
  const [flashGood, setFlashGood] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [falseClicks, setFalseClicks] = useState(0);
  const [missedResponses, setMissedResponses] = useState(0);
  const [reactionTimesMs, setReactionTimesMs] = useState([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_DURATION_MS);

  const ruleRef = useRef(null);
  const trialCountRef = useRef(0);
  const currentTrialRef = useRef(null); // { isGo, responded, startTime }
  const endedRef = useRef(false);
  const startedAtRef = useRef(null);
  const sessionTickRef = useRef(null);
  const ruleFlashTickRef = useRef(null);
  const trialTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  // Mirrors of the metric state — trials are driven by a setTimeout chain,
  // so endGame() (reached from inside that chain, or from the separate
  // session-tick interval) can't trust React state to be current. Same
  // ref-mirror pattern as OperationSpanTask/KeepTrackTask.
  const scoreRef = useRef(0);
  const correctCountRef = useRef(0);
  const falseClicksRef = useRef(0);
  const missedResponsesRef = useRef(0);
  const correctRejectionsRef = useRef(0);
  const reactionTimesMsRef = useRef([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };
  const triggerGood = () => {
    setFlashGood(true);
    setTimeout(() => setFlashGood(false), 250);
  };

  function scheduleNextTrial() {
    if (endedRef.current) return;
    if (trialCountRef.current >= TOTAL_TRIALS) {
      endedRef.current = true;
      endGame();
      return;
    }

    trialCountRef.current += 1;
    const forceGo = Math.random() < GO_TRIAL_RATE;
    const stim = buildStimulus(ruleRef.current, forceGo);

    currentTrialRef.current = {
      isGo: stim.isGo,
      responded: false,
      startTime: performance.now(),
    };
    setStimulus(stim);
    setFlashGood(false);

    hideTimeoutRef.current = setTimeout(() => {
      if (endedRef.current) return;
      setStimulus(null);
    }, STIMULUS_ON_MS);

    trialTimeoutRef.current = setTimeout(() => {
      if (endedRef.current) return;
      const trial = currentTrialRef.current;
      if (trial && !trial.responded) {
        if (trial.isGo) {
          setMissedResponses((c) => {
            missedResponsesRef.current = c + 1;
            return c + 1;
          });
        } else {
          correctRejectionsRef.current += 1;
        }
      }
      currentTrialRef.current = null;
      scheduleNextTrial();
    }, TRIAL_SLOT_MS);
  }

  function handleRespond() {
    if (phase !== "playing" || endedRef.current) return;
    const trial = currentTrialRef.current;
    if (!trial || trial.responded) return;
    trial.responded = true;

    if (trial.isGo) {
      const rt = Math.round(performance.now() - trial.startTime);
      setCorrectCount((c) => {
        correctCountRef.current = c + 1;
        return c + 1;
      });
      setReactionTimesMs((arr) => {
        const next = [...arr, rt];
        reactionTimesMsRef.current = next;
        return next;
      });
      setScore((s) => {
        const next = s + CORRECT_POINTS;
        scoreRef.current = next;
        return next;
      });
      triggerGood();
    } else {
      setFalseClicks((c) => {
        falseClicksRef.current = c + 1;
        return c + 1;
      });
      setScore((s) => {
        const next = Math.max(0, s - FALSE_CLICK_PENALTY);
        scoreRef.current = next;
        return next;
      });
      triggerShake();
      triggerFlash();
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.code === "Space") {
        e.preventDefault();
        handleRespond();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // overall session countdown (backstop in case the trial chain runs long)
  useEffect(() => {
    if (phase !== "playing") return;
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

  function startGame() {
    endedRef.current = false;
    trialCountRef.current = 0;
    currentTrialRef.current = null;
    scoreRef.current = 0;
    correctCountRef.current = 0;
    falseClicksRef.current = 0;
    missedResponsesRef.current = 0;
    correctRejectionsRef.current = 0;
    reactionTimesMsRef.current = [];

    setScore(0);
    setCorrectCount(0);
    setFalseClicks(0);
    setMissedResponses(0);
    setReactionTimesMs([]);
    setTimeLeftMs(SESSION_DURATION_MS);

    const chosenRule = RULES[randInt(0, RULES.length - 1)];
    ruleRef.current = chosenRule;
    setRule(chosenRule);

    startedAtRef.current = new Date().toISOString();
    setPhase("ruleFlash");
    setRuleFlashMsLeft(RULE_FLASH_MS);

    ruleFlashTickRef.current = setInterval(() => {
      setRuleFlashMsLeft((t) => {
        const next = t - 100;
        if (next <= 0) {
          clearInterval(ruleFlashTickRef.current);
          setPhase("playing");
          scheduleNextTrial();
          return 0;
        }
        return next;
      });
    }, 100);
  }

  async function endGame() {
    clearInterval(sessionTickRef.current);
    clearInterval(ruleFlashTickRef.current);
    clearTimeout(trialTimeoutRef.current);
    clearTimeout(hideTimeoutRef.current);
    currentTrialRef.current = null;

    const finalScore = scoreRef.current;
    const finalCorrect = correctCountRef.current;
    const finalFalseClicks = falseClicksRef.current;
    const finalMissed = missedResponsesRef.current;
    const finalCorrectRejections = correctRejectionsRef.current;
    const finalReactionTimes = reactionTimesMsRef.current;

    const totalGoTrials = finalCorrect + finalMissed;
    const totalNoGoTrials = finalFalseClicks + finalCorrectRejections;
    const totalTrials = totalGoTrials + totalNoGoTrials;
    const accuracy =
      totalTrials > 0
        ? Math.round(((finalCorrect + finalCorrectRejections) / totalTrials) * 100)
        : 0;

    const avgReactionTimeMs = finalReactionTimes.length
      ? Math.round(finalReactionTimes.reduce((a, b) => a + b, 0) / finalReactionTimes.length)
      : 0;

    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "color_number_reaction",
      accuracy,
      avgTimeMs: avgReactionTimeMs,
      metrics: {
        score: finalScore,
        maxPossibleScore: MAX_POSSIBLE_SCORE,
        rule: ruleRef.current ? ruleRef.current.label : null,
        correctResponses: finalCorrect,
        falseClicks: finalFalseClicks,
        missedResponses: finalMissed,
        correctRejections: finalCorrectRejections,
        goTrials: totalGoTrials,
        noGoTrials: totalNoGoTrials,
        totalTrials,
        avgReactionTimeMs,
        reactionTimesMs: finalReactionTimes,
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

  const avgReactionTimeMs = reactionTimesMs.length
    ? Math.round(reactionTimesMs.reduce((a, b) => a + b, 0) / reactionTimesMs.length)
    : 0;

  if (phase === "instructions") {
    return (
      <div className="sr-intro-screen">
        <style>{styles}</style>
        <h1>Color &amp; Number Reaction</h1>
        <p className="sub">
          A color word and a number appear together. The word's text can be
          misleading — a trap. What matters is the ink color you see and the
          number's parity. Press SPACE only when the rule is true. It's a
          {" "}
          {Math.round(SESSION_DURATION_MS / 1000)}-second sprint.
        </p>
        <div className="sr-intro-cards">
          <div className="sr-intro-card">
            <div className="dot" />
            <div className="title">Watch</div>
            <div className="desc">A color and a number flash on screen together.</div>
          </div>
          <div className="sr-intro-card">
            <div className="dot" />
            <div className="title">Check the rule</div>
            <div className="desc">Ignore the word's meaning — go by ink color + parity.</div>
          </div>
          <div className="sr-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Respond</div>
            <div className="desc">Press SPACE only if both conditions are true.</div>
          </div>
        </div>
        <button className="sr-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }

  return (
    <div className="sr-wrap">
      <style>{styles}</style>

      <div className={`sr-arena ${shake ? "shake" : ""}`}>
        <div className={`sr-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        {phase !== "done" && (
          <div className="sr-arena-header">
            <div>
              <h2>Color &amp; Number Reaction</h2>
              <p>Press SPACE only when the rule is true.</p>
            </div>
            {rule && phase === "playing" && <div className="sr-badge">{rule.label}</div>}
          </div>
        )}

        {phase === "ruleFlash" && rule && (
          <div className="sr-board-area">
            <div className="sr-phase-label">Remember this rule</div>
            <div className="sr-rule-flash-card">
              <div className="sr-rule-flash-text">{rule.label}</div>
            </div>
            <div className="sr-progress-bar" style={{ maxWidth: 320, width: "100%" }}>
              <div
                className="sr-progress-fill"
                style={{ width: `${(ruleFlashMsLeft / RULE_FLASH_MS) * 100}%` }}
              />
            </div>
            <div className="sr-phase-label">Starting in {Math.ceil(ruleFlashMsLeft / 1000)}…</div>
          </div>
        )}

        {phase === "playing" && (
          <div className="sr-board-area">
            <div className="sr-phase-label">Stay ready</div>
            {stimulus ? (
              <div className={`sr-stimulus-card ${flashGood ? "sr-good" : ""}`}>
                <div className="sr-word" style={{ color: stimulus.inkColor.hex }}>
                  {stimulus.word}
                </div>
                <div className="sr-number">{stimulus.number}</div>
              </div>
            ) : (
              <div className="sr-blank-placeholder" />
            )}
            <div className="sr-respond-hint">Press SPACE to respond</div>
          </div>
        )}

        {phase === "done" && (
          <div className="sr-center-msg">
            <h2>{getResultCopy(score).title}</h2>
            <div className="sr-results-grid">
              <div>
                <div className="label">Score</div>
                <div className="value">{score}</div>
              </div>
              <div>
                <div className="label">Correct Responses</div>
                <div className="value">{correctCount}</div>
              </div>
              <div>
                <div className="label">False Clicks</div>
                <div className="value">{falseClicks}</div>
              </div>
              <div>
                <div className="label">Missed Responses</div>
                <div className="value">{missedResponses}</div>
              </div>
              <div>
                <div className="label">Avg Reaction Time</div>
                <div className="value">{avgReactionTimeMs}ms</div>
              </div>
              <div>
                <div className="label">Rule Used</div>
                <div className="value" style={{ fontSize: 12 }}>
                  {rule ? rule.label : "—"}
                </div>
              </div>
            </div>
            <button className="sr-btn" onClick={() => setPhase("instructions")}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="sr-sidebar">
        <div className="sr-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="sr-progress-bar">
            <div
              className="sr-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_DURATION_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="sr-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="sr-stat">
          <div className="label">Correct</div>
          <div className="value good">{correctCount}</div>
        </div>
        <div className="sr-stat">
          <div className="label">False Clicks</div>
          <div className="value wrong">{falseClicks}</div>
        </div>
        <div className="sr-stat">
          <div className="label">Missed</div>
          <div className="value">{missedResponses}</div>
        </div>
      </div>
    </div>
  );
}
