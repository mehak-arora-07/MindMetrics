import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearSession, startAssessment,clearAssessmentId } from "../utils/session";
import { TiTick } from "react-icons/ti";
import { FaBrain,FaPuzzlePiece,FaBolt,FaBalanceScale,FaRegEye,FaChartBar ,FaTrophy,FaChartLine, FaRobot ,FaRegCalendarAlt
 } from "react-icons/fa";
import { GoGoal } from "react-icons/go";
import { MdOutlineLoop } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb"
import { startAssessmentFlow } from "../utils/assessmentFlow";
import { clearAssessmentCompleted } from "../utils/session";

// Drop into client/src/pages/HomePage.jsx
// Route it at "/" in App.jsx: <Route path="/" element={<HomePage />} />
//
// "My Performances", "My Analysis", "Profile", and "About Us" are routed to
// placeholder paths (/performances, /analytics, /profile, /about) — build
// those pages whenever you're ready, the links are already wired.

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

@keyframes hp-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.hp-reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.hp-reveal.in-view {
  opacity: 1;
  transform: translateY(0);
}

.hp-page {
  width: 100%;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #E5E7EB;
  position: relative;
  overflow: hidden;
}

/* ---- Ambient background depth ---- */
.hp-bg-depth {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.hp-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(139, 147, 167, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 147, 167, 0.05) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%);
}

.hp-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.16;
  will-change: transform;
  animation-name: hp-blob-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.hp-blob.b1 { width: 520px; height: 520px; top: -140px; left: -120px; background: radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%); animation-duration: 30s; }
.hp-blob.b2 { width: 460px; height: 460px; top: 22%; right: -160px; background: radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%); animation-duration: 36s; animation-delay: -6s; }
.hp-blob.b3 { width: 400px; height: 400px; bottom: -160px; left: 12%; background: radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%); animation-duration: 28s; animation-delay: -12s; }

@keyframes hp-blob-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -28px) scale(1.06); }
  66% { transform: translate(-28px, 22px) scale(0.96); }
}

.hp-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation-name: hp-particle-drift, hp-particle-pulse;
  animation-timing-function: ease-in-out, ease-in-out;
  animation-iteration-count: infinite, infinite;
  animation-direction: alternate, alternate;
}

@keyframes hp-particle-drift {
  from { transform: translateY(0) translateX(0); }
  to { transform: translateY(-40px) translateX(8px); }
}

@keyframes hp-particle-pulse {
  from { opacity: 0.08; }
  to { opacity: 0.32; }
}

/* ---- Cursor glow ---- */
.hp-cursor-glow {
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
.hp-cursor-glow.active { opacity: 1; }

/* ---- Nav ---- */
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
  font-size: 22px;
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

.hp-wordmark {
  color: #E5E7EB;
  transition: color 0.2s ease;
}

.hp-wordmark span {
  color: #34D399;
}

.hp-logo:hover .hp-wordmark {
  color: #F5F6F8;
}

.hp-nav-right {
  position: relative;
}

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

.hp-menu-hamburger {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 14px;
}
.hp-menu-hamburger span {
  height: 2px;
  background: #8B93A7;
  border-radius: 2px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
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

.hp-dropdown.open {
  max-height: 400px;
  opacity: 1;
  pointer-events: auto;
}

.hp-dropdown-user {
  padding: 10px 12px;
  border-bottom: 1px solid #232A3D;
  margin-bottom: 6px;
}
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
.hp-dropdown a:hover, .hp-dropdown button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #E5E7EB;
}
.hp-dropdown button.logout { color: #F87171; }
.hp-dropdown button.logout:hover { background: rgba(248, 113, 113, 0.1); }

/* ---- Hero ---- */
.hp-hero {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 60px;
}

.hp-hero-inner {
  position: relative;
  width: 100%;
  max-width: 1040px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 56px;

  transform: translateY(-10px);
}

.hp-hero-content {
  position: relative;
  z-index: 2;
  flex: 1 1 460px;
  text-align: left;
  max-width: 500px;
}

.hp-hero-orbit {
  position: relative;
  z-index: 2;
  flex: 1 1 360px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hp-hero-orbit canvas {
  position: relative;
  width: 100%;
  height: 100%;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 55%, transparent 90%);
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 55%, transparent 90%);
}

.hp-hero-orbit-glow {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.09), rgba(59, 130, 246, 0.05) 45%, transparent 75%);
  filter: blur(30px);
  animation: hp-orbit-glow-pulse 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes hp-orbit-glow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

