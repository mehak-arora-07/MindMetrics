import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, clearSession, startAssessment, clearAssessmentId } from "../utils/session";
import { startAssessmentFlow } from "../utils/assessmentFlow";
import { clearAssessmentCompleted } from "../utils/session";

/*
  Design notes
  - The page is built from the same 5x5 grid the assessment opens with:
    the logo, the practice board in the hero and the skill glyphs are all
    patterns on that grid.
  - Colour carries meaning. Yellow = "lit, remember this". Red = the one
    rule that can throw away an attempt. Everything else is ink on paper.
  - Typeface: Atkinson Hyperlegible Next, designed by the Braille Institute
    for telling characters apart quickly. It suits a test of perception.
*/

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400..800&display=swap");

* { box-sizing: border-box; }

html, body, #root {
  margin: 0 !important;
  padding: 0 !important;
  background: #FFFFFF;
  width: 100% !important;
  max-width: none !important;
  border: none !important;
  text-align: left !important;
}

html { color-scheme: light; }

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

/* ---- Tokens ---- */
.hp-page {
  --paper: #FFFFFF;
  --ink: #1F2C7A;
  --ink-deep: #16205E;
  --ink-soft: #4B5590;
  --line: #DADDEB;
  --wash: #F0F2FA;
  --lit: #FFE04F;
  --notice: #FFF4C2;
  --red: #C8102E;
  --tile: #26348A;
  --tile-edge: #6B7AD6;
  --on-ink: #C9CFEA;

  width: 100%;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 17px;
  line-height: 1.55;
}

/* Scoped resets. :where() keeps them at zero specificity so any class below can set margins. */
:where(.hp-page) :where(h1, h2, h3, h4, p, ul) { margin: 0; }
:where(.hp-page) ul { padding: 0; list-style: none; }
.hp-page a, .hp-page a:hover { color: inherit; }
.hp-page button { font-family: inherit; }
.hp-page :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
.hp-page :focus:not(:focus-visible) { outline: none; }
.hp-page h2, .hp-page h3, .hp-page h4 { text-wrap: balance; }
.hp-page p { text-wrap: pretty; }

.hp-wrap {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 32px;
}

/* ---- Nav ---- */
.hp-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.hp-nav-inner {
  display: flex;
  align-items: center;
  gap: 28px;
  height: 68px;
}

.hp-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-right: auto;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.hp-mark {
  display: grid;
  grid-template-columns: repeat(3, 5px);
  gap: 2px;
  padding: 5px;
  border-radius: 6px;
  background: var(--ink);
  flex-shrink: 0;
}
.hp-mark span { width: 5px; height: 5px; border-radius: 1px; background: var(--tile-edge); }
.hp-mark span.on { background: var(--lit); }

.hp-navlinks {
  display: flex;
  align-items: center;
  gap: 22px;
}

.hp-page .hp-navlinks a {
  padding: 8px 0;
  font-size: 15px;
  color: var(--ink-soft);
  text-decoration: none;
  white-space: nowrap;
}

.hp-page .hp-navlinks a:hover {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 6px;
}

.hp-account {
  position: relative;
  flex-shrink: 0;
}

.hp-page .hp-login {
  display: inline-flex;
  align-items: center;
  height: 42px;
  padding: 0 16px;
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.hp-page .hp-login:hover { background: var(--ink); color: var(--paper); }

.hp-page .hp-menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  margin: 0;
  padding: 0 12px 0 5px;
  background: var(--paper);
  color: var(--ink);
  border: 1.5px solid var(--line);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.hp-page .hp-menu-btn:hover,
.hp-page .hp-menu-btn[aria-expanded="true"] { border-color: var(--ink); }

.hp-avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--lit);
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.hp-burger {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 14px;
}
.hp-burger span {
  display: block;
  height: 2px;
  border-radius: 2px;
  background: var(--ink);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.hp-menu-btn[aria-expanded="true"] .hp-burger span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
.hp-menu-btn[aria-expanded="true"] .hp-burger span:nth-child(2) { opacity: 0; }
.hp-menu-btn[aria-expanded="true"] .hp-burger span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

.hp-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 248px;
  padding: 6px;
  background: var(--paper);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 18px 40px -16px rgba(31, 44, 122, 0.35);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s linear 0.15s;
}
.hp-dropdown.open {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.hp-dropdown-user {
  padding: 10px 12px 12px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--line);
}
.hp-dropdown-user .name { font-size: 15px; font-weight: 700; }
.hp-dropdown-user .email { font-size: 13px; color: var(--ink-soft); overflow-wrap: anywhere; }

