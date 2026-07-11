import { useState, useRef, useEffect, useCallback } from "react";

// Drop into client/src/games/WhackACircle.jsx
// Currently console.logs the final payload — once your teammate's
// POST /api/sessions endpoint is ready, swap the console.log in
// endGame() for an actual fetch/axios call (see comment near the bottom).

const TOTAL_TARGETS = 24;
const BASE_LIFETIME_MS = 1600;
const MIN_LIFETIME_MS = 750; // how fast it gets by the end
const SPAWN_GAP_MS = 450;
const CHAOS_STARTS_AT = 14; // index after which double-spawns can happen

const TYPE_CONFIG = {
  normal: { color: "52, 211, 153", ring: "#34D399", points: 1 },
  bonus: { color: "245, 158, 11", ring: "#F59E0B", points: 2 },
  trap: { color: "248, 113, 113", ring: "#F87171", points: 0 },
};

function pickType(index) {
  const r = Math.random();
  if (index > 5 && r < 0.12) return "trap";
  if (r < 0.12 + 0.14) return "bonus";
  return "normal";
}

function lifetimeForIndex(index) {
  const ramp = Math.min(index / TOTAL_TARGETS, 1);
  return Math.round(BASE_LIFETIME_MS - ramp * (BASE_LIFETIME_MS - MIN_LIFETIME_MS));
}

