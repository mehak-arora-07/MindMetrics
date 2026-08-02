import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, getToken, setUser, clearSession } from "../utils/session";

// Drop into client/src/pages/MyProfile.jsx
// Route it in App.jsx: <Route path="/profile" element={<MyProfile />} />
//
// Stats are computed from your real GET /api/sessions and GET /api/assessments
// endpoints — no mock data. Editing name/password needs two small backend
// additions (PATCH /api/auth/profile, POST /api/auth/change-password) — see
// the accompanying auth.js file for those.

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
}

.mp-page {
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.05), transparent 45%),
    radial-gradient(circle at 85% 90%, rgba(167, 139, 250, 0.05), transparent 45%),
    #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.mp-topbar {
  width: 100%;
  max-width: 760px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mp-back {
  background: none;
  border: 1px solid #232A3D;
  color: #8B93A7;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.mp-back:hover { border-color: #34D399; color: #E5E7EB; }

.mp-logout {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #F87171;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.mp-logout:hover { background: rgba(248, 113, 113, 0.16); }

.mp-header-card {
  width: 100%;
  max-width: 760px;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.mp-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #34D399, #3B82F6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #05221A;
  flex-shrink: 0;
}

.mp-header-info h1 {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}

.mp-header-info p {
  color: #8B93A7;
  font-size: 13.5px;
  margin: 0 0 6px;
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

.mp-stats-grid {
  width: 100%;
  max-width: 760px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.mp-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px;
  text-align: center;
}

.mp-stat .label { color: #8B93A7; font-size: 11.5px; margin-bottom: 6px; }
.mp-stat .value { color: #E5E7EB; font-size: 24px; font-weight: 700; }
.mp-stat .value.mint { color: #34D399; }
.mp-stat .value.amber { color: #F59E0B; }
.mp-stat .value.purple { color: #A78BFA; }

.mp-card {
  width: 100%;
  max-width: 760px;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 26px 28px;
}

.mp-card h3 {
  color: #E5E7EB;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 18px;
}

.mp-field {
  margin-bottom: 16px;
}

.mp-field label {
  display: block;
  font-size: 12.5px;
  color: #8B93A7;
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
  transition: border-color 0.15s ease;
}
.mp-field input:focus { border-color: #34D399; }
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
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.mp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.mp-btn-ghost {
  background: none;
  border: 1px solid #232A3D;
  color: #8B93A7;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
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
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}

.mp-recent-item .game { color: #E5E7EB; font-weight: 600; }
.mp-recent-item .meta { color: #8B93A7; font-size: 12px; }
.mp-recent-item .acc { color: #34D399; font-weight: 600; }

.mp-empty {
  color: #4B5468;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

@media (max-width: 560px) {
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

      <div className="mp-topbar">
        <button className="mp-back" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <button className="mp-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <div className="mp-header-card">
        <div className="mp-avatar">{initial}</div>
        <div className="mp-header-info">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className="mp-userid-chip">{user.userId}</span>
        </div>
      </div>

      <div className="mp-stats-grid">
        <div className="mp-stat">
          <div className="label">Assessments</div>
          <div className="value">{statsLoaded ? totalAssessments : "—"}</div>
        </div>
        <div className="mp-stat">
          <div className="label">Completed</div>
          <div className="value mint">{statsLoaded ? completedAssessments : "—"}</div>
        </div>
        <div className="mp-stat">
          <div className="label">Games Played</div>
          <div className="value purple">{statsLoaded ? totalSessions : "—"}</div>
        </div>
        <div className="mp-stat">
          <div className="label">Avg Accuracy</div>
          <div className="value amber">{statsLoaded ? `${avgAccuracy}%` : "—"}</div>
        </div>
      </div>

      <div className="mp-card">
        <h3>Recent Games</h3>
        {!statsLoaded && <div className="mp-empty">Loading…</div>}
        {statsLoaded && recentSessions.length === 0 && (
          <div className="mp-empty">No games played yet.</div>
        )}
        {statsLoaded && recentSessions.length > 0 && (
          <div className="mp-recent-list">
            {recentSessions.map((s) => (
              <div className="mp-recent-item" key={s.sessionId}>
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

      <div className="mp-card">
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

      <div className="mp-card">
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