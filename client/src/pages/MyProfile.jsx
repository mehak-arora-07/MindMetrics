import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, getToken, setUser, clearSession } from "../utils/session";
import { TiTick } from "react-icons/ti";
import { FaBrain,FaPuzzlePiece,FaBolt,FaBalanceScale,FaRegEye,FaChartBar,FaGamepad ,FaTrophy,FaChartLine, FaRobot ,FaRegCalendarAlt
 } from "react-icons/fa";
import { GoGoal } from "react-icons/go";
import { MdOutlineLoop } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb"
// Drop into client/src/pages/MyProfile.jsx
// Route it in App.jsx: <Route path="/profile" element={<MyProfile />} />
//
// Stats are computed from your real GET /api/sessions and GET /api/assessments
// endpoints — no mock data. Editing name/password needs two small backend
// additions (PATCH /api/auth/profile, POST /api/auth/change-password) — see
// the accompanying auth.js file for those.
//
// Visual language matches HomePage.jsx / AboutPage.jsx (dot-grid + floating
// blobs + cursor glow, translucent blurred cards). Keep them in sync if you
// tweak one.

const API_BASE = "http://localhost:5000";

const styles = `
* { box-sizing: border-box; }

html, body, #root {
  margin: 0 !important;
  padding: 0 !important;
  background: #0B0F19;
  width: 100% !important;
  max-width: none !important;
  border: none !important;
  text-align: left !important;
  overflow-x: hidden;
}

@keyframes mp-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.mp-page {
  min-height: 100vh;
  width: 100%;
  background-color: #0B0F19;
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.045) 1px, transparent 0);
  background-size: 34px 34px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #E5E7EB;
  position: relative;
  overflow-x: hidden;
  padding: 112px 24px 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* ---- Ambient background depth (same system as Home/About) ---- */
.mp-bg-depth { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }

.mp-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.18;
  will-change: transform;
  animation-name: mp-blob-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
.mp-blob.b1 { width: 460px; height: 460px; top: -140px; left: -100px; background: radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%); animation-duration: 30s; }
.mp-blob.b2 { width: 420px; height: 420px; top: 18%; right: -140px; background: radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%); animation-duration: 34s; animation-delay: -8s; }
.mp-blob.b3 { width: 380px; height: 380px; bottom: -140px; left: 10%; background: radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%); animation-duration: 28s; animation-delay: -14s; }
.mp-blob.b4 { width: 320px; height: 320px; bottom: 6%; right: 8%; background: radial-gradient(circle, rgba(245,158,11,0.35), transparent 70%); animation-duration: 32s; animation-delay: -20s; }

@keyframes mp-blob-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(36px, -26px) scale(1.06); }
  66% { transform: translate(-24px, 20px) scale(0.96); }
}

.mp-cursor-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 260px;
  margin-left: -130px;
  margin-top: -130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(52,211,153,0.07), rgba(59,130,246,0.035) 45%, transparent 72%);
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: screen;
  opacity: 0;
  transition: opacity 0.4s ease;
  will-change: transform;
}
.mp-cursor-glow.active { opacity: 1; }

/* ---- Nav ---- */
.mp-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  background: rgba(11, 15, 25, 0.78);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #1a2033;
}

.mp-nav-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #E5E7EB;
  text-decoration: none;
}
.mp-nav-logo span { color: #34D399; }
.mp-nav-logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34D399;
  box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.45);
  flex-shrink: 0;
}

.mp-nav-actions { display: flex; align-items: center; gap: 10px; }

.mp-back {
  background: #141A2E;
  border: 1px solid #232A3D;
  color: #C7CCDB;
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.mp-back:hover { border-color: #34D399; color: #E5E7EB; }

.mp-logout {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #F87171;
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
}
.mp-logout:hover { background: rgba(248, 113, 113, 0.18); }

/* ---- Header card ---- */
.mp-header-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  background: rgba(20, 26, 46, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid #232A3D;
  border-radius: 18px;
  padding: 30px 30px;
  display: flex;
  align-items: center;
  gap: 22px;
  overflow: hidden;
  animation: mp-fade-up 0.5s ease both;
}

.mp-header-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.06), rgba(59, 130, 246, 0.05) 60%, transparent);
  pointer-events: none;
}

.mp-avatar {
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #34D399, #3B82F6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: #05221A;
  flex-shrink: 0;
  box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.1), 0 8px 24px -8px rgba(52, 211, 153, 0.4);
}

.mp-header-info { position: relative; z-index: 1; }

.mp-header-info h1 {
  color: #F3F5F8;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.mp-header-info p {
  color: #8B93A7;
  font-size: 13.5px;
  margin: 0 0 8px;
}

.mp-userid-chip {
  display: inline-block;
  background: rgba(167, 139, 250, 0.1);
  border: 1px solid rgba(167, 139, 250, 0.3);
  color: #A78BFA;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  font-family: 'JetBrains Mono', monospace;
}

/* ---- Stats ---- */
.mp-stats-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  animation: mp-fade-up 0.5s ease 0.08s both;
}

.mp-stat {
  position: relative;
  background: rgba(20, 26, 46, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid #232A3D;
  border-radius: 14px;
  padding: 18px;
  text-align: center;
  overflow: hidden;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.mp-stat::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--accent, #34D399);
  opacity: 0.7;
}
.mp-stat:hover { transform: translateY(-3px); border-color: var(--accent, #34D399); }

.mp-stat .icon { font-size: 18px; margin-bottom: 8px; }
.mp-stat .label { color: #8B93A7; font-size: 11.5px; margin-bottom: 6px; }
.mp-stat .value { color: #E5E7EB; font-size: 24px; font-weight: 700; }
.mp-stat .value.mint { color: #34D399; }
.mp-stat .value.amber { color: #F59E0B; }
.mp-stat .value.purple { color: #A78BFA; }
.mp-stat .value.blue { color: #3B82F6; }

/* ---- Generic card ---- */
.mp-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  background: rgba(20, 26, 46, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 26px 28px;
  animation: mp-fade-up 0.5s ease both;
}

.mp-card h3 {
  color: #E5E7EB;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mp-card h3::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34D399;
  box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.5);
}

.mp-field {
  margin-bottom: 16px;
}

.mp-field label {
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #6B7386;
  margin-bottom: 6px;
}

.mp-field input {
  width: 100%;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 11px 14px;
  color: #E5E7EB;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.mp-field input:focus { border-color: #34D399; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.12); }
.mp-field input:disabled { color: #6B7284; cursor: not-allowed; }

.mp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.mp-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.mp-btn {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 13.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.12s ease;
}
.mp-btn:hover:not(:disabled) { box-shadow: 0 6px 20px -6px rgba(52, 211, 153, 0.4); }
.mp-btn:active:not(:disabled) { transform: scale(0.98); }
.mp-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.mp-btn-ghost {
  background: none;
  border: 1px solid #232A3D;
  color: #8B93A7;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.mp-btn-ghost:hover { border-color: #34D399; color: #E5E7EB; }

.mp-notice {
  font-size: 12.5px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.mp-notice.success {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #34D399;
}
.mp-notice.error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #F87171;
}

.mp-recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mp-recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-left: 3px solid var(--tier, #34D399);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.mp-recent-item:hover { transform: translateX(2px); border-color: #2c3450; }

.mp-recent-item .game { color: #E5E7EB; font-weight: 600; }
.mp-recent-item .meta { color: #8B93A7; font-size: 12px; }
.mp-recent-item .acc { color: var(--tier, #34D399); font-weight: 700; }

.mp-empty {
  color: #4B5468;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

@media (max-width: 560px) {
  .mp-page { padding: 96px 16px 40px; }
  .mp-nav { padding: 14px 20px; }
  .mp-header-card { flex-direction: column; text-align: center; }
  .mp-stats-grid { grid-template-columns: 1fr 1fr; }
  .mp-row { grid-template-columns: 1fr; }
}
`;

