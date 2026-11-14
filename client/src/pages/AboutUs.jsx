import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearSession } from "../utils/session";
import { themeCss } from "../utils/theme";
import ThemeToggle from "../components/ThemeToggle";

/* ============================================================
   EDIT ZONE — put your own content here. Nothing below this
   block needs to change for text edits; just update these
   three constants (STORY, TEAM, VALUES).
   ============================================================ */

const STORY = {
  heading: "Why we started building this",
  // Add or remove paragraphs freely — each string becomes its own <p>.
  paragraphs: [
    "MindMetrics started with a simple idea: understanding your mind shouldn't feel like taking an exam. We wanted to make cognitive assessment more engaging by turning it into a series of interactive games that are both engaging and insightful and meaningful.",
    "Today, MindMetrics helps users explore skills like memory, attention, reaction time, and problem-solving while giving them insights into their cognitive performance. We're building a platform that makes learning about your mind simple, accessible, and enjoyable.",
  ],
};

// One entry per teammate. Leave `photo` as "" to show initials.
// `color` is that person's accent (any hex).
const TEAM = [
  { name: "Jainy Pasnani", role: "Founder", initials: "JP", color: "#ffa1d2", photo: "" },
  { name: "Mehak Arora", role: "Founder", initials: "MA", color: "#76ebfd", photo: "" },
];

// Short cards describing what the team optimizes for.
const VALUES = [
  { title: "1.", desc: "A sentence describing this value in practice." },
  { title: "2.", desc: "A sentence describing this value in practice." },
  { title: "3.", desc: "A sentence describing this value in practice." },
  { title: "4.", desc: "A sentence describing this value in practice." },
];

/* ============================================================
   END EDIT ZONE
   ============================================================ */

const FACTS = [
  { big: "6", label: "cognitive skills measured" },
  { big: "25–35", label: "minutes, start to finish" },
  { big: "Instant", label: "report when you finish" },
];

const PIP_COLORS = ["var(--mint)", "var(--blue)", "var(--violet)", "var(--amber)"];
const WAVE_COLORS = ["var(--mint)", "var(--blue)", "var(--violet)", "var(--amber)", "var(--coral)", "var(--sky)"];
const WAVE_COLS = 22;
const WAVE_ROWS = 3;

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
${themeCss}
* { box-sizing: border-box; }
html, body, #root { margin: 0 !important; padding: 0 !important; background: var(--ink); width: 100% !important; max-width: none !important; border: none !important; text-align: left !important; overflow-x: hidden; }

.ab-page { width: 100%; background: var(--ink); font-family: 'Inter', -apple-system, sans-serif; color: var(--bone); position: relative; overflow-x: hidden; }