.hp-page .hp-dropdown a,
.hp-page .hp-dropdown button {
  display: block;
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  background: none;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.3;
  text-align: left;
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
}
.hp-page .hp-dropdown a:hover,
.hp-page .hp-dropdown button:hover { background: var(--wash); }
.hp-page .hp-dropdown .hp-logout { color: var(--red); }
.hp-page .hp-dropdown .hp-logout:hover { background: #FCEBEE; }

/* ---- Hero ---- */
.hp-hero { padding: 88px 0 112px; }

.hp-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 72px;
  align-items: center;
}

.hp-greeting {
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ink-soft);
}

.hp-page .hp-title {
  margin-bottom: 28px;
  font-size: clamp(42px, 7vw, 88px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}
.hp-title span { display: block; }

.hp-lede {
  max-width: 30em;
  margin-bottom: 36px;
  font-size: 20px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.hp-cta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 28px;
}

.hp-page .hp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  margin: 0;
  padding: 0 28px;
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.hp-page .hp-btn:hover { background: var(--ink-deep); }
.hp-page .hp-btn:active { transform: translateY(1px); }
.hp-page .hp-btn:disabled { opacity: 0.75; cursor: progress; }

.hp-page .hp-textlink {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 6px;
}
.hp-page .hp-textlink:hover { text-decoration-thickness: 3px; }

.hp-note {
  margin-top: 20px;
  font-size: 15px;
  color: var(--ink-soft);
}

/* ---- Practice board ---- */
.hp-board {
  justify-self: end;
  width: 100%;
  max-width: 440px;
  padding: 24px;
  border-radius: 20px;
  background: var(--ink);
  color: var(--paper);
}

.hp-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  border-radius: 10px;
}
.hp-page .hp-grid:focus-visible { outline: 3px solid var(--lit); outline-offset: 6px; }

.hp-page .hp-tile {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: var(--tile);
  box-shadow: inset 0 0 0 1.5px var(--tile-edge);
  cursor: default;
  transition: background-color 0.16s ease, box-shadow 0.16s ease;
}
.hp-page .hp-tile.is-live { cursor: pointer; }
.hp-page .hp-tile.is-live:hover { box-shadow: inset 0 0 0 2px var(--paper); }
.hp-page .hp-tile.is-lit,
.hp-page .hp-tile.is-hit { background: var(--lit); box-shadow: inset 0 0 0 1.5px var(--lit); }
.hp-page .hp-tile.is-missed { box-shadow: inset 0 0 0 3px var(--lit); }
.hp-page .hp-tile.is-wrong { background: var(--ink-deep); box-shadow: inset 0 0 0 1.5px #FF9C9C; }
.hp-page .hp-tile.is-wrong::before,
.hp-page .hp-tile.is-wrong::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  height: 3px;
  border-radius: 2px;
  background: #FF9C9C;
  transform: translate(-50%, -50%) rotate(45deg);
}
.hp-page .hp-tile.is-wrong::after { transform: translate(-50%, -50%) rotate(-45deg); }
.hp-page .hp-tile:focus-visible { outline: 3px solid var(--paper); outline-offset: 2px; }

/* The one non-interactive moment: a single sweep across the board on load */
@keyframes hp-sweep {
  0%, 100% { background-color: var(--tile); }
  40% { background-color: var(--lit); }
}
.hp-grid.is-intro .hp-tile {
  animation: hp-sweep 0.7s ease-in-out both;
  animation-delay: calc(var(--d) * 60ms + 300ms);
}