.hp-eyebrow {
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
  margin-bottom: 26px;
}

.hp-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34D399;
}

.hp-hero h1 {
  font-size: 58px;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -1.4px;
  margin: 0 0 22px;
  color: #F3F5F8;
}

.hp-hero h1 .hp-highlight {
  position: relative;
  color: #34D399;
  white-space: nowrap;
}

.hp-hero h1 .hp-highlight svg {
  position: absolute;
  left: -2%;
  bottom: -0.16em;
  width: 104%;
  height: 0.3em;
  overflow: visible;
}

.hp-hero-content p {
  font-size: 16.5px;
  color: #9CA3B5;
  line-height: 1.7;
  margin: 0 0 28px;
  max-width: 500px;
}

.hp-hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #6B7386;
  font-size: 12.5px;
  margin: 0 0 32px;
}

.hp-hero-meta span { display: flex; align-items: center; gap: 10px; }

.hp-hero-meta .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #3A4258;
}

.hp-hero-ctas {
  display: flex;
  gap: 14px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.hp-btn-primary {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 10px;
  padding: 15px 32px;
  font-size: 15px;
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
  padding: 15px 32px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.hp-btn-secondary:hover { border-color: #34D399; }

.hp-scroll-hint {
  position: relative;
  z-index: 2;
  margin-top: 48px;
  color: #4B5468;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.hp-scroll-hint .arrow {
  width: 8px;
  height: 8px;
  border-right: 1.5px solid #4B5468;
  border-bottom: 1.5px solid #4B5468;
  transform: rotate(45deg);
  animation: hp-bounce 1.6s ease infinite;
}

@keyframes hp-bounce {
  0%, 100% { transform: rotate(45deg) translate(0, 0); }
  50% { transform: rotate(45deg) translate(3px, 3px); }
}

/* ---- Section shell ---- */
.hp-section {
  position: relative;
  z-index: 2;
  padding: 90px 24px;
  max-width: 1080px;
  margin: 0 auto;
}

.hp-section-head {
  text-align: center;
  max-width: 560px;
  margin: 0 auto 48px;
}

.hp-section-head .eyebrow {
  color: #34D399;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.hp-section-head h2 {
  font-size: 32px;
  font-weight: 700;
  color: #E5E7EB;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.hp-section-head p {
  color: #8B93A7;
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

/* ---- Rules ---- */
.hp-rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.hp-rule-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 14px;
  padding: 22px;
  display: flex;
  gap: 14px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.hp-rule-card:hover { border-color: #2c3450; transform: translateY(-2px); }

.hp-rule-num {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hp-rule-card.warn .hp-rule-num {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #F87171;
}

.hp-rule-card h4 {
  color: #E5E7EB;
  font-size: 14.5px;
  font-weight: 600;
  margin: 0 0 4px;
}

.hp-rule-card p {
  color: #8B93A7;
  font-size: 13px;
  line-height: 1.55;
  margin: 0;
}

/* ---- Skills ---- */
.hp-skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
}

.hp-skill-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 14px;
  padding: 20px 18px;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.hp-skill-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent, #34D399);
  box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--accent, #34D399) 60%, transparent);
}

.hp-skill-dot {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--accent, #34D399) 15%, transparent);
  color: var(--accent, #34D399);
}

.hp-skill-card h4 {
  color: #E5E7EB;
  font-size: 14.5px;
  font-weight: 600;
  margin: 0 0 4px;
}

.hp-skill-card p {
  color: #8B93A7;
  font-size: 12.5px;
  line-height: 1.5;
  margin: 0;
}

/* ---- Mid CTA ---- */
.hp-mid-cta {
  position: relative;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid #232A3D;
  border-radius: 20px;
  padding: 48px 40px;
  text-align: center;
  overflow: hidden;
}

.hp-mid-cta h3 {
  font-size: 26px;
  font-weight: 700;
  color: #E5E7EB;
  margin: 0 0 10px;
}

.hp-mid-cta p {
  color: #8B93A7;
  font-size: 14px;
  margin: 0 0 26px;
}

/* ---- Footer ---- */
.hp-footer {
  position: relative;
  z-index: 2;
  border-top: 1px solid #1a2033;
  padding: 60px 24px 30px;
}

.hp-footer-inner {
  max-width: 1080px;
  margin: 0 auto;
}

.hp-footer-top {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 48px;
}

.hp-footer-brand .hp-logo { margin-bottom: 14px; }

.hp-footer-brand p {
  color: #8B93A7;
  font-size: 13px;
  line-height: 1.6;
  max-width: 280px;
  margin: 0;
}

.hp-footer-col h5 {
  color: #E5E7EB;
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 16px;
}

.hp-footer-col a {
  display: block;
  color: #8B93A7;
  font-size: 13.5px;
  text-decoration: none;
  margin-bottom: 12px;
  transition: color 0.15s ease;
}
.hp-footer-col a:hover { color: #34D399; }

.hp-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #1a2033;
  color: #4B5468;
  font-size: 12.5px;
}

.hp-footer-bottom a { color: #4B5468; text-decoration: none; margin-left: 18px; }
.hp-footer-bottom a:hover { color: #8B93A7; }

@media (max-width: 900px) {
  .hp-hero-inner { flex-direction: column; }
  .hp-hero-content { text-align: center; max-width: 100%; }
  .hp-hero-ctas { justify-content: center; }
  .hp-hero-orbit { height: 280px; width: 100%; opacity: 0.85; }
}

@media (max-width: 760px) {
  .hp-hero h1 { font-size: 34px; }
  .hp-footer-top { grid-template-columns: 1fr 1fr; }
}
`;

const SKILLS = [
  { label: "Memory", color: "52, 211, 153", hex: "#34D399", icon: <FaBrain />, desc: "Recall and working memory" },
  { label: "Attention", color: "59, 130, 246", hex: "#3B82F6", icon:<GoGoal />, desc: "Focus and sustained attention" },
  { label: "Observation", color: "167, 139, 250", hex: "#A78BFA", icon:<FaRegEye />, desc: "Visual perception and awareness" },
  { label: "Planning", color: "59, 130, 246", hex: "#3B82F6", icon: <FaPuzzlePiece /> ,desc: "Strategy and problem solving" },
  { label: "Reaction", color: "245, 158, 11", hex: "#F59E0B", icon: <FaBolt />, desc: "Speed and response time" },
  { label: "Decision Making", color: "248, 113, 113", hex: "#F87171", icon: <FaBalanceScale />, desc: "Choices under uncertainty" },
];

const RULES = [
  {
    title: "One continuous assessment",
    desc: "This session includes a series of short cognitive games, run one after another automatically — no need to navigate between them.",
    warn: false,
  },
  {
    title: "About 25–35 minutes total",
    desc: "Each game takes a few minutes. Total time depends on your pace, but plan for roughly half an hour.",
    warn: false,
  },
  {
    title: "Stay on this tab",
    desc: "Don't switch away, refresh, or minimize for long — the games use short timers and streams that keep running in the background.",
    warn: false,
  },
  {
    title: "Don't close the browser or lose connection",
    desc: "If you close the tab, go offline, or log out partway through, that attempt is discarded — nothing gets saved, and you'll start fresh next time.",
    warn: true,
  },
  {
    title: "One attempt at a time",
    desc: "You can only have one assessment in progress. Finish or abandon the current one before starting another.",
    warn: false,
  },
  {
    title: "Instant results",
    desc: "The moment you complete the final game, your full behavioral analysis report is generated right away.",
    warn: false,
  },
];

// Fixed (non-random-on-render) particle field, colored from the same
// palette as the skill orbit so the ambient depth reads as one system.
const PARTICLES = [
  { top: "12%", left: "8%", size: 5, color: "52,211,153", duration: 7, delay: 0 },
  { top: "22%", left: "22%", size: 3, color: "59,130,246", duration: 9, delay: 1.2 },
  { top: "8%", left: "40%", size: 4, color: "167,139,250", duration: 6, delay: 0.6 },
  { top: "34%", left: "68%", size: 6, color: "245,158,11", duration: 8, delay: 2 },
  { top: "18%", left: "85%", size: 3, color: "248,113,113", duration: 10, delay: 0.4 },
  { top: "46%", left: "12%", size: 4, color: "59,130,246", duration: 7.5, delay: 1.8 },
  { top: "58%", left: "48%", size: 5, color: "52,211,153", duration: 9.5, delay: 0.9 },
  { top: "66%", left: "78%", size: 3, color: "167,139,250", duration: 6.5, delay: 2.4 },
  { top: "78%", left: "30%", size: 5, color: "245,158,11", duration: 8.5, delay: 1.4 },
  { top: "88%", left: "60%", size: 4, color: "59,130,246", duration: 7, delay: 0.2 },
  { top: "40%", left: "92%", size: 3, color: "52,211,153", duration: 9, delay: 2.6 },
  { top: "70%", left: "6%", size: 4, color: "248,113,113", duration: 6.8, delay: 1.1 },
];

function useRevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll(".hp-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// Ambient background: soft blurred color blobs + a faint grid + a field of
// slow-drifting glow particles, all fixed so they add depth behind every
// section instead of just living in the hero.
function BackgroundDepth() {
  return (
    <div className="hp-bg-depth" aria-hidden="true">
      <div className="hp-bg-grid" />
      <div className="hp-blob b1" />
      <div className="hp-blob b2" />
      <div className="hp-blob b3" />
      <div className="hp-blob b4" />
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="hp-particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: `rgba(${p.color}, 0.5)`,
            boxShadow: `0 0 ${p.size * 2}px rgba(${p.color}, 0.2)`,
            animationDuration: `${p.duration}s, ${p.duration * 0.8}s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// A soft radial light that follows the pointer, blended with "screen" so it
// only ever brightens the dark background instead of washing out text.
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

  return <div ref={glowRef} className={`hp-cursor-glow ${active ? "active" : ""}`} aria-hidden="true" />;
}

function HeroOrbit() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let width, height, cx, cy, baseRadius;
    let t = 0;

    function resize() {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width;
      canvas.height = height;
      cx = width * 0.5;
      cy = height * 0.5;
      baseRadius = Math.min(width, height) * 0.34;
    }

    function tick() {
      t += 0.005;
      ctx.clearRect(0, 0, width, height);

      SKILLS.forEach((skill, i) => {
        const radius = baseRadius * (1 + 0.18 * (i % 3) / 2);
        ctx.strokeStyle = `rgba(${skill.color}, 0.12)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      SKILLS.forEach((skill, i) => {
        const angle = t * (0.25 + i * 0.02) + (i * Math.PI * 2) / SKILLS.length;
        const radius = baseRadius * (1 + 0.18 * (i % 3) / 2);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.9;

        // outer soft glow
        ctx.fillStyle = `rgba(${skill.color}, 0.07)`;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${skill.color}, 0.16)`;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${skill.color}, 0.85)`;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // slow-pulsing core at the center of the orbit
      const pulse = 5 + Math.sin(t * 2) * 2;
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + pulse);
      coreGradient.addColorStop(0, "rgba(52, 211, 153, 0.18)");
      coreGradient.addColorStop(1, "rgba(52, 211, 153, 0)");
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + pulse, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <div className="hp-hero-orbit-glow" />
      <canvas ref={canvasRef} />
    </>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  useRevealOnScroll();

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

// useEffect(() => {
//   if (!user) return;

//   async function cleanupIncompleteAssessments() {
//     try {
//       const res = await fetch(
//         `${import.meta.env.VITE_API_URL}/api/assessments/cleanup/incomplete`,
//         {
//           method: "DELETE",
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("token")}`,
//           },
//         }
//       );

//       const data = await res.json();

//       if (res.ok && data.success) {
//         localStorage.removeItem("assessmentId");
//         console.log("Incomplete assessments cleaned");
//       }
//     } catch (err) {
//       console.error("Cleanup failed:", err);
//     }
//   }

//   cleanupIncompleteAssessments();
// }, [user]);

  async function handleStart() {
  if (!user) {
    navigate("/login");
    return;
  }

  setStarting(true);

  try {
    clearAssessmentCompleted();
    const newAssessmentId = await startAssessment();
    startAssessmentFlow();
    console.log("New assessment created:", newAssessmentId);
    console.log(
      "Stored assessment ID:",
      localStorage.getItem("assessmentId")
    );

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

  return (
    <div className="hp-page">
      <style>{styles}</style>

      <BackgroundDepth />
      <CursorGlow />

      <nav className="hp-nav">
        <div className="hp-logo">
          <span className="hp-logo-dot" />
          <span className="hp-wordmark">Mind<span> Metrics</span></span>
        </div>

        <div className="hp-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#skills">Skills measured</a>
          <Link to="/performance">My performances</Link>
            <Link to="/analytics">My analysis</Link>
          <Link to="/about">About Us</Link>

        </div>

        {user && (
          <button className="hp-nav-cta" onClick={handleStart} disabled={starting}>
            {starting ? "Starting…" : "Start Assessment"}
          </button>
        )}

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
                <Link to="/performance" onClick={() => setMenuOpen(false)}>My Performances</Link>
                <Link to="/analytics" onClick={() => setMenuOpen(false)}>My Analysis</Link>
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

      <section className="hp-hero">
        <div className="hp-hero-inner">
          <div className="hp-hero-content">
            <h1>
              {user ? `Ready, ${user.name.split(" ")[0]}? ` : " "} <br/>
              Your{" "}
              <span className="hp-highlight">
                mind
                <svg viewBox="0 0 120 14" preserveAspectRatio="none">
                  <path
                    d="M2 9.5C22 3.5 45 2 60 5.5C78 9.5 100 10.5 118 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </svg>
              </span>{" "} <br/>
              Your{" "}
              <span className="hp-highlight">
                metrics
                <svg viewBox="0 0 120 14" preserveAspectRatio="none">
                  <path
                    d="M2 9.5C22 3.5 45 2 60 5.5C78 9.5 100 10.5 118 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                </svg>
              </span>{" "}
            </h1>
            <p>
              A series of short interactive games that measure memory,
              attention, observation, planning, reaction speed, and decision
              making — then turns it into a clear picture of how your mind
              performs.
            </p>
            <div className="hp-hero-meta">
              <span>6 skills tracked</span>
              <span className="dot" />
              <span>~20 minutes</span>
              <span className="dot" />
              <span>Report on completion</span>
            </div>
            <div className="hp-hero-ctas">
              <button className="hp-btn-primary" onClick={handleStart} disabled={starting}>
                {starting ? "Starting…" : "Start Assessment"}
              </button>
              <a href="#how-it-works">
                <button className="hp-btn-secondary" type="button">How It Works</button>
              </a>
            </div>
          </div>

          <div className="hp-hero-orbit">
            <HeroOrbit />
          </div>
        </div>

        <div className="hp-scroll-hint">
          Scroll to learn more
          <span className="arrow" />
        </div>
      </section>

      <section className="hp-section hp-reveal" id="how-it-works">
        <div className="hp-section-head">
          <div className="eyebrow">Before you begin</div>
          <h2>How the assessment works</h2>
          <p>Six quick rules so your run counts — read these before you hit start.</p>
        </div>
        <div className="hp-rules-grid">
          {RULES.map((rule, i) => (
            <div className={`hp-rule-card ${rule.warn ? "warn" : ""}`} key={rule.title}>
              <div className="hp-rule-num">{i + 1}</div>
              <div>
                <h4>{rule.title}</h4>
                <p>{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section hp-reveal" id="skills">
        <div className="hp-section-head">
          <div className="eyebrow">What gets measured</div>
          <h2>Six cognitive skills, one score each</h2>
          <p>Every game in the series feeds into one or more of these categories.</p>
        </div>
        <div className="hp-skills-grid">
          {SKILLS.map((skill) => (
            <div className="hp-skill-card" key={skill.label} style={{ "--accent": skill.hex }}>
              <div className="hp-skill-dot">{skill.icon}</div>
              <h4>{skill.label}</h4>
              <p>{skill.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* <section className="hp-section hp-reveal">
        <div className="hp-mid-cta">
          <h3>Your mind, measured properly.</h3>
          <p>Takes about 20 minutes. Results are ready the moment you finish.</p>
          <button className="hp-btn-primary" onClick={handleStart} disabled={starting}>
            {starting ? "Starting…" : "Start Assessment"}
          </button>
        </div>
      </section> */}

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo">
                <span className="hp-logo-dot" />
                <span className="hp-wordmark">Mind<span>Metrics</span></span>
              </div>
              <p>
                Interactive cognitive assessments powered by AI to reveal
                your strengths, improve performance, and unlock your
                potential.
              </p>
            </div>
            <div className="hp-footer-col">
              <h5>Product</h5>
              <a href="/">Assessments</a>
              <a href="/">Cognitive Modules</a>
              <a href="/analytics">Reports</a>
            </div>
            <div className="hp-footer-col">
              <h5>Company</h5>
              <Link to="/about">About Us</Link>
              <a href="#">Contact Us</a>
            </div>
            <div className="hp-footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
          <div className="hp-footer-bottom">
            <span>© {new Date().getFullYear()} MindMetrics. All rights reserved.</span>
            <div>
              <a href="#">LinkedIn</a>
              {/* <a href="https://github.com/mehak-arora-07/MindMetrics">GitHub</a> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}