const GAME_LABELS = {
  pattern_sequence: "Pattern Sequence",
  memory_matrix: "Memory Matrix",
  dual_task: "Dual Task",
  cpt: "Continuous Performance Test",
  multi_switch: "Multi Switch",
  rule_discovery: "Rule Discovery",
  keep_track_task: "Keep Track Task",
  hidden_symbol: "Hidden Symbol",
};

// Session.createdAt is stored as an "en-IN" locale string (DD/MM/YYYY, HH:MM:SS),
// not a real Date — parse it manually rather than trusting `new Date(str)`.
function parseSessionDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(", ");
  if (!datePart) return null;
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = (timePart || "0:0:0").split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
}

// Color tier for an accuracy value, used as a left-border/number accent
// on recent game rows.
function accuracyTier(accuracy) {
  if (accuracy >= 80) return "#34D399";
  if (accuracy >= 50) return "#F59E0B";
  return "#F87171";
}

function BackgroundDepth() {
  return (
    <div className="mp-bg-depth" aria-hidden="true">
      <div className="mp-blob b1" />
      <div className="mp-blob b2" />
      <div className="mp-blob b3" />
      <div className="mp-blob b4" />
    </div>
  );
}

function CursorGlow() {
  const glowRef = useRef(null);
  const [active, setActive] = useState(false);
  const frame = useRef(null);

  useEffect(() => {
    function onMove(e) {
      setActive(true);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
      });
    }
    function onLeave() {
      setActive(false);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return <div ref={glowRef} className={`mp-cursor-glow ${active ? "active" : ""}`} aria-hidden="true" />;
}

export default function MyProfile() {
  const navigate = useNavigate();
  const user = getUser();

  const [sessions, setSessions] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [sessionsRes, assessmentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/sessions`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          fetch(`${API_BASE}/api/assessments`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
        ]);
        const sessionsData = await sessionsRes.json();
        const assessmentsData = await assessmentsRes.json();
        if (sessionsData.success) setSessions(sessionsData.sessions);
        if (assessmentsData.success) setAssessments(assessmentsData.assessments);
      } catch (err) {
        console.error("Could not load profile stats:", err);
      } finally {
        setStatsLoaded(true);
      }
    }
    loadStats();
  }, []);

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter((a) => a.status === "Completed").length;
  const totalSessions = sessions.length;
  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length)
    : 0;

  const recentSessions = [...sessions]
    .sort((a, b) => (parseSessionDate(b.createdAt) || 0) - (parseSessionDate(a.createdAt) || 0))
    .slice(0, 5);

  async function handleSaveName(e) {
    e.preventDefault();
    setNameNotice(null);
    setSavingName(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNameNotice({ type: "error", text: data.message || "Could not update name." });
        return;
      }
      setUser({ ...user, name });
      setNameNotice({ type: "success", text: "Name updated." });
    } catch (err) {
      setNameNotice({ type: "error", text: "Could not reach server." });
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", text: "New passwords don't match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordNotice({ type: "error", text: data.message || "Could not change password." });
        return;
      }
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", text: "Password changed." });
    } catch (err) {
      setPasswordNotice({ type: "error", text: "Could not reach server." });
    } finally {
      setSavingPassword(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  if (!user) {
    return (
      <div className="mp-page">
        <style>{styles}</style>
        <p style={{ color: "#8B93A7" }}>You're not logged in.</p>
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="mp-page">
      <style>{styles}</style>

      <BackgroundDepth />
      <CursorGlow />

      <nav className="mp-nav">
        <Link to="/" className="mp-nav-logo">
          <span className="mp-nav-logo-dot" />
          Mind<span>Metrics</span>
        </Link>
        <div className="mp-nav-actions">
          <Link to="/" className="mp-back">← Back to Home</Link>
          <button className="mp-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </nav>

      <div className="mp-header-card">
        <div className="mp-avatar">{initial}</div>
        <div className="mp-header-info">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className="mp-userid-chip">{user.userId}</span>
        </div>
      </div>

      <div className="mp-stats-grid">
        <div className="mp-stat" style={{ "--accent": "#34D399" }}>
          <div className="icon"><FaChartBar/></div>
          <div className="label">Assessments</div>
          <div className="value">{statsLoaded ? totalAssessments : "—"}</div>
        </div>
        <div className="mp-stat" style={{ "--accent": "#34D399" }}>
          <div className="icon"><TiTick/></div>
          <div className="label">Completed</div>
          <div className="value mint">{statsLoaded ? completedAssessments : "—"}</div>
        </div>
        <div className="mp-stat" style={{ "--accent": "#A78BFA" }}>
          <div className="icon"><FaGamepad /></div>
          <div className="label">Games Played</div>
          <div className="value purple">{statsLoaded ? totalSessions : "—"}</div>
        </div>
        <div className="mp-stat" style={{ "--accent": "#F59E0B" }}>
          <div className="icon"><GoGoal/></div>
          <div className="label">Avg Accuracy</div>
          <div className="value amber">{statsLoaded ? `${avgAccuracy}%` : "—"}</div>
        </div>
      </div>

      <div className="mp-card" style={{ animationDelay: "0.14s" }}>
        <h3>Recent Games</h3>
        {!statsLoaded && <div className="mp-empty">Loading…</div>}
        {statsLoaded && recentSessions.length === 0 && (
          <div className="mp-empty">No games played yet.</div>
        )}
        {statsLoaded && recentSessions.length > 0 && (
          <div className="mp-recent-list">
            {recentSessions.map((s) => (
              <div
                className="mp-recent-item"
                key={s.sessionId}
                style={{ "--tier": accuracyTier(s.accuracy) }}
              >
                <div>
                  <div className="game">{GAME_LABELS[s.gameId] || s.gameId}</div>
                  <div className="meta">{s.createdAt}</div>
                </div>
                <div className="acc">{s.accuracy}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mp-card" style={{ animationDelay: "0.2s" }}>
        <h3>Profile Details</h3>
        {nameNotice && <div className={`mp-notice ${nameNotice.type}`}>{nameNotice.text}</div>}
        <form onSubmit={handleSaveName}>
          <div className="mp-row">
            <div className="mp-field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="mp-field">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>
          </div>
          <div className="mp-actions">
            <button className="mp-btn" type="submit" disabled={savingName || name === user.name}>
              {savingName ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="mp-card" style={{ animationDelay: "0.26s" }}>
        <h3>Change Password</h3>
        {passwordNotice && <div className={`mp-notice ${passwordNotice.type}`}>{passwordNotice.text}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="mp-field">
            <label>Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="mp-row">
            <div className="mp-field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="mp-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mp-actions">
            <button className="mp-btn" type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}