/* ---------- Nav (same look as the homepage) ---------- */
.ab-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 16px 40px; background: rgba(var(--ink-rgb), .8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.ab-logo { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; letter-spacing: -.5px; color: var(--bone); text-decoration: none; }
.ab-logo-mark { width: 18px; height: 18px; display: grid; grid-template: 1fr 1fr / 1fr 1fr; gap: 2px; }
.ab-logo-mark i { border-radius: 2px; }
.ab-logo-mark i:nth-child(1) { background: var(--mint); } .ab-logo-mark i:nth-child(2) { background: var(--blue); }
.ab-logo-mark i:nth-child(3) { background: var(--violet); } .ab-logo-mark i:nth-child(4) { background: var(--amber); }
.ab-wordmark span { color: var(--mint); }
.ab-nav-links { display: flex; gap: 28px; margin: 0 auto; }
.ab-nav-links a { color: var(--mute); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .15s; }
.ab-nav-links a:hover { color: var(--bone); }
.ab-nav-links a.active { color: var(--mint); }
.ab-nav-right { position: relative; display: flex; align-items: center; gap: 10px; }
.ab-nav-cta, .ab-menu-btn { display: inline-flex; align-items: center; gap: 10px; background: transparent; border: 1px solid var(--line); color: var(--bone); font: 600 13px 'Inter', sans-serif; padding: 9px 18px; border-radius: 8px; cursor: pointer; text-decoration: none; transition: border-color .15s; }
.ab-nav-cta:hover, .ab-menu-btn:hover { border-color: var(--mint); }
.ab-menu-btn { padding: 5px 12px 5px 5px; }
.ab-menu-avatar { width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, var(--mint), var(--blue)); display: grid; place-items: center; font: 800 13px 'Inter', sans-serif; color: var(--on-accent); }
.ab-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 8px; box-shadow: 0 16px 40px rgba(0,0,0,var(--shadow-a)); opacity: 0; transform: translateY(-6px); pointer-events: none; transition: opacity .18s, transform .18s; }
.ab-dropdown.open { opacity: 1; transform: none; pointer-events: auto; }
.ab-dropdown-user { padding: 10px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
.ab-dropdown-user .name { font-size: 13px; font-weight: 600; } .ab-dropdown-user .email { color: var(--mute); font-size: 11px; margin-top: 2px; }
.ab-dropdown a, .ab-dropdown button { display: block; width: 100%; text-align: left; background: none; border: 0; color: var(--mute); font: 500 13.5px 'Inter', sans-serif; padding: 10px 12px; border-radius: 6px; cursor: pointer; text-decoration: none; }
.ab-dropdown a:hover, .ab-dropdown button:hover { background: rgba(var(--wash-rgb), .06); color: var(--bone); }
.ab-dropdown .logout { color: var(--coral); }

/* ---------- Hero ---------- */
.ab-hero { position: relative; max-width: 1240px; margin: 0 auto; padding: 150px 40px 70px; }
.ab-hero h1 { font-size: clamp(40px, 6.4vw, 84px); font-weight: 800; line-height: 1.02; letter-spacing: -.045em; margin: 0 0 26px; max-width: 900px; }
.ab-hero h1 .two { display: block; font-weight: 500; font-style: italic; letter-spacing: -.035em; color: var(--mute); }
.ab-hero p { font-size: 17px; line-height: 1.7; color: var(--mute); max-width: 560px; margin: 0 0 44px; }

/* Pixel wave: the one animated moment on the page */
.ab-wave { display: grid; grid-template-columns: repeat(${WAVE_COLS}, 1fr); gap: 6px; max-width: 880px; }
.ab-px { aspect-ratio: 1; border-radius: 3px; background: var(--c); opacity: .14; animation: ab-wave 3.6s ease-in-out infinite; animation-delay: calc((var(--x) + var(--y) * 2) * 110ms); }
@keyframes ab-wave { 0%, 100% { opacity: .14; transform: scale(.82); } 45% { opacity: 1; transform: scale(1); } }

/* ---------- Facts ---------- */
.ab-facts { max-width: 1240px; margin: 0 auto; padding: 0 40px; }
.ab-facts-row { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.ab-fact { padding: 28px 24px 28px 0; }
.ab-fact + .ab-fact { padding-left: 24px; border-left: 1px solid var(--line); }
.ab-fact b { display: block; font-size: clamp(28px, 3.6vw, 44px); font-weight: 800; letter-spacing: -.04em; line-height: 1; margin-bottom: 8px; }
.ab-fact span { color: var(--mute); font-size: 14px; }

/* ---------- Sections ---------- */
.ab-section { max-width: 1240px; margin: 0 auto; padding: 90px 40px 0; }
.ab-section h2 { font-size: clamp(28px, 3.6vw, 44px); font-weight: 800; letter-spacing: -.035em; line-height: 1.08; margin: 0 0 12px; }
.ab-section .lede { color: var(--mute); font-size: 16px; line-height: 1.6; margin: 0 0 40px; }
.ab-story { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 56px; align-items: start; }
.ab-story h2 { margin: 0; }
.ab-story p { color: var(--mute); font-size: 16.5px; line-height: 1.8; margin: 0 0 20px; max-width: 620px; }
.ab-story p:first-child { color: var(--bone); font-size: 19px; line-height: 1.7; }
.ab-story p:last-child { margin-bottom: 0; }

/* ---------- Team ---------- */
.ab-team { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 280px)); gap: 14px; }
.ab-member { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 10px 10px 10px 2px; padding: 24px 22px 26px; overflow: hidden; transition: border-color .2s; }
.ab-member::before { content: ""; position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: var(--accent); transform: scaleX(.18); transform-origin: left; transition: transform .4s cubic-bezier(.7,0,.15,1); }
.ab-member:hover { border-color: var(--accent); }
.ab-member:hover::before { transform: scaleX(1); }
.ab-avatar { width: 60px; height: 60px; border-radius: 10px; margin-bottom: 22px; display: grid; place-items: center; font-size: 20px; font-weight: 800; color: #0B1020; background: var(--accent); overflow: hidden; }
.ab-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ab-member h4 { font-size: 18px; font-weight: 600; margin: 0 0 4px; letter-spacing: -.01em; }
.ab-member .role { color: var(--mute); font-size: 13.5px; }

/* ---------- Values ---------- */
.ab-values { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); border-top: 1px solid var(--line); }
.ab-value { display: grid; grid-template-columns: 10px 1fr; gap: 18px; padding: 26px 24px 26px 0; border-bottom: 1px solid var(--line); }
.ab-value i { width: 10px; height: 10px; border-radius: 2px; background: var(--pip); margin-top: 7px; }
.ab-value h4 { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
.ab-value p { color: var(--mute); font-size: 14px; line-height: 1.6; margin: 0; max-width: 380px; }

/* ---------- CTA ---------- */
.ab-cta { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 52px 44px; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }
.ab-cta h3 { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -.03em; margin: 0 0 8px; }
.ab-cta p { color: var(--mute); font-size: 15px; margin: 0; }
.ab-btn { background: var(--mint); color: var(--on-accent); border: 0; border-radius: 8px; padding: 15px 28px; font: 700 15px 'Inter', sans-serif; cursor: pointer; box-shadow: 4px 4px 0 var(--blue); transition: transform .12s, box-shadow .12s; }
.ab-btn:hover { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--blue); }
.ab-btn:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--blue); }

