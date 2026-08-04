import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getUser, clearSession, startAssessment } from "../utils/session";
import { TiTick } from "react-icons/ti";
import { FaBrain,FaPuzzlePiece,FaBolt,FaBalanceScale,FaRegEye,FaChartBar ,FaTrophy,FaChartLine, FaRobot ,FaRegCalendarAlt
 } from "react-icons/fa";
import { GoGoal } from "react-icons/go";
import { MdOutlineLoop } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";

// Drop into client/src/pages/AssessmentReportPage.jsx
// Route it in App.jsx: <Route path="/performances/:id" element={<AssessmentReportPage />} />
//
// This is the "Analytics Dashboard" report for a single completed
// assessment — reached via "View Details" from PerformancePage.jsx.
// Shares the exact visual language of HomePage.jsx / PerformancePage.jsx
// (same nav, palette, typography, card style) so all three read as one
// product. REPORT_SEED below is sample data — replace it with a real
// fetch keyed on the :id route param (e.g. getAssessmentReport(id)).
// Charts are hand-built SVG (no chart library dependency), matching the
// codebase's existing pattern of custom canvas/SVG visuals.

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

@keyframes ar-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes ar-grow-y {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes ar-grow-scale {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes ar-draw-line {
  from { stroke-dashoffset: var(--dash, 700); }
  to { stroke-dashoffset: 0; }
}

@keyframes ar-draw-ring {
  from { stroke-dashoffset: var(--ring-start, 300); }
  to { stroke-dashoffset: var(--ring-end, 0); }
}

.ar-page {
  width: 100%;
  min-height: 100vh;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #E5E7EB;
  position: relative;
  overflow-x: hidden;
}

.ar-bg-depth { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.ar-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(139, 147, 167, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 147, 167, 0.045) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 45% at 50% 0%, black 25%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 80% 45% at 50% 0%, black 25%, transparent 70%);
}
.ar-blob { position: absolute; border-radius: 50%; filter: blur(110px); opacity: 0.1; }
.ar-blob.b1 { width: 460px; height: 460px; top: -150px; left: -100px; background: radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%); }
.ar-blob.b2 { width: 420px; height: 420px; top: 30%; right: -140px; background: radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%); }