.hp-board-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 16px;
  min-height: 48px;
  margin-top: 20px;
}

.hp-board-status {
  flex: 1 1 220px;
  font-size: 15px;
  line-height: 1.45;
  color: var(--on-ink);
}

.hp-page .hp-board-btn {
  flex-shrink: 0;
  min-height: 44px;
  margin: 0;
  padding: 0 18px;
  background: var(--lit);
  color: var(--ink);
  border: 0;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}
.hp-page .hp-board-btn:hover { background: #FFEB8A; }
.hp-page .hp-board-btn.is-quiet { background: transparent; color: var(--paper); box-shadow: inset 0 0 0 1.5px var(--tile-edge); }
.hp-page .hp-board-btn.is-quiet:hover { background: transparent; box-shadow: inset 0 0 0 1.5px var(--paper); }
.hp-page .hp-board-btn:focus-visible { outline: 3px solid var(--lit); outline-offset: 3px; }

/* ---- Sections ---- */
.hp-section { scroll-margin-top: 68px; }

.hp-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
  gap: 40px 64px;
  align-items: start;
}

.hp-page .hp-section-head h2 {
  margin-bottom: 16px;
  font-size: 40px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.hp-section-head p { max-width: 24em; color: var(--ink-soft); }

/* Rules: the "read this first" sheet */
.hp-rules {
  padding: 104px 0;
  background: var(--notice);
}

.hp-rule-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 48px;
}

.hp-page .hp-rule-group h3 {
  margin-bottom: 28px;
  padding-top: 14px;
  border-top: 3px solid var(--ink);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
}

.hp-rule-list {
  display: grid;
  gap: 28px;
}

.hp-page .hp-rule h4 {
  margin-bottom: 6px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}
.hp-rule p { font-size: 16px; color: var(--ink-soft); }

.hp-rule.is-warn {
  margin-left: -18px;
  padding: 16px 18px;
  background: var(--paper);
  border-radius: 12px;
  box-shadow: inset 0 0 0 2px var(--red);
}
.hp-page .hp-rule.is-warn h4 { color: var(--red); }
.hp-rule.is-warn p { color: var(--ink); }

/* Skills */
.hp-skills { padding: 104px 0 120px; }

.hp-skill-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 44px 48px;
}

