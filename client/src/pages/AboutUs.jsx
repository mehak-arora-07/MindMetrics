import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearSession, startAssessment } from "../utils/session";

// Drop into client/src/pages/AboutPage.jsx
// Route it at "/about" in App.jsx: <Route path="/about" element={<AboutPage />} />
//
// Shares the same visual system as HomePage.jsx (nav, floating orbs,
// cursor glow, dot-grid background). If you ever change one, mirror the
// change in the other so they stay in sync.

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

.hp-reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.hp-reveal.in-view { opacity: 1; transform: translateY(0); }

.hp-page {
  width: 100%;
  background-color: #0B0F19;
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.045) 1px, transparent 0);
  background-size: 34px 34px;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #E5E7EB;
  position: relative;
  overflow-x: hidden;
}

/* ---- Ambient background depth ---- */
.hp-bg-orbs { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.hp-orb { position: absolute; border-radius: 50%; filter: blur(70px); will-change: transform; animation-name: hp-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
@keyframes hp-float {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(24px, -34px) scale(1.08); }
  66%  { transform: translate(-18px, 22px) scale(0.94); }
  100% { transform: translate(0, 0) scale(1); }
}

.hp-cursor-glow {
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(52, 211, 153, 0.16), rgba(59, 130, 246, 0.06) 35%, transparent 60%);
  transition: opacity 0.2s ease;
}

/* ---- Floating particles (hero accent, same spirit as Home's orbit) ---- */
.hp-hero-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.hp-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  animation-name: hp-particle-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes hp-particle-float {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  12%  { opacity: 1; }
  55%  { opacity: 0.55; }
  100% { transform: translateY(-220px) scale(1); opacity: 0; }
}

