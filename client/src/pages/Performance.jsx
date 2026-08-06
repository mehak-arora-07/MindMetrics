import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearSession, startAssessment } from "../utils/session";
import { FaBrain,FaPuzzlePiece,FaBolt,FaBalanceScale,FaRegEye,FaChartBar ,FaTrophy,FaChartLine
 } from "react-icons/fa";
import { GoGoal } from "react-icons/go";


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

@keyframes pp-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.pp-page {
  width: 100%;
  min-height: 100vh;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #E5E7EB;
  position: relative;
  overflow-x: hidden;
}

/* ---- Ambient depth (subtle, non-flashy) ---- */
.pp-bg-depth {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.pp-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(139, 147, 167, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 147, 167, 0.045) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 25%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 25%, transparent 70%);
}

.pp-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(110px);
  opacity: 0.1;
}
.pp-blob.b1 { width: 480px; height: 480px; top: -160px; left: -100px; background: radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%); }
.pp-blob.b2 { width: 420px; height: 420px; top: 10%; right: -140px; background: radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%); }

/* ---- Nav (identical to HomePage) ---- */
.hp-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 16px 40px;
  background: rgba(11, 15, 25, 0.78);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #1a2033;
}

.hp-nav::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.35), transparent);
}

.hp-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  cursor: default;
  flex-shrink: 0;
}

.hp-logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34D399;
  flex-shrink: 0;
  box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.45);
}

.hp-nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 auto;
  padding: 4px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid #1a2033;
  border-radius: 999px;
}

.hp-nav-links a {
  color: #8B93A7;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  padding: 7px 14px;
  border-radius: 999px;
  transition: color 0.15s ease, background 0.15s ease;
}

.hp-nav-links a:hover {
  color: #E5E7EB;
  background: rgba(255, 255, 255, 0.05);
}

.hp-nav-links a.active {
  color: #34D399;
  background: rgba(52, 211, 153, 0.08);
}

.hp-nav-cta {
  display: inline-flex;
  align-items: center;
  background: #141A2E;
  border: 1px solid #232A3D;
  color: #E5E7EB;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}
.hp-nav-cta:hover { border-color: #34D399; color: #34D399; }

@media (max-width: 760px) {
  .hp-nav-links { display: none; }
}
.hp-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.4px;
  cursor: pointer;   /* <-- Make sure this is pointer */
}

.hp-logo-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #34D399;
  flex-shrink: 0;
}

.hp-wordmark {
  color: #E5E7EB;
  transition: background-position 0.5s ease, color 0.1s ease;
  background-image: linear-gradient(
    90deg,
    #34D399,
    #3B82F6,
    #A78BFA,
    #F59E0B,
    #F87171
  );
  background-size: 300% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
}

.hp-wordmark:hover {
  color: transparent;
  background-position: 0% 0;
}
// .hp-wordmark { color: #E5E7EB; transition: color 0.2s ease; }
// .hp-wordmark span { color: #34D399; }
// .hp-logo:hover .hp-wordmark { color: #F5F6F8; }

.hp-nav-right { position: relative; }

.hp-menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 999px;
  padding: 6px 14px 6px 6px;
  cursor: pointer;
  color: #E5E7EB;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  transition: border-color 0.15s ease;
}
.hp-menu-btn:hover { border-color: #34D399; }

.hp-menu-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #34D399, #3B82F6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #05221A;
  flex-shrink: 0;
}

.hp-menu-hamburger { display: flex; flex-direction: column; gap: 3px; width: 14px; }
.hp-menu-hamburger span { height: 2px; background: #8B93A7; border-radius: 2px; transition: transform 0.2s ease, opacity 0.2s ease; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(2) { opacity: 0; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

.hp-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  pointer-events: none;
  transition: max-height 0.25s ease, opacity 0.2s ease;
}
.hp-dropdown.open { max-height: 400px; opacity: 1; pointer-events: auto; }