.hp-skill {
  display: grid;
  grid-template-columns: 43px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.hp-page .hp-skill h3 {
  margin-bottom: 4px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.hp-skill p { font-size: 16px; color: var(--ink-soft); }

.hp-glyph {
  display: grid;
  grid-template-columns: repeat(5, 7px);
  gap: 2px;
  margin-top: 3px;
}
.hp-glyph span { width: 7px; height: 7px; border-radius: 1.5px; background: #E3E6F3; }
.hp-glyph span.on { background: var(--ink); }

/* Closing call to action (currently commented out in the JSX) */
.hp-final { padding: 0 0 120px; }
.hp-page .hp-final h2 { margin-bottom: 12px; font-size: 40px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; }
.hp-final p { margin-bottom: 28px; color: var(--ink-soft); }

/* ---- Footer ---- */
.hp-footer {
  padding: 72px 0 32px;
  background: var(--ink);
  color: var(--paper);
}

.hp-footer .hp-mark { background: transparent; box-shadow: inset 0 0 0 1.5px var(--tile-edge); }

.hp-footer-top {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
  gap: 40px;
  padding-bottom: 56px;
}

.hp-footer-brand p {
  max-width: 24em;
  margin-top: 16px;
  font-size: 15px;
  color: var(--on-ink);
}

.hp-page .hp-footer-heading {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 800;
  color: var(--paper);
}

.hp-page .hp-footer-col a {
  display: block;
  padding: 5px 0;
  font-size: 15px;
  color: var(--on-ink);
  text-decoration: none;
}

.hp-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid rgba(201, 207, 234, 0.28);
  font-size: 14px;
  color: #AEB6E6;
}

.hp-page .hp-footer-bottom a { color: var(--on-ink); text-decoration: none; }
.hp-page .hp-footer-col a:hover,
.hp-page .hp-footer-bottom a:hover { color: var(--paper); text-decoration: underline; text-underline-offset: 4px; }
.hp-page .hp-footer :focus-visible { outline-color: var(--lit); }

/* ---- Responsive ---- */
@media (max-width: 1040px) {
  .hp-navlinks { display: none; }
}

@media (max-width: 960px) {
  .hp-hero { padding: 56px 0 88px; }
  .hp-hero-grid { grid-template-columns: minmax(0, 1fr); gap: 56px; }
  .hp-board { justify-self: start; }
  .hp-section-grid { grid-template-columns: minmax(0, 1fr); }
  .hp-rules, .hp-skills { padding: 80px 0; }
  .hp-footer-top { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hp-footer-brand { grid-column: 1 / -1; }
}

@media (max-width: 720px) {
  .hp-lede { font-size: 18px; }
  .hp-page .hp-section-head h2,
  .hp-page .hp-final h2 { font-size: 32px; }
  .hp-rule-groups { grid-template-columns: minmax(0, 1fr); gap: 44px; }
  .hp-skill-list { grid-template-columns: minmax(0, 1fr); gap: 32px; }
}

@media (max-width: 600px) {
  .hp-wrap { padding: 0 20px; }
  .hp-nav-inner { height: 60px; gap: 16px; }
  .hp-page .hp-title { font-size: clamp(42px, 13vw, 56px); }
  .hp-section { scroll-margin-top: 60px; }
  .hp-board { padding: 16px; border-radius: 16px; }
  .hp-grid { gap: 6px; }
  .hp-rule.is-warn { margin-left: -12px; padding: 14px 12px; }
  .hp-footer-top { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 400px) {
  .hp-logo { font-size: 18px; }
  .hp-hide-xs { display: none; }
}

@media (max-width: 340px) {
  .hp-footer-top { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .hp-page *, .hp-page *::before, .hp-page *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// Single source for the session length so the hero and the rules can't disagree.
const SESSION_LENGTH = "25–35 minutes";

// Each skill's glyph is a pattern on the same 5x5 grid as the practice board.
const SKILLS = [
  { label: "Memory", desc: "Recall and working memory", glyph: ["10000", "00010", "01000", "00001", "00100"] },
  { label: "Attention", desc: "Focus and sustained attention", glyph: ["01110", "10001", "10101", "10001", "01110"] },
  { label: "Observation", desc: "Visual perception and awareness", glyph: ["11111", "11111", "11101", "11111", "11111"] },
  { label: "Planning", desc: "Strategy and problem solving", glyph: ["11100", "00100", "01100", "01000", "01111"] },
  { label: "Reaction", desc: "Speed and response time", glyph: ["00100", "00010", "11111", "00010", "00100"] },
  { label: "Decision making", desc: "Choices under uncertainty", glyph: ["10001", "01010", "00100", "00100", "00100"] },
];

const RULE_GROUPS = [
  { id: "expect", heading: "What to expect" },
  { id: "ground", heading: "Ground rules" },
];

const RULES = [
  {
    group: "expect",
    title: "One continuous assessment",
    desc: "This session includes a series of short cognitive games, run one after another automatically — no need to navigate between them.",
    warn: false,
  },
  {
    group: "expect",
    title: `About ${SESSION_LENGTH} total`,
    desc: "Each game takes a few minutes. Total time depends on your pace, but plan for roughly half an hour.",
    warn: false,
  },
  {
    group: "ground",
    title: "Stay on this tab",
    desc: "Don't switch away, refresh, or minimize for long — the games use short timers and streams that keep running in the background.",
    warn: false,
  },
  {
    group: "ground",
    title: "Don't close the browser or lose connection",
    desc: "If you close the tab, go offline, or log out partway through, that attempt is discarded — nothing gets saved, and you'll start fresh next time.",
    warn: true,
  },
  {
    group: "ground",
    title: "One attempt at a time",
    desc: "You can only have one assessment in progress. Finish or abandon the current one before starting another.",
    warn: false,
  },
  {
    group: "expect",
    title: "Instant results",
    desc: "The moment you complete the final game, your full behavioral analysis report is generated right away.",
    warn: false,
  },
];

const MARK = "100001010"; // 3x3 logo mark, 1 = lit square

function MatrixMark() {
  return (
    <span className="hp-mark" aria-hidden="true">
      {MARK.split("").map((cell, i) => (
        <span key={i} className={cell === "1" ? "on" : undefined} />
      ))}
    </span>
  );
}

function MatrixGlyph({ rows }) {
  return (
    <span className="hp-glyph" aria-hidden="true">
      {rows.join("").split("").map((cell, i) => (
        <span key={i} className={cell === "1" ? "on" : undefined} />
      ))}
    </span>
  );
}

// ---- Practice round ----
// A small, unscored version of a memory-matrix game: squares light up,
// go dark, and you tap the ones you remember. A perfect round adds a square.
const GRID = 5;
const FIRST_ROUND = 4;
const LAST_ROUND = 9;

function randomPattern(size) {
  const cells = Array.from({ length: GRID * GRID }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, size);
}

function MemoryWarmup() {
  const [phase, setPhase] = useState("idle"); // idle -> ready -> show -> recall -> done
  const [size, setSize] = useState(FIRST_ROUND);
  const [pattern, setPattern] = useState([]);
  const [picks, setPicks] = useState([]);
  const [cursor, setCursor] = useState(12);
  const [intro, setIntro] = useState(true);
  const boardRef = useRef(null);
  const gridRef = useRef(null);
  const tileRefs = useRef([]);
  const timers = useRef([]);

  useEffect(() => {
    const id = setTimeout(() => setIntro(false), 1700);
    return () => {
      clearTimeout(id);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  // When recall starts, move keyboard focus onto the grid if it was already in the board.
  useEffect(() => {
    if (phase !== "recall") return;
    if (boardRef.current && boardRef.current.contains(document.activeElement)) {
      tileRefs.current[cursor]?.focus();
    }
  }, [phase, cursor]);

  function startRound(n) {
    timers.current.forEach(clearTimeout);
    if (boardRef.current && boardRef.current.contains(document.activeElement)) {
      gridRef.current?.focus();
    }
    setIntro(false);
    setSize(n);
    setPattern(randomPattern(n));
    setPicks([]);
    setPhase("ready");
    timers.current = [
      setTimeout(() => setPhase("show"), 450),
      setTimeout(() => setPhase("recall"), 450 + 1000 + n * 200),
    ];
  }

  function pick(i) {
    if (phase !== "recall" || picks.includes(i)) return;
    const next = [...picks, i];
    setPicks(next);
    setCursor(i);
    if (next.length === size) setPhase("done");
  }

  function moveCursor(e, i) {
    const steps = { ArrowUp: -GRID, ArrowDown: GRID, ArrowLeft: -1, ArrowRight: 1 };
    if (!(e.key in steps)) return;
    e.preventDefault();
    const col = i % GRID;
    let next = i + steps[e.key];
    if ((e.key === "ArrowLeft" && col === 0) || (e.key === "ArrowRight" && col === GRID - 1)) next = i;
    if (next < 0 || next >= GRID * GRID) next = i;
    setCursor(next);
    tileRefs.current[next]?.focus();
  }

  function tileState(i) {
    const inPattern = pattern.includes(i);
    const picked = picks.includes(i);
    if (phase === "show") return inPattern ? "is-lit" : "";
    if (phase === "recall" || phase === "done") {
      if (picked) return inPattern ? "is-hit" : "is-wrong";
      if (phase === "done" && inPattern) return "is-missed";
      return phase === "recall" ? "is-live" : "";
    }
    return "";
  }

  function tileLabel(i, state) {
    const where = `Row ${Math.floor(i / GRID) + 1}, column ${(i % GRID) + 1}`;
    if (state === "is-hit") return `${where}, found`;
    if (state === "is-wrong") return `${where}, not in the pattern`;
    if (state === "is-missed") return `${where}, missed`;
    return where;
  }

  const hits = picks.filter((i) => pattern.includes(i)).length;
  const missed = size - hits;
  const perfect = phase === "done" && hits === size;

  let status;
  if (phase === "idle") {
    status = "A practice round like the first game in the assessment. It isn't scored.";
  } else if (phase === "ready" || phase === "show") {
    status = `Remember where the ${size} squares light up.`;
  } else if (phase === "recall") {
    const left = size - picks.length;
    status = `Tap the squares that lit up. ${left} ${left === 1 ? "pick" : "picks"} left.`;
  } else if (perfect) {
    status = size === LAST_ROUND ? `You found all ${size}. That's the hardest round here.` : `You found all ${size}.`;
  } else {
    status = `You found ${hits} of ${size}. The outlined ${missed === 1 ? "square is the one" : "squares are the ones"} you missed.`;
  }

  let action = null;
  if (phase === "idle") {
    action = { label: "Try a round", onClick: () => startRound(FIRST_ROUND) };
  } else if (phase === "recall") {
    action = { label: "Show answer", onClick: () => setPhase("done"), quiet: true };
  } else if (phase === "done") {
    const nextSize = perfect ? Math.min(size + 1, LAST_ROUND) : size;
    action = {
      label: nextSize > size ? `Try ${nextSize} squares` : "Try again",
      onClick: () => startRound(nextSize),
    };
  }

  return (
    <div className="hp-board" ref={boardRef}>
      <div
        ref={gridRef}
        className={`hp-grid${intro ? " is-intro" : ""}`}
        role="group"
        aria-label="Practice grid, 5 by 5"
        tabIndex={-1}
      >
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const state = tileState(i);
          return (
            <button
              key={i}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              type="button"
              className={`hp-tile ${state}`}
              style={{ "--d": Math.floor(i / GRID) + (i % GRID) }}
              tabIndex={phase === "recall" && i === cursor ? 0 : -1}
              aria-label={tileLabel(i, state)}
              aria-disabled={state !== "is-live"}
              onClick={() => pick(i)}
              onKeyDown={(e) => moveCursor(e, i)}
            />
          );
        })}
      </div>

      <div className="hp-board-foot">
        <p className="hp-board-status" aria-live="polite">{status}</p>
        {action && (
          <button
            type="button"
            className={`hp-board-btn${action.quiet ? " is-quiet" : ""}`}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
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
  const firstName = user?.name ? user.name.split(" ")[0] : "";

  return (
    <div className="hp-page">
      <style>{styles}</style>

      <nav className="hp-nav" aria-label="Main">
        <div className="hp-wrap hp-nav-inner">
          <div className="hp-logo">
            <MatrixMark />
            <span>MindMetrics</span>
          </div>

          <div className="hp-navlinks">
            <a href="#how-it-works">How it works</a>
            <a href="#skills">Skills measured</a>
            <Link to="/performance">My performances</Link>
            <Link to="/analytics">My analysis</Link>
            <Link to="/about">About us</Link>
          </div>

          <div className="hp-account" ref={menuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  className="hp-menu-btn"
                  aria-label="Account menu"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-controls="hp-account-menu"
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <span className="hp-avatar" aria-hidden="true">{initial}</span>
                  <span className="hp-burger" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </button>

                <div id="hp-account-menu" className={`hp-dropdown ${menuOpen ? "open" : ""}`}>
                  <div className="hp-dropdown-user">
                    <div className="name">{user.name}</div>
                    <div className="email">{user.email}</div>
                  </div>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>My profile</Link>
                  <Link to="/performance" onClick={() => setMenuOpen(false)}>My performances</Link>
                  <Link to="/analytics" onClick={() => setMenuOpen(false)}>My analysis</Link>
                  <Link to="/about" onClick={() => setMenuOpen(false)}>About us</Link>
                  <button type="button" className="hp-logout" onClick={handleLogout}>Log out</button>
                </div>
              </>
            ) : (
              <Link to="/login" className="hp-login">
                Log in<span className="hp-hide-xs">{"\u00A0/ Sign up"}</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="hp-hero">
          <div className="hp-wrap hp-hero-grid">
            <div>
              {firstName && <p className="hp-greeting">Ready, {firstName}?</p>}
              <h1 className="hp-title">
                <span>Your mind,</span> <span>your metrics.</span>
              </h1>
              <p className="hp-lede">
                A series of short games that measure your memory, attention,
                observation, planning, reaction speed, and decision making,
                then turn the results into a clear picture of how your mind
                performs.
              </p>
              <div className="hp-cta-row">
                <button type="button" className="hp-btn" onClick={handleStart} disabled={starting}>
                  {starting ? "Starting…" : user ? "Start assessment" : "Log in to start"}
                </button>
                <a className="hp-textlink" href="#how-it-works">How it works</a>
              </div>
              <p className="hp-note">
                Takes {SESSION_LENGTH}. Your report is ready the moment you finish.
              </p>
            </div>

            <MemoryWarmup />
          </div>
        </section>

        <section className="hp-section hp-rules" id="how-it-works">
          <div className="hp-wrap hp-section-grid">
            <div className="hp-section-head">
              <h2>How the assessment works</h2>
              <p>Six things to know before you start, so your run counts.</p>
            </div>

            <div className="hp-rule-groups">
              {RULE_GROUPS.map((group) => (
                <div className="hp-rule-group" key={group.id}>
                  <h3>{group.heading}</h3>
                  <ul className="hp-rule-list">
                    {RULES.filter((rule) => rule.group === group.id).map((rule) => (
                      <li className={`hp-rule${rule.warn ? " is-warn" : ""}`} key={rule.title}>
                        <h4>{rule.title}</h4>
                        <p>{rule.desc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section hp-skills" id="skills">
          <div className="hp-wrap hp-section-grid">
            <div className="hp-section-head">
              <h2>Six cognitive skills, one score each</h2>
              <p>Every game in the series feeds into one or more of these categories.</p>
            </div>

            <ul className="hp-skill-list">
              {SKILLS.map((skill) => (
                <li className="hp-skill" key={skill.label}>
                  <MatrixGlyph rows={skill.glyph} />
                  <div>
                    <h3>{skill.label}</h3>
                    <p>{skill.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* <section className="hp-final">
          <div className="hp-wrap">
            <h2>Your mind, measured properly.</h2>
            <p>Takes {SESSION_LENGTH}. Results are ready the moment you finish.</p>
            <button type="button" className="hp-btn" onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : user ? "Start assessment" : "Log in to start"}
            </button>
          </div>
        </section> */}
      </main>

      <footer className="hp-footer">
        <div className="hp-wrap">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo">
                <MatrixMark />
                <span>MindMetrics</span>
              </div>
              <p>Short cognitive games and an AI-powered report on how your mind performs.</p>
            </div>
            <div className="hp-footer-col">
              <h2 className="hp-footer-heading">Product</h2>
              <a href="/">Assessments</a>
              <a href="/">Cognitive modules</a>
              <a href="/analytics">Reports</a>
            </div>
            <div className="hp-footer-col">
              <h2 className="hp-footer-heading">Company</h2>
              <Link to="/about">About us</Link>
              <a href="#">Contact us</a>
            </div>
            <div className="hp-footer-col">
              <h2 className="hp-footer-heading">Legal</h2>
              <a href="#">Privacy policy</a>
              <a href="#">Terms of service</a>
              <a href="#">Cookie policy</a>
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