/* ---- Nav (same as HomePage) ---- */
.hp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 40px;
  background: rgba(11, 15, 25, 0.75);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #1a2033;
}
.hp-nav-links { display: flex; align-items: center; gap: 6px; margin: 0 auto; padding: 4px; background: rgba(255, 255, 255, 0.02); border: 1px solid #1a2033; border-radius: 999px; }
.hp-nav-links a { color: #8B93A7; text-decoration: none; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 999px; transition: color 0.15s ease, background 0.15s ease; }
.hp-nav-links a:hover { color: #E5E7EB; background: rgba(255, 255, 255, 0.05); }
.hp-nav-links a.active { color: #34D399; background: rgba(52, 211, 153, 0.08); }
.hp-logo { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; letter-spacing: -0.4px; cursor: default; }
.hp-logo-dot { width: 9px; height: 9px; border-radius: 50%; background: #34D399; flex-shrink: 0; }
.hp-wordmark {
  color: #E5E7EB;
  transition: background-position 0.5s ease, color 0.1s ease;
  background-image: linear-gradient(90deg, #34D399, #3B82F6, #A78BFA, #F59E0B, #F87171);
  background-size: 300% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
}
.hp-wordmark:hover { color: transparent; background-position: 0% 0; }
.hp-nav-right { position: relative; }
.hp-menu-btn {
  display: flex; align-items: center; gap: 10px;
  background: #141A2E; border: 1px solid #232A3D; border-radius: 999px;
  padding: 6px 14px 6px 6px; cursor: pointer; color: #E5E7EB;
  font-size: 13px; font-weight: 500; font-family: inherit;
  transition: border-color 0.15s ease;
}
.hp-menu-btn:hover { border-color: #34D399; }
.hp-menu-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #34D399, #3B82F6);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #05221A; flex-shrink: 0;
}
.hp-menu-hamburger { display: flex; flex-direction: column; gap: 3px; width: 14px; }
.hp-menu-hamburger span { height: 2px; background: #8B93A7; border-radius: 2px; transition: transform 0.2s ease, opacity 0.2s ease; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(2) { opacity: 0; }
.hp-menu-btn.open .hp-menu-hamburger span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
.hp-dropdown {
  position: absolute; top: calc(100% + 10px); right: 0; width: 220px;
  background: #141A2E; border: 1px solid #232A3D; border-radius: 12px; padding: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4); overflow: hidden;
  max-height: 0; opacity: 0; pointer-events: none;
  transition: max-height 0.25s ease, opacity 0.2s ease;
}
.hp-dropdown.open { max-height: 400px; opacity: 1; pointer-events: auto; }
.hp-dropdown-user { padding: 10px 12px; border-bottom: 1px solid #232A3D; margin-bottom: 6px; }
.hp-dropdown-user .name { color: #E5E7EB; font-size: 13px; font-weight: 600; }
.hp-dropdown-user .email { color: #8B93A7; font-size: 11px; margin-top: 2px; }
.hp-dropdown a, .hp-dropdown button {
  display: block; width: 100%; text-align: left; background: none; border: none;
  color: #C7CCDB; font-size: 13.5px; font-family: inherit; padding: 10px 12px;
  border-radius: 8px; cursor: pointer; text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.hp-dropdown a:hover, .hp-dropdown button:hover { background: rgba(255, 255, 255, 0.05); color: #E5E7EB; }
.hp-dropdown button.logout { color: #F87171; }
.hp-dropdown button.logout:hover { background: rgba(248, 113, 113, 0.1); }

/* ---- About hero ---- */
.hp-about-hero {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
  padding: 160px 24px 40px;
  overflow: hidden;
}
.hp-about-hero-inner {
  position: relative;
  z-index: 1;
}
.hp-eyebrow {
  display: inline-block;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #34D399;
  font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 6px 14px; border-radius: 20px; margin-bottom: 24px;
}
.hp-about-hero h1 {
  font-size: 44px; font-weight: 700; line-height: 1.15; letter-spacing: -1px;
  margin: 0 0 20px; color: #E5E7EB;
}
.hp-about-hero h1 span { color: #34D399; }
.hp-about-hero p {
  font-size: 16px; color: #8B93A7; line-height: 1.7;
  max-width: 560px; margin: 0 auto;
}

/* ---- Section shell (same as HomePage) ---- */
.hp-section { position: relative; z-index: 1; padding: 80px 24px; max-width: 1080px; margin: 0 auto; }
.hp-section-head { text-align: center; max-width: 620px; margin: 0 auto 48px; }
.hp-section-head .eyebrow {
  color: #34D399; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; margin-bottom: 10px;
}
.hp-section-head h2 { font-size: 32px; font-weight: 700; color: #E5E7EB; margin: 0 0 12px; letter-spacing: -0.5px; }
.hp-section-head p { color: #8B93A7; font-size: 15px; line-height: 1.6; margin: 0; }

/* ---- Story ---- */
.hp-story-body {
  max-width: 680px;
  margin: 0 auto;
  text-align: center;
}
.hp-story-body p {
  color: #8B93A7;
  font-size: 15.5px;
  line-height: 1.8;
  margin: 0 0 18px;
}
.hp-story-body p:last-child { margin-bottom: 0; }

/* ---- Team ---- */
.hp-team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 20px;
}
.hp-team-card {
  position: relative;
  background: rgba(20, 26, 46, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid #232A3D;
  border-radius: 16px;
  padding: 28px 22px;
  text-align: center;
  overflow: hidden;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.hp-team-card:hover { transform: translateY(-3px); border-color: var(--accent, #34D399); }
.hp-team-avatar {
  position: relative;
  z-index: 1;
  width: 72px; height: 72px; border-radius: 50%;
  margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: #05221A;
  background: linear-gradient(135deg, var(--accent, #34D399), #3B82F6);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent, #34D399) 12%, transparent);
  overflow: hidden;
  flex-shrink: 0;
}
.hp-team-avatar img { width: 100%; height: 100%; object-fit: cover; }
.hp-team-card h4 { position: relative; z-index: 1; color: #E5E7EB; font-size: 16px; font-weight: 600; margin: 0 0 4px; }
.hp-team-card .role {
  position: relative;
  z-index: 1;
  color: var(--accent, #34D399);
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  margin: 0;
}
.hp-team-card .bio { color: #8B93A7; font-size: 13px; line-height: 1.6; margin: 12px 0 0; position: relative; z-index: 1; }

/* ---- Values ---- */
.hp-values-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.hp-value-card {
  background: rgba(20, 26, 46, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid #232A3D;
  border-radius: 14px;
  padding: 22px;
}
.hp-value-card h4 { color: #34D399; font-size: 14.5px; font-weight: 700; margin: 0 0 6px; }
.hp-value-card p { color: #8B93A7; font-size: 13px; line-height: 1.55; margin: 0; }

/* ---- Mid CTA (same as HomePage) ---- */
.hp-mid-cta {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid #232A3D;
  border-radius: 20px;
  padding: 48px 40px;
  text-align: center;
}
.hp-mid-cta h3 { font-size: 26px; font-weight: 700; color: #E5E7EB; margin: 0 0 10px; }
.hp-mid-cta p { color: #8B93A7; font-size: 14px; margin: 0 0 26px; }

.hp-btn-primary {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A; border: none; border-radius: 10px;
  padding: 15px 32px; font-size: 15px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: transform 0.12s ease, box-shadow 0.15s ease;
}
.hp-btn-primary:hover { box-shadow: 0 6px 24px rgba(52, 211, 153, 0.3); }
.hp-btn-primary:active { transform: scale(0.97); }

/* ---- Footer (same as HomePage) ---- */
.hp-footer { position: relative; z-index: 1; border-top: 1px solid #1a2033; padding: 60px 24px 30px; }
.hp-footer-inner { max-width: 1080px; margin: 0 auto; }
.hp-footer-top { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 40px; margin-bottom: 48px; }
.hp-footer-brand .hp-logo { margin-bottom: 14px; }
.hp-footer-brand p { color: #8B93A7; font-size: 13px; line-height: 1.6; max-width: 280px; margin: 0; }
.hp-footer-col h5 { color: #E5E7EB; font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px; }
.hp-footer-col a { display: block; color: #8B93A7; font-size: 13.5px; text-decoration: none; margin-bottom: 12px; transition: color 0.15s ease; }
.hp-footer-col a:hover { color: #34D399; }
.hp-footer-bottom {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  padding-top: 24px; border-top: 1px solid #1a2033; color: #4B5468; font-size: 12.5px;
}
.hp-footer-bottom a { color: #4B5468; text-decoration: none; margin-left: 18px; }
.hp-footer-bottom a:hover { color: #8B93A7; }
@media (max-width: 760px) { .hp-nav-links { display: none; } }
@media (max-width: 900px) {
  .hp-about-hero { padding: 130px 24px 30px; }
  .hp-about-hero h1 { font-size: 32px; }
  .hp-footer-top { grid-template-columns: 1fr 1fr; }
}
`;

/* ============================================================
   EDIT ZONE — put your own content here. Nothing below this
   block needs to change for text edits; just update these
   three constants (STORY, TEAM, VALUES).
   ============================================================ */

const STORY = {
  eyebrow: "Our story",
  heading: "Why we started building this",
  // Add or remove paragraphs freely — each string becomes its own <p>.
  paragraphs: [
    "MindMetrics started with a simple idea: understanding your mind shouldn't feel like taking an exam. We wanted to make cognitive assessment more engaging by turning it into a series of interactive games that are both engaging and insightful and meaningful.",
    "Today, MindMetrics helps users explore skills like memory, attention, reaction time, and problem-solving while giving them insights into their cognitive performance. We're building a platform that makes learning about your mind simple, accessible, and enjoyable.",
  ],
};

// One entry per teammate. `bio` and `photo` are optional. Leave `photo`
// as "" to show initials instead of a picture. `color` sets that
// person's avatar/role accent (pick from: #34D399, #3B82F6, #A78BFA,
// #F59E0B, #F87171, or any hex).
const TEAM = [
  {
    name: "Jainy Pasnani",
    role: "Founder",
    initials: "JP",
    color: "#ffa1d2",
    bio: "",
    photo: "",
  },
  {
    name: "Mehak Arora",
    role: "Founder",
    initials: "MA",
    color:" #76ebfd",
    bio: "",
    photo: "",
  },
];

// Short cards describing what the team optimizes for. Add, remove, or
// reorder freely.
const VALUES = [
  { title: "1.", desc: "A sentence describing this value in practice." },
  { title: "2.", desc: "A sentence describing this value in practice." },
  { title: "3.", desc: "A sentence describing this value in practice." },
  { title: "4.", desc: "A sentence describing this value in practice." },
];

/* ============================================================
   END EDIT ZONE
   ============================================================ */

const BG_ORBS = [
  { top: "8%",  left: "6%",  size: 260, color: "52, 211, 153", opacity: 0.22, duration: "16s", delay: "0s" },
  { top: "62%", left: "88%", size: 320, color: "59, 130, 246", opacity: 0.18, duration: "20s", delay: "-4s" },
  { top: "80%", left: "10%", size: 220, color: "167, 139, 250", opacity: 0.16, duration: "18s", delay: "-9s" },
  { top: "30%", left: "80%", size: 180, color: "245, 158, 11", opacity: 0.14, duration: "14s", delay: "-2s" },
  { top: "45%", left: "42%", size: 260, color: "248, 113, 113", opacity: 0.10, duration: "22s", delay: "-11s" },
];

const PARTICLE_COLORS = ["52, 211, 153", "59, 130, 246", "167, 139, 250", "245, 158, 11", "248, 113, 113"];

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

function BgOrbs() {
  return (
    <div className="hp-bg-orbs" aria-hidden="true">
      {BG_ORBS.map((orb, i) => (
        <div
          key={i}
          className="hp-orb"
          style={{
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, rgba(${orb.color}, ${orb.opacity}) 0%, rgba(${orb.color}, 0) 70%)`,
            animationDuration: orb.duration,
            animationDelay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}

// Small glowing dots that drift upward and fade — the same "floating"
// feel as the orbiting dots on the Home hero, sized for a single-column
// hero instead of a side canvas.
function FloatingParticles({ count = 18 }) {
  const [particles] = useState(() =>
    Array.from({ length: count }).map((_, i) => ({
      left: `${Math.round(Math.random() * 100)}%`,
      bottom: `${Math.round(Math.random() * 15)}%`,
      size: 3 + Math.round(Math.random() * 5),
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      duration: `${6 + Math.round(Math.random() * 7)}s`,
      delay: `${(Math.random() * 8).toFixed(2)}s`,
    }))
  );

  return (
    <div className="hp-hero-particles" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="hp-particle"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(${p.color}, 0.95), rgba(${p.color}, 0))`,
            boxShadow: `0 0 10px rgba(${p.color}, 0.6)`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function CursorGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    let frame = null;
    let latest = null;

    function apply() {
      if (glowRef.current && latest) {
        glowRef.current.style.setProperty("--mx", `${latest.x}px`);
        glowRef.current.style.setProperty("--my", `${latest.y}px`);
      }
      frame = null;
    }

    function onMove(e) {
      latest = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    }

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="hp-cursor-glow" ref={glowRef} aria-hidden="true" />;
}

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  // async function handleStart() {
  //   try {
  //     await startAssessment();
  //     navigate("/play/pattern-sequence");
  //   } catch (err) {
  //     console.error("Could not start assessment:", err);
  //     alert("Couldn't start the assessment — please try again.");
  //   }
  // }

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="hp-page">
      <style>{styles}</style>

      <BgOrbs />
      <CursorGlow />

      <nav className="hp-nav">
        <Link to="/" style={{ textDecoration: "none" }}>
          <div className="hp-logo">
            <span className="hp-logo-dot" />
            <span className="hp-wordmark">MindMetrics</span>
          </div>
        </Link>

        <div className="hp-nav-links">
          <Link to="/">Home</Link>
          <Link to="/performance">My Performance</Link>
          <Link to="/analytics">My Analysis</Link>
          <Link to="/about" className="active">About</Link>
        </div>

        <div className="hp-nav-right" ref={menuRef}>
          <button className={`hp-menu-btn ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen((o) => !o)}>
            <span className="hp-menu-avatar">{initial}</span>
            <span className="hp-menu-hamburger">
              <span />
              <span />
              <span />
            </span>
          </button>

          <div className={`hp-dropdown ${menuOpen ? "open" : ""}`}>
            {user && (
              <div className="hp-dropdown-user">
                <div className="name">{user.name}</div>
                <div className="email">{user.email}</div>
              </div>
            )}
            <Link to="/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
            <Link to="/performances" onClick={() => setMenuOpen(false)}>My Performances</Link>
            <Link to="/analysis" onClick={() => setMenuOpen(false)}>My Analysis</Link>
            <Link to="/about" onClick={() => setMenuOpen(false)}>About Us</Link>
            <button className="logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      <section className="hp-about-hero">
        <FloatingParticles count={18} />
        <div className="hp-about-hero-inner">
          <div className="hp-eyebrow">About Us</div>
          <h1>
            We build tools to help you <span>understand</span> your own mind.
          </h1>
          <p>
            MindMetrics turns a handful of short games into a clear,
            honest picture of how you think — so you can see your patterns,
            not just a score.
          </p>
        </div>
      </section>

      <section className="hp-section hp-reveal">
        <div className="hp-section-head">
          <div className="eyebrow">{STORY.eyebrow}</div>
          <h2>{STORY.heading}</h2>
        </div>
        <div className="hp-story-body">
          {STORY.paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className="hp-section hp-reveal">
        <div className="hp-section-head">
          <div className="eyebrow">The people behind it</div>
          <h2>Meet the team</h2>
          <p>A small team building MindMetrics end to end.</p>
        </div>
        <div className="hp-team-grid">
          {TEAM.map((member) => (
            <div className="hp-team-card" key={member.name} style={{ "--accent": member.color }}>
              <div className="hp-team-avatar">
                {member.initials}
              </div>
              <h4 style={{color:"white"}}>{member.name}</h4>
              <div className="role">{member.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section hp-reveal">
        <div className="hp-section-head">
          <div className="eyebrow">How we work</div>
          <h2>What we value</h2>
        </div>
        <div className="hp-values-grid">
          {VALUES.map((value) => (
            <div className="hp-value-card" key={value.title}>
              <h4>{value.title}</h4>
              <p>{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section hp-reveal">
        <div className="hp-mid-cta">
          <h3>Curious how your mind measures up?</h3>
          <p>Takes about half an hour. Results are ready the moment you finish.</p>
          <button className="hp-btn-primary" onClick={() => (window.location.href = "/")}>
            Start Assessment
          </button>
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo">
                <span className="hp-logo-dot" />
                <span className="hp-wordmark">MindMetrics</span>
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
              {/* <a href="#">Careers</a> */}
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