.hp-dropdown-user { padding: 10px 12px; border-bottom: 1px solid #232A3D; margin-bottom: 6px; }
.hp-dropdown-user .name { color: #E5E7EB; font-size: 13px; font-weight: 600; }
.hp-dropdown-user .email { color: #8B93A7; font-size: 11px; margin-top: 2px; }

.hp-dropdown a, .hp-dropdown button {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: #C7CCDB;
  font-size: 13.5px;
  font-family: inherit;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.hp-dropdown a:hover, .hp-dropdown button:hover { background: rgba(255, 255, 255, 0.05); color: #E5E7EB; }
.hp-dropdown button.logout { color: #F87171; }
.hp-dropdown button.logout:hover { background: rgba(248, 113, 113, 0.1); }

/* ---- Buttons (identical to HomePage) ---- */
.hp-btn-primary {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 10px;
  padding: 13px 26px;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease;
}
.hp-btn-primary:hover { box-shadow: 0 6px 24px rgba(52, 211, 153, 0.3); }
.hp-btn-primary:active { transform: scale(0.97); }

.hp-btn-secondary {
  background: transparent;
  color: #E5E7EB;
  border: 1px solid #232A3D;
  border-radius: 10px;
  padding: 13px 26px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.hp-btn-secondary:hover { border-color: #34D399; }

/* ---- Page shell ---- */
.pp-container {
  position: relative;
  z-index: 2;
  max-width: 1160px;
  margin: 0 auto;
  padding: 128px 24px 80px;
}

/* ---- Hero ---- */
.pp-hero {
  margin-bottom: 44px;
  animation: pp-fade-up 0.5s ease both;
}

.pp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.28);
  color: #34D399;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 14px 6px 10px;
  border-radius: 20px;
  margin-bottom: 18px;
}
.pp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; }

.pp-hero h1 {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.1;
  color: #F3F5F8;
  margin: 0 0 10px;
}

.pp-hero p {
  font-size: 15.5px;
  color: #9CA3B5;
  line-height: 1.65;
  max-width: 560px;
  margin: 0;
}

/* ---- Stat cards ---- */
.pp-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 44px;
  animation: pp-fade-up 0.5s ease 0.05s both;
}

@media (max-width: 980px) {
  .pp-stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .pp-stats-grid { grid-template-columns: 1fr; }
}

.pp-stat-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 22px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.pp-stat-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent, #34D399);
  box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--accent, #34D399) 55%, transparent);
}

.pp-stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--accent, #34D399) 15%, transparent);
  color: var(--accent, #34D399);
}

.pp-stat-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #F3F5F8;
  margin-bottom: 4px;
  line-height: 1.2;
}

.pp-stat-label {
  font-size: 12.5px;
  color: #8B93A7;
  font-weight: 500;
}

/* ---- Filters bar ---- */
.pp-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  animation: pp-fade-up 0.5s ease 0.1s both;
}

.pp-search {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
}

.pp-search svg {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: #6B7386;
  pointer-events: none;
}

.pp-search input {
  width: 100%;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-family: inherit;
  font-size: 13.5px;
  padding: 11px 14px 11px 38px;
  outline: none;
  transition: border-color 0.15s ease;
}
.pp-search input::placeholder { color: #6B7386; }
.pp-search input:focus { border-color: #34D399; }

.pp-filter-select, .pp-filter-date {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #C7CCDB;
  font-family: inherit;
  font-size: 13.5px;
  padding: 11px 14px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
  flex: 0 0 auto;
}
.pp-filter-select:focus, .pp-filter-date:focus,
.pp-filter-select:hover, .pp-filter-date:hover { border-color: #34D399; }

.pp-filter-date { color-scheme: dark; }

.pp-clear-filters {
  background: none;
  border: none;
  color: #8B93A7;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 11px 6px;
  transition: color 0.15s ease;
}
.pp-clear-filters:hover { color: #F87171; }

/* ---- Table ---- */
.pp-table-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  overflow: hidden;
  animation: pp-fade-up 0.5s ease 0.15s both;
}

.pp-table-scroll { overflow-x: auto; }

.pp-table { width: 100%; border-collapse: collapse; min-width: 720px; }

.pp-table thead th {
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #6B7386;
  padding: 16px 20px;
  border-bottom: 1px solid #232A3D;
  white-space: nowrap;
}

.pp-table tbody tr {
  border-bottom: 1px solid #1a2033;
  transition: background 0.15s ease;
  cursor: pointer;
}
.pp-table tbody tr:last-child { border-bottom: none; }
.pp-table tbody tr:hover { background: rgba(255, 255, 255, 0.025); }

.pp-table td {
  padding: 16px 20px;
  font-size: 13.5px;
  color: #C7CCDB;
  white-space: nowrap;
}

.pp-td-date { color: #8B93A7; }
.pp-td-id { color: #E5E7EB; font-weight: 600; font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 12.5px; }

.pp-score {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-weight: 700;
  font-size: 14px;
}
.pp-score .max { font-size: 11px; font-weight: 500; color: #6B7386; }
.pp-score-dash { color: #4B5468; font-weight: 500; }

.pp-profile-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: color-mix(in srgb, var(--accent, #34D399) 12%, transparent);
  color: var(--accent, #34D399);
  border-radius: 999px;
  padding: 5px 12px 5px 8px;
  font-size: 12px;
  font-weight: 600;
}

.pp-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
}
.pp-status.completed { background: rgba(52, 211, 153, 0.12); color: #34D399; }
.pp-status.progress { background: rgba(245, 158, 11, 0.12); color: #F59E0B; }
.pp-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.pp-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid #232A3D;
  color: #C7CCDB;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.pp-view-btn:hover { border-color: #34D399; color: #34D399; background: rgba(52, 211, 153, 0.06); }

.pp-no-results {
  padding: 60px 20px;
  text-align: center;
  color: #6B7386;
  font-size: 13.5px;
}

/* ---- Empty state ---- */
.pp-empty {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 20px;
  padding: 72px 32px;
  text-align: center;
  animation: pp-fade-up 0.5s ease 0.1s both;
}

.pp-empty-illustration {
  width: 88px;
  height: 88px;
  margin: 0 auto 26px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(59, 130, 246, 0.12));
  border: 1px solid #232A3D;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pp-empty h3 {
  font-size: 20px;
  font-weight: 700;
  color: #E5E7EB;
  margin: 0 0 10px;
}

.pp-empty p {
  font-size: 14px;
  color: #8B93A7;
  line-height: 1.6;
  max-width: 380px;
  margin: 0 auto 28px;
}

/* ---- Mobile table -> card list ---- */
@media (max-width: 720px) {
  .pp-container { padding: 108px 16px 60px; }
  .pp-hero h1 { font-size: 30px; }
  .pp-stats-grid { margin-bottom: 32px; }
  .pp-filters { gap: 8px; }
  .pp-search { flex: 1 1 100%; }

  .pp-table thead { display: none; }
  .pp-table, .pp-table tbody, .pp-table tr, .pp-table td { display: block; width: 100%; }
  .pp-table { min-width: 0; }
  .pp-table tbody tr {
    padding: 16px 18px;
    border-bottom: 1px solid #1a2033;
  }
  .pp-table td {
    padding: 6px 0;
    white-space: normal;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .pp-table td::before {
    content: attr(data-label);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6B7386;
    flex-shrink: 0;
  }
  .pp-td-action { justify-content: flex-end !important; padding-top: 12px !important; }
  .pp-td-action::before { content: none; }
  .pp-view-btn { width: 100%; justify-content: center; }
}
`;

// Six cognitive profiles measured by the assessment series — mirrors the
// "Skills measured" section on the Home Page so terminology stays consistent.
const PROFILES = [
  { label: "Memory", hex: "#34D399", icon:<FaBrain /> },
  { label: "Attention", hex: "#3B82F6", icon: <GoGoal />
 },
  { label: "Observation", hex: "#A78BFA", icon: <FaRegEye />
 },
  { label: "Planning", hex: "#3B82F6", icon: <FaPuzzlePiece />
 },
  { label: "Reaction", hex: "#F59E0B", icon: <FaBolt />
 },
  { label: "Decision Making", hex: "#F87171", icon: <FaBalanceScale />
 },
];

function profileMeta(label) {
  return PROFILES.find((p) => p.label === label) || { hex: "#8B93A7", icon: "●" };
}

function scoreColor(score) {
  if (score == null) return "#6B7386";
  if (score >= 85) return "#34D399";
  if (score >= 70) return "#3B82F6";
  if (score >= 50) return "#F59E0B";
  return "#F87171";
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}


function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ref, onClose]);
}

function EmptyIllustration() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="6" y="9" width="28" height="22" rx="3" stroke="#34D399" strokeWidth="1.6" opacity="0.6" />
      <path d="M12 24l4.5-6 4 4.5L26 15l4 5" stroke="#3B82F6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx="20" cy="20" r="17.5" stroke="#232A3D" strokeWidth="1" />
    </svg>
  );
}

export default function PerformancePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();
  useEffect(() => {

    fetch(`${import.meta.env.VITE_API_URL}/api/assessments`,{
        headers:{
            Authorization:`Bearer ${localStorage.getItem("token")}`
        }
    })
    .then(res=>res.json())
    .then(data => {

    const list = data.assessments || [];

    setAssessments(
        list.map(a => ({
            id: a.assessmentId,
            date: a.dateTime,
            overallScore: a.overallScore,
            profile: a.gameplayProfile,
            status: a.status
        }))
    );

    setLoading(false);

})
    .catch(err=>{

        console.error(err);
        setLoading(false);

    });

},[]);
  useOutsideClose(menuRef, () => setMenuOpen(false));



 async function handleStart() {
  if (!user) {
    navigate("/login");
    return;
  }

  setStarting(true);

  try {
    await startAssessment();
    navigate("/play/memory-matrix");
  } catch (err) {
    console.error("Could not start assessment:", err);
    alert("Couldn't start the assessment. Please try again.");
  } finally {
    setStarting(false);
  }
}

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  const completedScores = assessments
    .filter((a) => a.status === "Completed" && a.overallScore != null)
    .map((a) => a.overallScore);

  const stats = {
    total: assessments.length,
    highest: completedScores.length ? Math.max(...completedScores) : null,
    average: completedScores.length
      ? Math.round(completedScores.reduce((s, v) => s + v, 0) / completedScores.length)
      : null,
    latestProfile: assessments.length
      ? [...assessments].sort((a, b) => new Date(b.date) - new Date(a.date))[0].profile
      : null,
  };

  const filtered = useMemo(() => {
    return assessments
      .filter((a) => {
        if (search && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
        if (dateFilter) {

    const assessmentDate = new Date(a.date)
        .toISOString()
        .split("T")[0];

    if (assessmentDate !== dateFilter)
        return false;
}
       if (
    profileFilter !== "all" &&
    a.profile?.toLowerCase() !== profileFilter.toLowerCase()
)
    return false;
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [assessments, search, dateFilter, profileFilter, statusFilter]);

  const hasActiveFilters = search || dateFilter || profileFilter !== "all" || statusFilter !== "all";
  function viewDetails(id) {
    navigate(`/analytics/${id}`);
}
  function clearFilters() {
    setSearch("");
    setDateFilter("");
    setProfileFilter("all");
    setStatusFilter("all");
  }
  const profileOptions = [
    ...new Set(
        assessments
            .map(a => a.profile)
            .filter(Boolean)
    )
];
//   if(loading){
//     return <h2>Loading...</h2>;
// }
  return (
    <div className="pp-page">
      <style>{styles}</style>

      <div className="pp-bg-depth" aria-hidden="true">
        <div className="pp-bg-grid" />
        <div className="pp-blob b1" />
        <div className="pp-blob b2" />
      </div>

      <nav className="hp-nav">
        <Link to="/" style={{ textDecoration: "none" }}>
          <div className="hp-logo">
            <span className="hp-logo-dot" />
            <span className="hp-wordmark">Mind Metrics</span>
          </div>
        </Link>


        {/* {user && (
          <button className="hp-nav-cta" onClick={handleStart} disabled={starting}>
            {starting ? "Starting…" : "Start Assessment"}
          </button>
        )} */}

        <div className="hp-nav-right" ref={menuRef}>
          {user ? (
            <>
              <button className={`hp-menu-btn ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen((o) => !o)}>
                <span className="hp-menu-avatar">{initial}</span>
                <span className="hp-menu-hamburger">
                  <span />
                  <span />
                  <span />
                </span>
              </button>

              <div className={`hp-dropdown ${menuOpen ? "open" : ""}`}>
                <div className="hp-dropdown-user">
                  <div className="name">{user.name}</div>
                  <div className="email">{user.email}</div>
                </div>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
                                <Link to="/analytics" onClick={() => setMenuOpen(false)}>My Analysis</Link>
                <Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link>

                <Link to="/performance" onClick={() => setMenuOpen(false)}>My Performances</Link>
                <button className="logout" onClick={handleLogout}>Log Out</button>
              </div>
            </>
          ) : (
            <Link to="/login">
              <button className="hp-nav-cta" type="button">Log in / Sign up</button>
            </Link>
          )}
        </div>
      </nav>

      <div className="pp-container">
        <div className="pp-hero">
          <div className="pp-eyebrow">
            <span className="pp-eyebrow-dot" />
            Your history
          </div>
          <h1>Performance</h1>
          <p>
            Review every assessment you've completed, track how your scores
            have moved over time, and jump back into the details of any past
            run.
          </p>
        </div>

        <div className="pp-stats-grid">
          <div className="pp-stat-card" style={{ "--accent": "#3B82F6" }}>
            <div className="pp-stat-icon"><FaChartBar/></div>
            <div className="pp-stat-value">{stats.total}</div>
            <div className="pp-stat-label">Total Assessments Taken</div>
          </div>
          <div className="pp-stat-card" style={{ "--accent": "#34D399" }}>
            <div className="pp-stat-icon"><FaTrophy /></div>
            <div className="pp-stat-value">{stats.highest != null ? `${stats.highest}` : "—"}</div>
            <div className="pp-stat-label">Highest Overall Score</div>
          </div>
          <div className="pp-stat-card" style={{ "--accent": "#A78BFA" }}>
            <div className="pp-stat-icon"><FaChartLine /></div>
            <div className="pp-stat-value">{stats.average != null ? `${stats.average}` : "—"}</div>
            <div className="pp-stat-label">Average Overall Score</div>
          </div>
          <div className="pp-stat-card" style={{ "--accent": profileMeta(stats.latestProfile).hex }}>
            <div className="pp-stat-icon">{stats.latestProfile ? profileMeta(stats.latestProfile).icon : <FaPuzzlePiece/>}</div>
            <div className="pp-stat-value" style={{ fontSize: "19px" }}>{stats.latestProfile || "—"}</div>
            <div className="pp-stat-label">Latest Gameplay Profile</div>
          </div>
        </div>

        {assessments.length === 0 ? (
          <div className="pp-empty">
            <div className="pp-empty-illustration">
              <EmptyIllustration />
            </div>
            <h3>No assessments yet</h3>
            <p>
              Complete your first assessment to start building your
              performance history — your scores and gameplay profile will
              show up here.
            </p>
            <button className="hp-btn-primary" onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : "Start Assessment"}
            </button>
          </div>
        ) : (
          <>
            <div className="pp-filters">
              <div className="pp-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by assessment ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <input
                type="date"
                className="pp-filter-date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />

              <select
                  className="pp-filter-select"
                  value={profileFilter}
                  onChange={(e)=>setProfileFilter(e.target.value)}
              >

                  <option value="all">All profiles</option>

                  {profileOptions.map(profile => (

                      <option
                          key={profile}
                          value={profile}
                      >
                          {profile}
                      </option>

                    ))}

                </select>

              <select
                className="pp-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
              </select>

              {hasActiveFilters && (
                <button className="pp-clear-filters" onClick={clearFilters}>Clear filters</button>
              )}
            </div>

            <div className="pp-table-card">
              {filtered.length === 0 ? (
                <div className="pp-no-results">No assessments match your filters.</div>
              ) : (
                <div className="pp-table-scroll">
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Assessment ID</th>
                        <th>Overall Score</th>
                        <th>Gameplay Profile</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        const meta = profileMeta(a.profile);
                        return (
                          <tr key={a.id} onClick={() => viewDetails(a.id)}>
                            <td data-label="Date" className="pp-td-date">{formatDate(a.date)}</td>
                            <td data-label="Assessment ID" className="pp-td-id">{a.id}</td>
                            <td data-label="Score">
                              {a.overallScore != null ? (
                                <span className="pp-score" style={{ color: scoreColor(a.overallScore) }}>
                                  {a.overallScore}<span className="max">/100</span>
                                </span>
                              ) : (
                                <span className="pp-score-dash">—</span>
                              )}
                            </td>
                            <td data-label="Profile">
                              <span className="pp-profile-pill" style={{ "--accent": meta.hex }}>
                                {meta.icon} {a.profile}
                              </span>
                            </td>
                            <td data-label="Status">
                              <span className={`pp-status ${a.status === "Completed" ? "completed" : "progress"}`}>
                                <span className="pp-status-dot" />
                                {a.status}
                              </span>
                            </td>
                             <td className="pp-td-action" onClick={(e) => e.stopPropagation()}>
                              <button className="pp-view-btn" onClick={() => viewDetails(a.id)}>
                                View Details
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