/* ---------- Footer ---------- */
.ab-footer { border-top: 1px solid var(--line); margin-top: 90px; padding: 56px 40px 28px; }
.ab-footer-inner { max-width: 1240px; margin: 0 auto; }
.ab-footer-top { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 40px; margin-bottom: 44px; }
.ab-footer-brand p { color: var(--mute); font-size: 13.5px; line-height: 1.6; max-width: 290px; margin: 14px 0 0; }
.ab-footer-col h5 { font: 600 14px 'Inter', sans-serif; margin: 0 0 14px; }
.ab-footer-col a { display: block; color: var(--mute); font-size: 14px; text-decoration: none; margin-bottom: 11px; }
.ab-footer-col a:hover { color: var(--mint); }
.ab-footer-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 22px; border-top: 1px solid var(--line); color: var(--faint); font-size: 13px; }
.ab-footer-bottom a { color: var(--faint); text-decoration: none; } .ab-footer-bottom a:hover { color: var(--mute); }

@media (max-width: 980px) {
  .ab-nav-links { display: none; }
  .ab-story { grid-template-columns: 1fr; gap: 24px; }
}
@media (max-width: 640px) {
  .ab-nav { padding: 14px 20px; }
  .ab-hero { padding: 110px 20px 50px; }
  .ab-facts, .ab-section { padding-left: 20px; padding-right: 20px; }
  .ab-section { padding-top: 60px; }
  .ab-facts-row { grid-template-columns: 1fr; }
  .ab-fact, .ab-fact + .ab-fact { padding: 20px 0; border-left: 0; }
  .ab-fact + .ab-fact { border-top: 1px solid var(--line); }
  .ab-cta { padding: 32px 24px; }
  .ab-footer { padding: 48px 20px 24px; }
  .ab-footer-top { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .ab-px { animation: none; opacity: .6; transform: none; }
  .ab-member::before, .ab-btn { transition: none; }
}
`;

function PixelWave() {
  const cells = [];
  for (let y = 0; y < WAVE_ROWS; y++) {
    for (let x = 0; x < WAVE_COLS; x++) {
      cells.push(
        <span
          key={`${x}-${y}`}
          className="ab-px"
          style={{ "--x": x, "--y": y, "--c": WAVE_COLORS[(x + y) % WAVE_COLORS.length] }}
        />
      );
    }
  }
  return <div className="ab-wave" aria-hidden="true">{cells}</div>;
}

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";
  const Logo = () => (
    <Link to="/" className="ab-logo">
      <span className="ab-logo-mark"><i /><i /><i /><i /></span>
      <span className="ab-wordmark">Mind<span>Metrics</span></span>
    </Link>
  );

  return (
    <div className="ab-page">
      <style>{styles}</style>

      <nav className="ab-nav">
        <Logo />
        <div className="ab-nav-links">
          <Link to="/">Home</Link>
          <Link to="/performance">My performances</Link>
          <Link to="/analytics">My analysis</Link>
          <Link to="/about" className="active">About us</Link>
        </div>
        <div className="ab-nav-right" ref={menuRef}>
          <ThemeToggle />
          {user ? (
            <>
              <button className="ab-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <span className="ab-menu-avatar">{initial}</span>
                <span>Menu</span>
              </button>
              <div className={`ab-dropdown ${menuOpen ? "open" : ""}`}>
                <div className="ab-dropdown-user">
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
            <Link to="/login" className="ab-nav-cta">Log in / Sign up</Link>
          )}
        </div>
      </nav>

      <header className="ab-hero">
        <h1>
          We build tools to help you understand
          <span className="two">your own mind.</span>
        </h1>
        <p>
          MindMetrics turns a handful of short games into a clear, honest picture of how you think, so you can
          see your patterns, not just a score.
        </p>
        <PixelWave />
      </header>

      <div className="ab-facts">
        <div className="ab-facts-row">
          {FACTS.map((f) => (
            <div className="ab-fact" key={f.label}>
              <b>{f.big}</b>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="ab-section">
        <div className="ab-story">
          <h2>{STORY.heading}</h2>
          <div>
            {STORY.paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-section">
        <h2>Meet the team</h2>
        <p className="lede">A small team building MindMetrics end to end.</p>
        <div className="ab-team">
          {TEAM.map((m) => (
            <div className="ab-member" key={m.name} style={{ "--accent": m.color }}>
              <div className="ab-avatar">{m.photo ? <img src={m.photo} alt={m.name} /> : m.initials}</div>
              <h4>{m.name}</h4>
              <div className="role">{m.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-section">
        <h2>What we value</h2>
        <p className="lede">How we decide what to build.</p>
        <div className="ab-values">
          {VALUES.map((v, i) => (
            <div className="ab-value" key={v.title + i}>
              <i style={{ "--pip": PIP_COLORS[i % PIP_COLORS.length] }} />
              <div>
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-section">
        <div className="ab-cta">
          <div>
            <h3>Curious how your mind measures up?</h3>
            <p>Takes about half an hour. Your report is ready the moment you finish.</p>
          </div>
          <button className="ab-btn" onClick={() => navigate("/")}>Start assessment</button>
        </div>
      </section>

      <footer className="ab-footer">
        <div className="ab-footer-inner">
          <div className="ab-footer-top">
            <div className="ab-footer-brand">
              <Logo />
              <p>Interactive cognitive assessments powered by AI to reveal your strengths, improve performance, and unlock your potential.</p>
            </div>
            <div className="ab-footer-col">
              <h5>Product</h5>
              <Link to="/">Assessments</Link>
              <Link to="/">Cognitive Modules</Link>
              <Link to="/analytics">Reports</Link>
            </div>
            <div className="ab-footer-col">
              <h5>Company</h5>
              <Link to="/about">About Us</Link>
              <a href="#">Contact Us</a>
            </div>
            <div className="ab-footer-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
          <div className="ab-footer-bottom">
            <span>© {new Date().getFullYear()} MindMetrics. All rights reserved.</span>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