/* ---- Nav (identical to HomePage / PerformancePage) ---- */
.hp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  gap: 24px; padding: 16px 40px;
  background: rgba(11, 15, 25, 0.78);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #1a2033;
}
.hp-nav::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.35), transparent);
}
.hp-logo { display: flex; align-items: center; gap: 9px; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; cursor: default; flex-shrink: 0; }
.hp-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #34D399; flex-shrink: 0; box-shadow: 0 0 6px 1px rgba(52, 211, 153, 0.45); }
.hp-nav-links { display: flex; align-items: center; gap: 6px; margin: 0 auto; padding: 4px; background: rgba(255, 255, 255, 0.02); border: 1px solid #1a2033; border-radius: 999px; }
.hp-nav-links a { color: #8B93A7; text-decoration: none; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 999px; transition: color 0.15s ease, background 0.15s ease; }
.hp-nav-links a:hover { color: #E5E7EB; background: rgba(255, 255, 255, 0.05); }
.hp-nav-links a.active { color: #34D399; background: rgba(52, 211, 153, 0.08); }
.hp-nav-cta { display: inline-flex; align-items: center; background: #141A2E; border: 1px solid #232A3D; color: #E5E7EB; font-family: inherit; font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 999px; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease; flex-shrink: 0; }
.hp-nav-cta:hover { border-color: #34D399; color: #34D399; }
@media (max-width: 760px) { .hp-nav-links { display: none; } }
.hp-wordmark { color: #E5E7EB; transition: color 0.2s ease; }
.hp-wordmark span { color: #34D399; }
.hp-logo:hover .hp-wordmark { color: #F5F6F8; }
.hp-nav-right { position: relative; }
.hp-menu-btn { display: flex; align-items: center; gap: 10px; background: #141A2E; border: 1px solid #232A3D; border-radius: 999px; padding: 6px 14px 6px 6px; cursor: pointer; color: #E5E7EB; font-size: 13px; font-weight: 500; font-family: inherit; transition: border-color 0.15s ease; }
.hp-menu-btn:hover { border-color: #34D399; }
.hp-menu-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #34D399, #3B82F6); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #05221A; flex-shrink: 0; }
.hp-menu-hamburger { display: flex; flex-direction: column; gap: 3px; width: 14px; }
.hp-menu-hamburger span { height: 2px; background: #8B93A7; border-radius: 2px; transition: transform 0.2s ease, opacity 0.2s ease; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(2) { opacity: 0; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
.hp-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: #141A2E; border: 1px solid #232A3D; border-radius: 12px; padding: 8px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); overflow: hidden; max-height: 0; opacity: 0; pointer-events: none; transition: max-height 0.25s ease, opacity 0.2s ease; }
.hp-dropdown.open { max-height: 400px; opacity: 1; pointer-events: auto; }
.hp-dropdown-user { padding: 10px 12px; border-bottom: 1px solid #232A3D; margin-bottom: 6px; }
.hp-dropdown-user .name { color: #E5E7EB; font-size: 13px; font-weight: 600; }
.hp-dropdown-user .email { color: #8B93A7; font-size: 11px; margin-top: 2px; }
.hp-dropdown a, .hp-dropdown button { display: block; width: 100%; text-align: left; background: none; border: none; color: #C7CCDB; font-size: 13.5px; font-family: inherit; padding: 10px 12px; border-radius: 8px; cursor: pointer; text-decoration: none; transition: background 0.12s ease, color 0.12s ease; }
.hp-dropdown a:hover, .hp-dropdown button:hover { background: rgba(255, 255, 255, 0.05); color: #E5E7EB; }
.hp-dropdown button.logout { color: #F87171; }
.hp-dropdown button.logout:hover { background: rgba(248, 113, 113, 0.1); }

/* ---- Buttons (identical to HomePage) ---- */
.hp-btn-primary { background: linear-gradient(90deg, #34D399, #3B82F6); color: #05221A; border: none; border-radius: 10px; padding: 13px 26px; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.15s ease; }
.hp-btn-primary:hover { box-shadow: 0 6px 24px rgba(52, 211, 153, 0.3); }
.hp-btn-primary:active { transform: scale(0.97); }
.hp-btn-secondary { background: transparent; color: #E5E7EB; border: 1px solid #232A3D; border-radius: 10px; padding: 13px 26px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: border-color 0.15s ease; }
.hp-btn-secondary:hover { border-color: #34D399; }

/* ---- Container / header ---- */
.ar-container { position: relative; z-index: 2; max-width: 1180px; margin: 0 auto; padding: 124px 24px 90px; }

.ar-back {
  display: inline-flex; align-items: center; gap: 6px;
  color: #8B93A7; text-decoration: none; font-size: 13px; font-weight: 500;
  margin-bottom: 22px; transition: color 0.15s ease;
}
.ar-back:hover { color: #34D399; }

.ar-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  flex-wrap: wrap; gap: 20px; margin-bottom: 40px;
  animation: ar-fade-up 0.5s ease both;
}

.ar-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.28);
  color: #34D399; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; padding: 6px 14px 6px 10px; border-radius: 20px; margin-bottom: 16px;
}
.ar-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; }

.ar-header h1 { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: #F3F5F8; margin: 0 0 12px; }

.ar-header-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; color: #8B93A7; font-size: 13px; }
.ar-header-meta .chip { display: inline-flex; align-items: center; gap: 7px; background: #141A2E; border: 1px solid #232A3D; border-radius: 999px; padding: 6px 14px; }
.ar-header-meta .chip b { color: #C7CCDB; font-weight: 600; font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 12px; }

/* ---- Stat cards ---- */
.ar-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; animation: ar-fade-up 0.5s ease 0.05s both; }
@media (max-width: 980px) { .ar-stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .ar-stats-grid { grid-template-columns: 1fr; } }

.ar-stat-card {
  background: #141A2E; border: 1px solid #232A3D; border-radius: 16px; padding: 22px;
  display: flex; align-items: center; gap: 16px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.ar-stat-card:hover {
  transform: translateY(-3px); border-color: var(--accent, #34D399);
  box-shadow: 0 12px 28px -14px color-mix(in srgb, var(--accent, #34D399) 55%, transparent);
}

.ar-stat-body { flex: 1; min-width: 0; }
.ar-stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #F3F5F8; line-height: 1.15; }
.ar-stat-label { font-size: 12px; color: #8B93A7; font-weight: 500; margin-top: 3px; }

.ar-ring-wrap { position: relative; width: 54px; height: 54px; flex-shrink: 0; }
.ar-ring-wrap svg { transform: rotate(-90deg); }
.ar-ring-track { fill: none; stroke: #232A3D; stroke-width: 5; }
.ar-ring-fill { fill: none; stroke: var(--accent, #34D399); stroke-width: 5; stroke-linecap: round; animation: ar-draw-ring 1.1s ease 0.2s both; }

.ar-stat-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 19px;
  background: color-mix(in srgb, var(--accent, #34D399) 15%, transparent); color: var(--accent, #34D399);
}

.ar-status-pill {
  display: inline-flex; align-items: center; gap: 6px; border-radius: 999px;
  padding: 5px 13px; font-size: 13px; font-weight: 600;
  background: rgba(52, 211, 153, 0.12); color: #34D399;
}
.ar-status-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* ---- Section heads ---- */
.ar-section-head { margin: 44px 0 18px; }
.ar-section-head h2 { font-size: 20px; font-weight: 700; color: #E5E7EB; margin: 0 0 4px; letter-spacing: -0.3px; }
.ar-section-head p { font-size: 13.5px; color: #8B93A7; margin: 0; }

/* ---- Charts ---- */
.ar-charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
@media (max-width: 900px) { .ar-charts-grid { grid-template-columns: 1fr; } }

.ar-chart-card {
  background: #141A2E; border: 1px solid #232A3D; border-radius: 16px; padding: 24px;
  animation: ar-fade-up 0.5s ease 0.1s both;
}

.ar-chart-head { margin-bottom: 18px; }
.ar-chart-head h4 { font-size: 15px; font-weight: 700; color: #E5E7EB; margin: 0 0 3px; }
.ar-chart-head p { font-size: 12.5px; color: #8B93A7; margin: 0; }

.ar-chart-card svg { width: 100%; height: auto; display: block; overflow: visible; }

/* bar chart */
.ar-bar-group { transform-origin: bottom; transform-box: fill-box; animation: ar-grow-y 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
.ar-bar-label { fill: #6B7386; font-size: 10.5px; font-family: 'Inter', sans-serif; }
.ar-bar-value { fill: #C7CCDB; font-size: 11px; font-weight: 700; font-family: 'Inter', sans-serif; }
.ar-grid-line { stroke: #1f2740; stroke-width: 1; }

/* radar chart */
.ar-radar-shape { animation: ar-grow-scale 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: center; transform-box: fill-box; }
.ar-radar-grid { fill: none; stroke: #232A3D; stroke-width: 1; }
.ar-radar-axis { stroke: #1f2740; stroke-width: 1; }
.ar-radar-label { fill: #8B93A7; font-size: 10.5px; font-family: 'Inter', sans-serif; }
.ar-radar-dot { fill: #34D399; }

/* line chart */
.ar-line-path { fill: none; stroke: #3B82F6; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; animation: ar-draw-line 1.1s ease both; }
.ar-line-dot { fill: #0B0F19; stroke: #3B82F6; stroke-width: 2; }
.ar-line-label { fill: #6B7386; font-size: 10.5px; font-family: 'Inter', sans-serif; }
.ar-line-value { fill: #8B93A7; font-size: 10px; font-family: 'Inter', sans-serif; }

/* donut chart */
.ar-donut-wrap { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; justify-content: center; }
.ar-donut-svg { width: 160px !important; height: 160px !important; flex-shrink: 0; }
.ar-donut-ring { animation: ar-draw-ring 1.1s ease 0.15s both; }
.ar-donut-center-value { fill: #F3F5F8; font-size: 24px; font-weight: 800; font-family: 'Inter', sans-serif; text-anchor: middle; }
.ar-donut-center-label { fill: #6B7386; font-size: 10px; font-family: 'Inter', sans-serif; text-anchor: middle; text-transform: uppercase; letter-spacing: 0.05em; }
.ar-donut-legend { display: flex; flex-direction: column; gap: 12px; }
.ar-donut-legend-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #C7CCDB; }
.ar-donut-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.ar-donut-legend-val { color: #F3F5F8; font-weight: 700; margin-left: auto; padding-left: 16px; }

/* ---- AI summary ---- */
.ar-summary-card {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.05), rgba(59, 130, 246, 0.05));
  border: 1px solid #232A3D; border-radius: 18px; padding: 32px;
  animation: ar-fade-up 0.5s ease 0.12s both;
}
.ar-summary-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ar-summary-badge {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #34D399, #3B82F6);
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.ar-summary-card h3 { font-size: 18px; font-weight: 700; color: #E5E7EB; margin: 0; letter-spacing: -0.3px; }
.ar-summary-card p { font-size: 14.5px; color: #B9BFCE; line-height: 1.75; margin: 0; }

/* ---- Tag chips (strengths / improvements) ---- */
.ar-tag-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 900px) { .ar-tag-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .ar-tag-grid { grid-template-columns: 1fr; } }

.ar-tag-chip {
  display: flex; align-items: center; gap: 12px;
  background: #141A2E; border: 1px solid #232A3D; border-radius: 14px; padding: 16px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.ar-tag-chip:hover { transform: translateY(-2px); border-color: var(--accent); }
.ar-tag-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
  background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent);
}
.ar-tag-chip span.label { font-size: 13.5px; font-weight: 600; color: #E5E7EB; }

/* ---- Recommendations ---- */
.ar-rec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 760px) { .ar-rec-grid { grid-template-columns: 1fr; } }

.ar-rec-card {
  background: #141A2E; border: 1px solid #232A3D; border-radius: 16px; padding: 22px;
  display: flex; gap: 16px;
  transition: transform 0.18s ease, border-color 0.18s ease;
}
.ar-rec-card:hover { transform: translateY(-2px); border-color: #2c3450; }
.ar-rec-icon {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: rgba(52, 211, 153, 0.1); color: #34D399;
}
.ar-rec-card h5 { font-size: 14.5px; font-weight: 700; color: #E5E7EB; margin: 0 0 6px; }
.ar-rec-card p { font-size: 13px; color: #8B93A7; line-height: 1.6; margin: 0; }

/* ---- Footer actions ---- */
.ar-footer-actions {
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
  gap: 14px; margin-top: 56px; padding-top: 36px; border-top: 1px solid #1a2033;
}

.ar-btn-icon {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: 1px solid #232A3D; color: #E5E7EB;
  font-family: inherit; font-size: 14px; font-weight: 600;
  padding: 13px 24px; border-radius: 10px; cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.ar-btn-icon:hover { border-color: #34D399; color: #34D399; background: rgba(52, 211, 153, 0.06); }

.ar-btn-primary-icon {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(90deg, #34D399, #3B82F6); color: #05221A; border: none;
  border-radius: 10px; padding: 13px 26px; font-size: 14px; font-weight: 700;
  font-family: inherit; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.15s ease;
}
.ar-btn-primary-icon:hover { box-shadow: 0 6px 24px rgba(52, 211, 153, 0.3); }
.ar-btn-primary-icon:active { transform: scale(0.97); }

@media (max-width: 720px) {
  .ar-container { padding: 108px 16px 60px; }
  .ar-header h1 { font-size: 28px; }
  .ar-footer-actions { flex-direction: column; }
  .ar-btn-icon, .ar-btn-primary-icon { width: 100%; justify-content: center; }
}
`;

// ---- Sample report data — replace with a real fetch keyed on :id ----
const REPORT_SEED = {
  id: "AS-10538",
  date: "July 29, 2026",
  overallScore: 84,
  gameplayProfile: "Attention",
  confidence: 91,
  status: "Completed",
  // gameScores: [
  //   { label: "Memory Matrix", value: 88 },
  //   { label: "Focus Grid", value: 74 },
  //   { label: "Reaction Rush", value: 81 },
  //   { label: "Decision Dash", value: 65 },
  //   { label: "Pattern Planner", value: 79 },
  //   { label: "Switch Track", value: 70 },
  // ],
  radar: [
    { label: "Memory", value: 88 },
    { label: "Attention", value: 82 },
    { label: "Reaction Speed", value: 65 },
    { label: "Decision Making", value: 70 },
    { label: "Working Memory", value: 60 },
    { label: "Cognitive Flexibility", value: 72 },
  ],
  reactionTimes: [520, 495, 470, 458, 432, 410],
  accuracy: { correct: 82, incorrect: 18 },
  summary:
    "Across this session, performance was strongest in memory recall and sustained attention, with the Memory Matrix and Focus Grid rounds both landing well above baseline. Reaction time improved steadily across the session, suggesting good adaptation and warm-up effect. Decision-making tasks showed more variance, with speed occasionally trading off against accuracy under time pressure. Working memory and cognitive flexibility scored in a solid-but-improvable range, pointing to task switching as the main lever for the next session. Overall, the profile reflects a careful, accuracy-oriented player with room to build speed and adaptability.",
  strengths: [
    { label: "Excellent Memory", icon: <FaBrain />, hex: "#34D399" },
    { label: "High Attention", icon:<GoGoal />, hex: "#3B82F6" },
    { label: "Strong Accuracy", icon: <TiTick />, hex: "#34D399" },
    { label: "Consistent Performance", icon: <FaChartLine />, hex: "#A78BFA" },
  ],
  improvements: [
    { label: "Reaction Speed", icon: <FaBolt />, hex: "#F59E0B" },
    { label: "Task Switching", icon: <MdOutlineLoop />, hex: "#F59E0B" },
    { label: "Working Memory", icon: <FaPuzzlePiece />, hex: "#F87171" },
    { label: "Decision Speed", icon: <FaBalanceScale />, hex: "#F87171" },
  ],
  recommendations: [
    { icon: <FaBolt />, title: "Speed-focused drills", desc: "Add short, timed reaction exercises 2–3 times a week to build faster response thresholds without sacrificing accuracy." },
    { icon:  <FaPuzzlePiece />, title: "Dual-task practice", desc: "Try holding one piece of information in mind while completing a second task to strengthen working memory capacity." },
    { icon:<MdOutlineLoop />, title: "Task-switching sets", desc: "Rotate between different rule sets in short bursts to build flexibility and reduce switch-cost over time." },
    { icon: <FaBalanceScale />  , title: "Timed decision drills", desc: "Practice making choices under a soft time limit to build faster judgment while keeping error rates low." },
  ],
};

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ref, onClose]);
}

/* ---------------- Charts (plain SVG, no external library) ---------------- */

function BarChart({ data }) {
  console.log(data);
  const w = 700, h = 220;
  const padTop = 28, padBottom = 34, padSide = 6;
  const plotH = h - padTop - padBottom;
  const gap = 10;
  const barW = 42;
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {gridLines.map((g) => {
        const y = padTop + plotH - (g / 100) * plotH;
        return <line key={g} className="ar-grid-line" x1={padSide} x2={w - padSide} y1={y} y2={y} />;
      })}
      {data.map((d, i) => {
        const x = padSide + i * (barW + gap);
        const barH = (d.value / 100) * plotH;
        const y = padTop + plotH - barH;
        return (
          <g key={d.label}>
            <g className="ar-bar-group" style={{ animationDelay: `${i * 0.06}s` }}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill="url(#arBarGrad)" />
            </g>
            <text className="ar-bar-value" x={x + barW / 2} y={y - 8} textAnchor="middle">{d.value}</text>
            <text
              className="ar-bar-label"
              transform={`translate(${x + barW / 2}, ${h - 8}) rotate(-25)`}
              textAnchor="end"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="arBarGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RadarChart({ data }) {
  const size = 300, cx = size / 2, cy = size / 2, maxR = 96;
  const n = data.length;
  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i, r) => [cx + r * Math.cos(angleFor(i)), cy + r * Math.sin(angleFor(i))];

  const levels = [0.25, 0.5, 0.75, 1];
  const gridPolygons = levels.map((lvl) =>
    Array.from({ length: n }, (_, i) => pointAt(i, maxR * lvl).join(",")).join(" ")
  );
  const dataPoints = data.map((d, i) => pointAt(i, (d.value / 100) * maxR));
  const dataPolygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
      {gridPolygons.map((pts, i) => (
        <polygon key={i} className="ar-radar-grid" points={pts} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pointAt(i, maxR);
        return <line key={i} className="ar-radar-axis" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon
        className="ar-radar-shape"
        points={dataPolygon}
        fill="rgba(52, 211, 153, 0.18)"
        stroke="#34D399"
        strokeWidth="2"
      />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} className="ar-radar-dot" cx={x} cy={y} r="3" />
      ))}
      {data.map((d, i) => {
        const [x, y] = pointAt(i, maxR + 20);
        return (
          <text
            key={d.label}
            className="ar-radar-label"
            x={x}
            y={y}
            textAnchor={Math.abs(x - cx) < 4 ? "middle" : x > cx ? "start" : "end"}
            dominantBaseline="middle"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function ReactionLineChart({ data = [] }) {
  // Prevent crashes if data hasn't loaded yet
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#9ca3af",
        }}
      >
        No reaction time data available
      </div>
    );
  }
  if (data.length === 1) {
    data = [data[0], data[0]];
  }

  const w = 560,
    h = 200,
    padSide = 30,
    padTop = 24,
    padBottom = 30;

  const plotW = w - padSide * 2;
  const plotH = h - padTop - padBottom;

 const values = data.map(d => d.value);

const max = Math.max(...values);
const min = Math.min(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
  const v = d.value;
    const x =
      data.length === 1
        ? w / 2
        : padSide + (i / (data.length - 1)) * plotW;

    const y =
      padTop +
      plotH -
      ((v - min) / range) * plotH;

    return [x, y];
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");

  const areaPath =
    `${linePath} ` +
    `L ${points[points.length - 1][0]} ${padTop + plotH} ` +
    `L ${points[0][0]} ${padTop + plotH} Z`;

  const dashLen = Math.ceil(plotW * 1.6);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient
          id="arLineArea"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#3B82F6"
            stopOpacity="0.22"
          />
          <stop
            offset="100%"
            stopColor="#3B82F6"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3].map((i) => {
        const y = padTop + (plotH / 3) * i;

        return (
          <line
            key={i}
            className="ar-grid-line"
            x1={padSide}
            x2={w - padSide}
            y1={y}
            y2={y}
          />
        );
      })}

      <path
        d={areaPath}
        fill="url(#arLineArea)"
        stroke="none"
      />

      <path
        className="ar-line-path"
        d={linePath}
        style={{
          "--dash": dashLen,
          strokeDasharray: dashLen,
        }}
      />

      {points.map(([x, y], i) => (
  <g key={i}>
    <circle className="ar-line-dot" cx={x} cy={y} r="3.5" />

    <text
      className="ar-line-value"
      x={x}
      y={y - 12}
      textAnchor="middle"
    >
      {data[i].value} ms
    </text>

    <text
      className="ar-line-label"
      x={x}
      y={h - 8}
      textAnchor="middle"
    >
      {data[i].game.length > 10
        ? data[i].game.slice(0, 10) + "…"
        : data[i].game}
    </text>
  </g>
))}
    </svg>
  );
}

function DonutChart({ correct, incorrect }) {
  const size = 160, r = 62, stroke = 20;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const correctLen = (correct / 100) * circumference;

  return (
    <div className="ar-donut-wrap">
      <svg className="ar-donut-svg" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#232A3D" strokeWidth={stroke} />
        <circle
          className="ar-donut-ring"
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#34D399"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ "--ring-start": circumference, "--ring-end": circumference - correctLen }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text className="ar-donut-center-value" x={cx} y={cy - 2}>{correct}%</text>
        <text className="ar-donut-center-label" x={cx} y={cy + 16}>Correct</text>
      </svg>
      <div className="ar-donut-legend">
        <div className="ar-donut-legend-item">
          <span className="ar-donut-legend-dot" style={{ background: "#34D399" }} />
          Correct responses
          <span className="ar-donut-legend-val">{correct}%</span>
        </div>
        <div className="ar-donut-legend-item">
          <span className="ar-donut-legend-dot" style={{ background: "#232A3D" }} />
          Incorrect responses
          <span className="ar-donut-legend-val">{incorrect}%</span>
        </div>
      </div>
    </div>
  );
}

function MiniRing({ value, accent }) {
  const size = 54, r = 22, stroke = 5;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (value / 100) * circumference;
  return (
    <div className="ar-ring-wrap" style={{ "--accent": accent }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="ar-ring-track" cx={cx} cy={cy} r={r} />
        <circle
          className="ar-ring-fill"
          cx={cx}
          cy={cy}
          r={r}
          strokeDasharray={circumference}
          style={{ "--ring-start": circumference, "--ring-end": circumference - filled }}
        />
      </svg>
    </div>
  );
}

/* ---------------------------- Page ---------------------------- */

export default function AssessmentReportPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [assessment, setAssessment] = useState(null);
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getUser();

  useEffect(() => {
  async function loadAnalytics() {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      // Use URL ID when opening an old report.
      let selectedAssessmentId = id;

      // If /analytics has no ID, fetch the latest completed assessment.
      if (!selectedAssessmentId) {
        const historyRes = await fetch(
          "http://localhost:5000/api/assessments",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const historyData = await historyRes.json();

        if (!historyRes.ok || !historyData.success) {
          throw new Error(
            historyData.message ||
              "Could not load assessment history"
          );
        }

        const latestCompleted =
          historyData.assessments?.[0];

        if (!latestCompleted) {
          setAssessment(null);
          setSessions([]);
          return;
        }

        selectedAssessmentId =
          latestCompleted.assessmentId;
      }

      const detailsRes = await fetch(
        `http://localhost:5000/api/assessments/${selectedAssessmentId}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const detailsData = await detailsRes.json();

      if (!detailsRes.ok || !detailsData.success) {
        throw new Error(
          detailsData.message ||
            "Could not load assessment details"
        );
      }

      setAssessment(detailsData.assessment);
      setSessions(detailsData.sessions || []);
    } catch (error) {
      console.error("Analytics loading failed:", error);

      setAssessment(null);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

    loadAnalytics();
  }, [id, navigate]);
  const report = assessment
  ? {
      ...REPORT_SEED,

      id: assessment.assessmentId,

      date: new Date(assessment.dateTime).toLocaleDateString(),

      overallScore: assessment.overallScore ?? 0,

      gameplayProfile: assessment.gameplayProfile ?? "Pending",

      confidence: Math.round(
        (assessment.predictionConfidence ?? 0) * 100
      ),

      status: assessment.status,
    }
  : REPORT_SEED;

const correct = sessions.reduce(
  (sum, s) => sum + (s.accuracy ?? 0),
  0
);

const incorrect = sessions.length * 100 - correct;

  useOutsideClose(menuRef, () => setMenuOpen(false));

if (loading) {
  return (
    <div className="ar-page">
      <h2 style={{ padding: "150px 30px" }}>
        Loading analytics...
      </h2>
    </div>
  );
}

if (!assessment) {
  return (
    <div className="ar-page">
      <div style={{ padding: "150px 30px" }}>
        <h2>No completed assessment found</h2>

        <p>
          Complete an assessment to view analytics.
        </p>

        <button
          className="hp-btn-primary"
          onClick={() => navigate("/")}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

console.log(assessment);
console.log(sessions);
  // Replace with: const [report, setReport] = useState(null); useEffect(() => { fetch report by id })
const gameScores = sessions.map(session => ({
  label: session.gameId
    .replaceAll("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase()),

  value: session.accuracy ?? 0
}));

const getAccuracy = (gameId) => {
  const game = sessions.find((s) => s.gameId === gameId);
  return game ? Number(game.accuracy) || 0 : 0;
};

const getGame = (gameId) =>
  sessions.find((s) => s.gameId === gameId);

const memoryMatrix = getGame("memory_matrix");
const pattern = getGame("pattern_sequence");
const multi = getGame("multi_switch");
const cpt = getGame("cpt");
const dual = getGame("dual_task");
const keepTrack = getGame("keep_track_task");
const operation = getGame("operation_span");
const findBox = getGame("find_the_box");
const colorReaction = getGame("color_number_reaction");
const rule = getGame("rule_discovery");

const radarData = [
  {
    label: "Memory",
    value:
      memoryMatrix?.metrics?.correctCellsTotal
        ? (memoryMatrix.metrics.correctCellsTotal /
            25) *
          100
        : 0,
  },

  {
    label: "Working\nMemory",
    value:
      operation?.metrics?.storageAccuracy ??
      0,
  },

  {
    label: "Attention",
    value:
      cpt?.metrics?.score ??
      cpt?.accuracy ??
      0,
  },

  {
    label: "Planning",
    value:
      rule?.metrics?.ruleDiscoveryAccuracy ??
      0,
  },

  {
    label: "Flexibility",
    value:
      multi?.accuracy ??
      0,
  },

  {
    label: "Observation",
    value:
      findBox?.accuracy ??
      0,
  },

  {
    label: "Pattern",
    value:
      pattern?.metrics?.correct
        ? (pattern.metrics.correct / 10) * 100
        : 0,
  },

  {
    label: "Processing",
    value:
      colorReaction?.accuracy ??
      0,
  },
];

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

  function handleDownload() {
    // Wire up to a real PDF export endpoint, e.g. window.open(`/api/reports/${report.id}/pdf`)
    alert("Downloading PDF report…");
  }

  async function handleShare() {
    const url = `${window.location.origin}/performances/${report.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MindMetrics Assessment Report", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Report link copied to clipboard.");
      }
    } catch {
      // user cancelled share — no action needed
    }
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";
  console.log("Sessions:", sessions);

const reactionTimes = sessions.map((session) => ({
  game: session.gameId
    .replaceAll("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase()),

  value:
    session.avgTimeMs ||
    session.metrics?.avgReactionTimeMs ||
    session.metrics?.avgReactionMs ||
    session.metrics?.avgMathReactionMs ||
    session.metrics?.averageDiscoveryTimeMs ||
    session.metrics?.avgTimePerQuestionMs ||
    0,
}));

const correctResponses = sessions.reduce((sum, session) => {
  return (
    sum +
    (session.metrics?.correctResponses ??
      session.metrics?.correct ??
      session.metrics?.hits ??
      session.metrics?.mathCorrect ??
      session.metrics?.correctCellsTotal ??
      session.metrics?.correctLettersRecalled ??
      0)
  );
}, 0);

const totalResponses = sessions.reduce((sum, session) => {
  return (
    sum +
    (session.metrics?.totalTrials ??
      session.metrics?.questionsTotal ??
      session.metrics?.attempts ??
      session.metrics?.totalQuestions ??
      session.metrics?.mathAnswered ??
      session.metrics?.totalTrueTargets ??
      session.metrics?.correctCellsTotal +
        session.metrics?.wrongCellsTotal ??
      session.metrics?.totalLettersPresented ??
      0)
  );
}, 0);

const incorrectResponses = Math.max(
  totalResponses - correctResponses,
  0
);
  return (
    <div className="ar-page">
      <style>{styles}</style>

      <div className="ar-bg-depth" aria-hidden="true">
        <div className="ar-bg-grid" />
        <div className="ar-blob b1" />
        <div className="ar-blob b2" />
      </div>

      <nav className="hp-nav">
        <div className="hp-logo">
          <span className="hp-logo-dot" />
          <span className="hp-wordmark">Mind<span>Metrics</span></span>
        </div>

        <div className="hp-nav-links">
          <Link to="/">Home</Link>
          <Link to="/performance">My Performance</Link>
          <Link to="/analytics" className="active">My Analysis</Link>
          <Link to="/about">About</Link>
        </div>

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
                <span className="hp-menu-hamburger"><span /><span /><span /></span>
              </button>
              <div className={`hp-dropdown ${menuOpen ? "open" : ""}`}>
                <div className="hp-dropdown-user">
                  <div className="name">{user.name}</div>
                  <div className="email">{user.email}</div>
                </div>
                <Link to="/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
                <Link to="/analytics" onClick={() => setMenuOpen(false)}>My Analysis</Link>
                <Link to="/performance" onClick={() => setMenuOpen(false)}>My Performance</Link>
                <Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link>
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

      <div className="ar-container">
        <Link to="/" className="ar-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Home
        </Link>

        <div className="ar-header">
          <div>
            {/* <div className="ar-eyebrow"><span className="ar-eyebrow-dot" />AI-Generated Report</div> */}
            <h1>Analytics Dashboard</h1>
            <div className="ar-header-meta">
              <span className="chip"><FaRegCalendarAlt /> Assessment Date · <b>{report.date}</b></span>
            </div>
          </div>
        </div>

        <div className="ar-stats-grid">
          <div className="ar-stat-card" style={{ "--accent": "#34D399" }}>
            <MiniRing value={report.overallScore} accent="#34D399" />
            <div className="ar-stat-body">
              <div className="ar-stat-value">{report.overallScore}<span style={{ fontSize: 14, color: "#6B7386", fontWeight: 600 }}>/100</span></div>
              <div className="ar-stat-label">Overall Cognitive Score</div>
            </div>
          </div>

          <div className="ar-stat-card" style={{ "--accent": "#3B82F6" }}>
            <div className="ar-stat-icon"> <GoGoal /></div>
            <div className="ar-stat-body">
              <div className="ar-stat-value" style={{ fontSize: 19 }}>{report.gameplayProfile}</div>
              <div className="ar-stat-label">Gameplay Profile</div>
            </div>
          </div>

          <div className="ar-stat-card" style={{ "--accent": "#A78BFA" }}>
            <MiniRing value={report.confidence} accent="#A78BFA" />
            <div className="ar-stat-body">
              <div className="ar-stat-value">{report.confidence}%</div>
              <div className="ar-stat-label">Prediction Confidence</div>
            </div>
          </div>

          <div className="ar-stat-card" style={{ "--accent": "#34D399" }}>
            <div className="ar-stat-icon"><TiTick /></div>
            <div className="ar-stat-body">
              <span className="ar-status-pill"><span className="dot" />{report.status}</span>
              <div className="ar-stat-label" style={{ marginTop: 8 }}>Assessment Status</div>
            </div>
          </div>
        </div>

        <div className="ar-section-head">
          <h2>Performance Charts</h2>
          <p>A visual breakdown of scores, skills, and response patterns from this session.</p>
        </div>

        <div className="ar-charts-grid">
          <div className="ar-chart-card">
            <div className="ar-chart-head">
              <h4>Game-wise Score Comparison</h4>
              <p>Score achieved in each mini-game during the assessment.</p>
            </div>
            <BarChart data={gameScores} />
          </div>

          <div className="ar-chart-card">
            <div className="ar-chart-head">
              <h4>Cognitive Skills Overview</h4>
              <p>How each core cognitive skill measured against the full assessment.</p>
            </div>
            <RadarChart data={radarData} />
          </div>

          <div className="ar-chart-card">
            <div className="ar-chart-head">
              <h4>Average Reaction Time</h4>
              <p>Response speed across each game, in milliseconds.</p>
            </div>
            <ReactionLineChart data={reactionTimes} />
          </div>

          <div className="ar-chart-card">
            <div className="ar-chart-head">
              <h4>Correct vs Incorrect Performance</h4>
              <p>Overall response accuracy across the full session.</p>
            </div>
            <DonutChart correct={correctResponses} incorrect={incorrectResponses}/>
          </div>
        </div>

        <div className="ar-section-head">
          <h2>Assessment Summary</h2>
          <p>A plain-language read on how this session went, generated from your results.</p>
        </div>

        <div className="ar-summary-card">
          <div className="ar-summary-head">
            <div className="ar-summary-badge"><TbReportAnalytics /></div>
            <h3>Session Report</h3>
          </div>
          <p>
  Your assessment has been successfully completed. Based on the gameplay
  metrics collected across all 10 cognitive games, the Machine Learning
  model classified your gameplay profile as
  <strong> {report.gameplayProfile}</strong>.
  You achieved an overall cognitive score of
  <strong> {report.overallScore}/100</strong> with a prediction confidence
  of <strong>{report.confidence}%</strong>.
</p>
        </div>

        <div className="ar-section-head">
          <h2>Strengths</h2>
          <p>Areas where performance stood out this session.</p>
        </div>
        <div className="ar-tag-grid">
          {report.strengths.map((s) => (
            <div className="ar-tag-chip" key={s.label} style={{ "--accent": s.hex }}>
              <div className="ar-tag-icon">{s.icon}</div>
              <span className="label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="ar-section-head">
          <h2>Areas for Improvement</h2>
          <p>Where focused practice would likely move the needle most.</p>
        </div>
        <div className="ar-tag-grid">
          {report.improvements.map((s) => (
            <div className="ar-tag-chip" key={s.label} style={{ "--accent": s.hex }}>
              <div className="ar-tag-icon">{s.icon}</div>
              <span className="label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="ar-section-head">
          <h2>Personalized Recommendations</h2>
          <p>Practical next steps based on this session's results.</p>
        </div>
        <div className="ar-rec-grid">
          {report.recommendations.map((r) => (
            <div className="ar-rec-card" key={r.title}>
              <div className="ar-rec-icon">{r.icon}</div>
              <div>
                <h5>{r.title}</h5>
                <p>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="ar-footer-actions">
          <button className="ar-btn-icon" onClick={handleDownload}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download Report (PDF)
          </button>
          <button className="ar-btn-icon" onClick={handleShare}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth="2" />
            </svg>
            Share Report
          </button>
          {/* <button className="ar-btn-primary-icon" onClick={handleStart} disabled={starting}>
            {starting ? "Starting…" : "Start New Assessment"}
          </button> */}
        </div>
      </div>
    </div>
  );
}