const styles = `
.wac-wrap {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  background: #0B0F19;
  min-height: 100vh;
  padding: 32px;
  font-family: 'Inter', -apple-system, sans-serif;
  box-sizing: border-box;
  position: relative;
}

.wac-arena {
  position: relative;
  background:
    radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.08), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.08), transparent 40%),
    #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  overflow: hidden;
  min-height: 480px;
  transition: transform 0.05s ease;
}

.wac-arena.shake {
  animation: wac-shake 0.28s ease;
}

@keyframes wac-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.wac-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.wac-flash.on {
  animation: wac-flash 0.35s ease;
}

@keyframes wac-flash {
  0% { opacity: 0.55; }
  100% { opacity: 0; }
}

.wac-arena-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 24px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.wac-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.wac-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.wac-combo {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.wac-target-wrap {
  position: absolute;
  width: 60px;
  height: 60px;
  animation: wac-pop 0.12s ease;
}

@keyframes wac-pop {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.wac-target-svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
  pointer-events: none;
}

.wac-target-btn {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.wac-target-btn.normal {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 18px rgba(52, 211, 153, 0.5);
}

.wac-target-btn.bonus {
  background: radial-gradient(circle at 35% 30%, #FCD34D, #F59E0B);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
}

.wac-target-btn.trap {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.55);
}

.wac-burst {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--burst-color, #34D399);
  pointer-events: none;
  animation: wac-burst 0.4s ease-out forwards;
  z-index: 4;
}

@keyframes wac-burst {
  from { transform: scale(0.6); opacity: 0.9; }
  to { transform: scale(2.2); opacity: 0; }
}

.wac-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wac-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.wac-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.wac-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.wac-stat .value.hits { color: #34D399; }
.wac-stat .value.misses { color: #F87171; }
.wac-stat .value.score { color: #F59E0B; }

.wac-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.wac-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.wac-center-msg {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 3;
  text-align: center;
  padding: 24px;
  background: rgba(11, 15, 25, 0.6);
}

.wac-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.wac-center-msg p {
  color: #8B93A7;
  font-size: 14px;
  margin: 0;
  max-width: 340px;
}

.wac-legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8B93A7;
}

.wac-legend span { display: flex; align-items: center; gap: 6px; }

.wac-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.wac-btn {
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

.wac-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.wac-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.wac-results-grid .label { color: #8B93A7; font-size: 11px; }
.wac-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function randomPosition(arenaWidth, arenaHeight) {
  const size = 60;
  const padding = 20;
  const x = padding + Math.random() * (arenaWidth - size - padding * 2);
  const y = 90 + Math.random() * (arenaHeight - size - 90 - padding);
  return { x, y };
}

function TimerRing({ lifetimeMs, color }) {
  return (
    <svg className="wac-target-svg" viewBox="0 0 60 60">
      <circle
        cx="30"
        cy="30"
        r="27"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeOpacity="0.9"
        strokeLinecap="round"
        strokeDasharray={2 * Math.PI * 27}
        style={{
          animation: `wac-ring-drain ${lifetimeMs}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes wac-ring-drain {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: ${2 * Math.PI * 27}; }
        }
      `}</style>
    </svg>
  );
}

export default function WhackACircle({ onComplete }) {
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [targets, setTargets] = useState([]); // active targets on screen
  const [bursts, setBursts] = useState([]);
  const [spawnedCount, setSpawnedCount] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [trapHits, setTrapHits] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [reactionTimesMs, setReactionTimesMs] = useState([]);

  const arenaRef = useRef(null);
  const startedAtRef = useRef(null);
  const timeoutsRef = useRef({});
  const endedRef = useRef(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };
  const addBurst = (x, y, color) => {
    const id = crypto.randomUUID();
    setBursts((b) => [...b, { id, x, y, color }]);
    setTimeout(() => setBursts((b) => b.filter((burst) => burst.id !== id)), 400);
  };

  const spawnRound = useCallback((roundIndex) => {
    const arena = arenaRef.current;
    if (!arena) return;
    const { width, height } = arena.getBoundingClientRect();

    const isChaos = roundIndex >= CHAOS_STARTS_AT && Math.random() < 0.32;
    const count = isChaos ? 2 : 1;
    const lifetime = lifetimeForIndex(roundIndex);
    const newTargets = [];

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const type = pickType(roundIndex);
      const pos = randomPosition(width, height);
      newTargets.push({
        id,
        type,
        x: pos.x,
        y: pos.y,
        lifetime,
        spawnTime: performance.now(),
      });

      timeoutsRef.current[id] = setTimeout(() => {
        setTargets((curr) => curr.filter((t) => t.id !== id));
        if (type !== "trap") {
          setMisses((m) => m + 1);
          setCombo(0);
          triggerFlash();
        }
      }, lifetime);
    }

    setTargets((curr) => [...curr, ...newTargets]);
    setSpawnedCount((c) => c + count);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    if (spawnedCount >= TOTAL_TARGETS) {
      if (!endedRef.current) {
        endedRef.current = true;
        setTimeout(endGame, 400);
      }
      return;
    }
    const gap = setTimeout(
      () => spawnRound(spawnedCount),
      spawnedCount === 0 ? 500 : SPAWN_GAP_MS
    );
    return () => clearTimeout(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, spawnedCount]);

  function handleTargetClick(target) {
    clearTimeout(timeoutsRef.current[target.id]);
    setTargets((curr) => curr.filter((t) => t.id !== target.id));

    const config = TYPE_CONFIG[target.type];
    addBurst(target.x, target.y, config.ring);

    if (target.type === "trap") {
      setTrapHits((t) => t + 1);
      setMisses((m) => m + 1);
      setCombo(0);
      triggerShake();
      triggerFlash();
      return;
    }

    const reactionMs = Math.round(performance.now() - target.spawnTime);
    setReactionTimesMs((prev) => [...prev, reactionMs]);
    setHits((h) => h + 1);
    setScore((s) => s + config.points);
    setCombo((c) => c + 1);
  }

  function startGame() {
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};
    endedRef.current = false;
    setPhase("playing");
    setTargets([]);
    setBursts([]);
    setSpawnedCount(0);
    setHits(0);
    setMisses(0);
    setTrapHits(0);
    setScore(0);
    setCombo(0);
    setReactionTimesMs([]);
    startedAtRef.current = new Date().toISOString();
  }

  function endGame() {
    const endedAt = new Date().toISOString();
    const avgReactionMs = reactionTimesMs.length
      ? Math.round(reactionTimesMs.reduce((a, b) => a + b, 0) / reactionTimesMs.length)
      : 0;

    const payload = {
      sessionId: crypto.randomUUID(),
      userId: null, // fill from auth context / JWT-decoded user id
      gameId: "whack_a_circle",
      startedAt: startedAtRef.current,
      endedAt,
      completed: true,
      metrics: {
        totalTargets: TOTAL_TARGETS,
        hits,
        misses,
        trapHits,
        score,
        avgReactionMs,
        reactionTimesMs,
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

  const avgReactionMs = reactionTimesMs.length
    ? Math.round(reactionTimesMs.reduce((a, b) => a + b, 0) / reactionTimesMs.length)
    : 0;

  return (
    <div className="wac-wrap">
      <style>{styles}</style>

      <div className={`wac-arena ${shake ? "shake" : ""}`} ref={arenaRef}>
        <div className={`wac-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        <div className="wac-arena-header">
          <div>
            <h2>Whack-a-Circle</h2>
            <p>
              Hit mint and gold circles. <b style={{ color: "#F87171" }}>Never</b> hit the red ones.
              It gets faster as you go.
            </p>
          </div>
          {phase === "playing" && combo >= 3 && (
            <div className="wac-combo">🔥 {combo}x combo</div>
          )}
        </div>

        {phase === "intro" && (
          <div className="wac-center-msg">
            <h2>Ready for chaos?</h2>
            <p>
              {TOTAL_TARGETS} targets, shrinking reaction windows, and
              occasional double-spawns. Mint = hit, gold = bonus (2 pts),
              red = trap — avoid it.
            </p>
            <div className="wac-legend">
              <span><i style={{ background: "#34D399" }} /> Normal</span>
              <span><i style={{ background: "#F59E0B" }} /> Bonus</span>
              <span><i style={{ background: "#F87171" }} /> Trap</span>
            </div>
            <button className="wac-btn" onClick={startGame}>
              Start
            </button>
          </div>
        )}

        {phase === "playing" &&
          targets.map((t) => (
            <div key={t.id} className="wac-target-wrap" style={{ left: t.x, top: t.y }}>
              <TimerRing lifetimeMs={t.lifetime} color={TYPE_CONFIG[t.type].ring} />
              <button className={`wac-target-btn ${t.type}`} onClick={() => handleTargetClick(t)} />
            </div>
          ))}

        {bursts.map((b) => (
          <div
            key={b.id}
            className="wac-burst"
            style={{ left: b.x, top: b.y, "--burst-color": b.color }}
          />
        ))}

        {phase === "done" && (
          <div className="wac-center-msg">
            <h2>Round over!</h2>
            <div className="wac-results-grid">
              <div>
                <div className="label">Score</div>
                <div className="value">{score}</div>
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
                <div className="label">Traps hit</div>
                <div className="value">{trapHits}</div>
              </div>
              <div>
                <div className="label">Accuracy</div>
                <div className="value">{Math.round((hits / TOTAL_TARGETS) * 100)}%</div>
              </div>
              <div>
                <div className="label">Avg Reaction</div>
                <div className="value">{avgReactionMs}ms</div>
              </div>
            </div>
            <button className="wac-btn" onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="wac-sidebar">
        <div className="wac-stat">
          <div className="label">Progress</div>
          <div className="value">
            {spawnedCount}/{TOTAL_TARGETS}
          </div>
          <div className="wac-progress-bar">
            <div
              className="wac-progress-fill"
              style={{ width: `${(spawnedCount / TOTAL_TARGETS) * 100}%` }}
            />
          </div>
        </div>
        <div className="wac-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="wac-stat">
          <div className="label">Hits</div>
          <div className="value hits">{hits}</div>
        </div>
        <div className="wac-stat">
          <div className="label">Misses</div>
          <div className="value misses">{misses}</div>
        </div>
        <div className="wac-stat">
          <div className="label">Avg Reaction</div>
          <div className="value">{avgReactionMs || "--"} ms</div>
        </div>
      </div>
    </div>
  );
}
