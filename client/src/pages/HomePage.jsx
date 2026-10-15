import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getUser, clearSession, startAssessment } from "../utils/session";
import { clearAssessmentCompleted } from "../utils/session";
import { startAssessmentFlow } from "../utils/assessmentFlow";
import { FaBrain, FaPuzzlePiece, FaBolt, FaBalanceScale, FaRegEye } from "react-icons/fa";
import { GoGoal } from "react-icons/go";

/* ------------------------------------------------------------------ */
/*  Theme: midnight ink + bone text, six skill colours as the palette  */
/* ------------------------------------------------------------------ */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap');

:root {
  --ink: #090C16; --panel: #10152A; --line: #1E2540; --bone: #ECE8DC; --mute: #8D93AB;
  --mint: #34D399; --blue: #3B82F6; --violet: #A78BFA; --amber: #F59E0B; --coral: #F87171;
  --display: 'Bricolage Grotesque', 'Segoe UI', sans-serif;
  --body: 'Instrument Sans', -apple-system, sans-serif;
}
* { box-sizing: border-box; }
html, body, #root { margin: 0 !important; padding: 0 !important; background: var(--ink); width: 100% !important; max-width: none !important; border: none !important; text-align: left !important; }

.hp-page { width: 100%; background: var(--ink); font-family: var(--body); color: var(--bone); position: relative; overflow-x: hidden; }
.hp-page::before { /* faint graph-paper grid, like the voxel floor */
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: linear-gradient(rgba(141,147,171,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(141,147,171,.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 90% 70% at 70% 20%, #000 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 90% 70% at 70% 20%, #000 20%, transparent 75%);
}
.hp-page a:focus-visible, .hp-page button:focus-visible { outline: 2px solid var(--mint); outline-offset: 3px; }

/* ---------- Rolling text ---------- */
.rt { display: inline-block; white-space: nowrap; }
.rt-c { display: inline-block; overflow: hidden; height: 1.08em; line-height: 1.08em; vertical-align: top;
  animation: rt-in .9s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 45ms + var(--d, 0ms)); }
.rt-c > span { display: inline-block; position: relative; line-height: inherit;
  transition: transform .55s cubic-bezier(.7,0,.15,1); transition-delay: calc(var(--i) * 28ms); }
.rt-c > span::after { content: attr(data-c); position: absolute; left: 0; top: 100%; color: var(--roll, var(--mint)); }
.rt:hover .rt-c > span, a:hover > .rt .rt-c > span, button:hover .rt .rt-c > span { transform: translateY(-100%); }
@keyframes rt-in { from { transform: translateY(110%) rotate(6deg); opacity: 0; } to { transform: none; opacity: 1; } }

/* ---------- Nav ---------- */
.hp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 16px 40px; background: rgba(9,12,22,.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.hp-logo { display: flex; align-items: center; gap: 10px; font-family: var(--display); font-size: 22px; font-weight: 800; letter-spacing: -.5px; }
.hp-logo-mark { width: 18px; height: 18px; display: grid; grid-template: 1fr 1fr / 1fr 1fr; gap: 2px; }
.hp-logo-mark i { border-radius: 2px; }
.hp-logo-mark i:nth-child(1) { background: var(--mint); } .hp-logo-mark i:nth-child(2) { background: var(--blue); }
.hp-logo-mark i:nth-child(3) { background: var(--violet); } .hp-logo-mark i:nth-child(4) { background: var(--amber); }
.hp-wordmark span { color: var(--mint); }
.hp-nav-links { display: flex; gap: 28px; margin: 0 auto; }
.hp-nav-links a { color: var(--mute); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .15s; }
.hp-nav-links a:hover { color: var(--bone); }
.hp-nav-right { position: relative; }
.hp-nav-cta, .hp-menu-btn { display: inline-flex; align-items: center; gap: 10px; background: transparent; border: 1px solid var(--line); color: var(--bone); font: 600 13px var(--body); padding: 9px 18px; border-radius: 8px; cursor: pointer; transition: border-color .15s; }
.hp-nav-cta:hover, .hp-menu-btn:hover { border-color: var(--mint); }
.hp-menu-btn { padding: 5px 12px 5px 5px; }
.hp-menu-avatar { width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, var(--mint), var(--blue)); display: grid; place-items: center; font: 800 13px var(--display); color: #05221A; }
.hp-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 8px; box-shadow: 0 16px 40px rgba(0,0,0,.5); opacity: 0; transform: translateY(-6px); pointer-events: none; transition: opacity .18s, transform .18s; }
.hp-dropdown.open { opacity: 1; transform: none; pointer-events: auto; }
.hp-dropdown-user { padding: 10px 12px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
.hp-dropdown-user .name { font-size: 13px; font-weight: 600; } .hp-dropdown-user .email { color: var(--mute); font-size: 11px; margin-top: 2px; }
.hp-dropdown a, .hp-dropdown button { display: block; width: 100%; text-align: left; background: none; border: 0; color: #C7CCDB; font: 500 13.5px var(--body); padding: 10px 12px; border-radius: 6px; cursor: pointer; text-decoration: none; }
.hp-dropdown a:hover, .hp-dropdown button:hover { background: rgba(255,255,255,.05); color: var(--bone); }
.hp-dropdown .logout { color: var(--coral); }

/* ---------- Hero ---------- */
.hp-hero { position: relative; z-index: 2; min-height: 100vh; display: flex; align-items: center; padding: 110px 40px 60px; }
.hp-hero-inner { width: 100%; max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 48px; align-items: center; }
.hp-hello { color: var(--mint); font: 500 17px var(--body); margin: 0 0 14px; }
.hp-hero h1 { font-family: var(--display); font-weight: 800; font-size: clamp(54px, 8.4vw, 112px); line-height: .98; letter-spacing: -.045em; margin: 0 0 28px; color: var(--bone); }
.hp-hero h1 .line { display: block; }
.hp-hero h1 .line.two { padding-left: .55em; font-weight: 500; font-style: italic; letter-spacing: -.035em; }
.hp-hero p.lead { font-size: 17px; line-height: 1.7; color: var(--mute); max-width: 470px; margin: 0 0 22px; }
.hp-hero-meta { display: flex; gap: 22px; flex-wrap: wrap; color: var(--mute); font-size: 13.5px; margin: 0 0 30px; }
.hp-hero-meta b { color: var(--bone); font-weight: 600; }
.hp-hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
.hp-btn-primary { background: var(--mint); color: #04211A; border: 0; border-radius: 8px; padding: 15px 28px; font: 700 15px var(--body); cursor: pointer; box-shadow: 4px 4px 0 var(--blue); transition: transform .12s, box-shadow .12s; }
.hp-btn-primary:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 var(--blue); }
.hp-btn-primary:active { transform: translate(3px,3px); box-shadow: 1px 1px 0 var(--blue); }
.hp-btn-primary:disabled { opacity: .6; cursor: wait; }
.hp-btn-secondary { background: transparent; color: var(--bone); border: 1px solid var(--line); border-radius: 8px; padding: 15px 28px; font: 600 15px var(--body); cursor: pointer; transition: border-color .15s; }
.hp-btn-secondary:hover { border-color: var(--violet); }

/* ---------- Voxel stage ---------- */
.vx { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: 0 30px 80px -30px rgba(52,211,153,.25), 0 0 0 1px rgba(255,255,255,.02) inset; }
.vx-stage { height: 480px; position: relative; }
.vx-canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
.vx-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-top: 1px solid var(--line); background: rgba(9,12,22,.55); }
.vx-swatches { display: flex; gap: 8px; }
.vx-sw { width: 24px; height: 24px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform .12s; }
.vx-sw:hover { transform: translateY(-2px); }
.vx-sw.on { border-color: var(--bone); transform: translateY(-3px); }
.vx-tools { display: flex; gap: 6px; }
.vx-tool { background: transparent; color: var(--mute); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; font: 600 12.5px var(--body); cursor: pointer; }
.vx-tool:hover { color: var(--bone); border-color: #2c3560; }
.vx-tool.on { background: var(--bone); color: var(--ink); border-color: var(--bone); }
.vx-hint { position: absolute; left: 14px; top: 12px; right: 14px; color: var(--mute); font-size: 12.5px; pointer-events: none; display: flex; justify-content: space-between; gap: 10px; }
.vx-count { color: var(--bone); font-weight: 600; }
.vx-corner { position: absolute; width: 14px; height: 14px; border: 2px solid var(--mint); pointer-events: none; opacity: .7; }
.vx-corner.tl { left: 8px; top: 34px; border-right: 0; border-bottom: 0; } .vx-corner.br { right: 8px; bottom: 62px; border-left: 0; border-top: 0; }

/* ---------- Sections ---------- */
.hp-section { position: relative; z-index: 2; padding: 90px 40px; max-width: 1240px; margin: 0 auto; }
.hp-section-head { max-width: 560px; margin: 0 0 44px; }
.hp-section-head h2 { font-family: var(--display); font-size: clamp(30px, 4vw, 46px); font-weight: 800; letter-spacing: -.035em; line-height: 1.05; margin: 0 0 12px; }
.hp-section-head p { color: var(--mute); font-size: 16px; line-height: 1.6; margin: 0; }
.hp-rules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0; border-top: 1px solid var(--line); }
.hp-rule { display: grid; grid-template-columns: 10px 1fr; gap: 18px; padding: 26px 24px 26px 0; border-bottom: 1px solid var(--line); }
.hp-rule-pip { width: 10px; height: 10px; border-radius: 2px; background: var(--mint); margin-top: 6px; }
.hp-rule.warn .hp-rule-pip { background: var(--coral); }
.hp-rule h4 { font-family: var(--display); font-size: 18px; font-weight: 500; margin: 0 0 6px; }
.hp-rule p { color: var(--mute); font-size: 14px; line-height: 1.6; margin: 0; max-width: 380px; }

.hp-skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.hp-skill { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 10px 10px 10px 2px; padding: 22px 18px 20px; overflow: hidden; transition: border-color .2s; }
.hp-skill::before { content: ""; position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: var(--accent); transform: scaleX(.18); transform-origin: left; transition: transform .4s cubic-bezier(.7,0,.15,1); }
.hp-skill:hover { border-color: var(--accent); }
.hp-skill:hover::before { transform: scaleX(1); }
.hp-skill-ico { font-size: 22px; color: var(--accent); margin-bottom: 26px; display: block; }
.hp-skill h4 { font-family: var(--display); font-size: 18px; font-weight: 500; margin: 0 0 4px; }
.hp-skill p { color: var(--mute); font-size: 13px; line-height: 1.5; margin: 0; }

/* ---------- Footer ---------- */
.hp-footer { position: relative; z-index: 2; border-top: 1px solid var(--line); padding: 56px 40px 28px; }
.hp-footer-inner { max-width: 1240px; margin: 0 auto; }
.hp-footer-top { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 40px; margin-bottom: 44px; }
.hp-footer-brand p { color: var(--mute); font-size: 13.5px; line-height: 1.6; max-width: 290px; margin: 14px 0 0; }
.hp-footer-col h5 { font: 600 14px var(--display); margin: 0 0 14px; }
.hp-footer-col a { display: block; color: var(--mute); font-size: 14px; text-decoration: none; margin-bottom: 11px; }
.hp-footer-col a:hover { color: var(--mint); }
.hp-footer-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 22px; border-top: 1px solid var(--line); color: #5B6380; font-size: 13px; }
.hp-footer-bottom a { color: #5B6380; text-decoration: none; } .hp-footer-bottom a:hover { color: var(--mute); }

@media (max-width: 980px) {
  .hp-hero-inner { grid-template-columns: 1fr; }
  .vx-stage { height: 400px; }
  .hp-nav-links { display: none; }
}
@media (max-width: 640px) {
  .hp-nav { padding: 14px 20px; } .hp-hero { padding: 96px 20px 40px; } .hp-section { padding: 60px 20px; } .hp-footer { padding: 48px 20px 24px; }
  .vx-stage { height: 340px; } .hp-footer-top { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .rt-c { animation: none; } .rt-c > span, .hp-skill::before { transition: none; }
}
`;

const SKILLS = [
  { label: "Memory", hex: "#34D399", icon: <FaBrain />, desc: "Recall and working memory" },
  { label: "Attention", hex: "#3B82F6", icon: <GoGoal />, desc: "Focus and sustained attention" },
  { label: "Observation", hex: "#A78BFA", icon: <FaRegEye />, desc: "Visual perception and awareness" },
  { label: "Planning", hex: "#38BDF8", icon: <FaPuzzlePiece />, desc: "Strategy and problem solving" },
  { label: "Reaction", hex: "#F59E0B", icon: <FaBolt />, desc: "Speed and response time" },
  { label: "Decision Making", hex: "#F87171", icon: <FaBalanceScale />, desc: "Choices under uncertainty" },
];

const RULES = [
  { title: "One continuous assessment", desc: "A series of short cognitive games runs back to back automatically. No need to navigate between them.", warn: false },
  { title: "About 25–35 minutes total", desc: "Each game takes a few minutes. Plan for roughly half an hour, depending on your pace.", warn: false },
  { title: "Stay on this tab", desc: "Don't switch away, refresh, or minimize for long. The games use short timers that keep running.", warn: false },
  { title: "Don't close the browser or lose connection", desc: "If you close the tab, go offline, or log out partway, that attempt is discarded and you start fresh next time.", warn: true },
  { title: "One attempt at a time", desc: "Only one assessment can be in progress. Finish or abandon the current one before starting another.", warn: false },
  { title: "Instant results", desc: "The moment you finish the final game, your full behavioral analysis report is generated.", warn: false },
];

/* ------------------------------------------------------------------ */
/*  RollText: every character is its own slot; on hover each one rolls */
/*  up and its twin (in --roll colour) rolls in, staggered left→right. */
/* ------------------------------------------------------------------ */
function RollText({ text, roll = "var(--mint)", delay = 0 }) {
  return (
    <span className="rt" aria-label={text} style={{ "--roll": roll }}>
      {[...text].map((ch, i) => {
        const c = ch === " " ? "\u00A0" : ch;
        return (
          <span className="rt-c" key={i} aria-hidden="true" style={{ "--i": i, "--d": `${delay}ms` }}>
            <span data-c={c}>{c}</span>
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  VoxelPainter: Three.js grid, ghost cube, place / erase, orbit cam  */
/* ------------------------------------------------------------------ */
const PALETTE = ["#34D399", "#3B82F6", "#A78BFA", "#F59E0B", "#F87171", "#ECE8DC"];
const GRID = 10; // 10 x 10 floor, max height 8

// A small starter sculpture so the stage never looks empty: [x, y, z, colorIdx]
const SEED = [
  [-1,0,-1,0],[0,0,-1,0],[1,0,-1,1],[-1,0,0,0],[0,0,0,1],[1,0,0,2],[-1,0,1,1],[0,0,1,2],[1,0,1,2],
  [0,1,0,3],[-1,1,-1,0],[1,1,1,2],[0,2,0,4],
];

function VoxelPainter() {
  const mountRef = useRef(null);
  const api = useRef({});
  const [color, setColor] = useState(0);
  const [mode, setMode] = useState("paint");
  const [count, setCount] = useState(SEED.length);
  const stateRef = useRef({ color: 0, mode: "paint" });
  stateRef.current = { color, mode };

  useEffect(() => {
    const mount = mountRef.current;
    const w = () => mount.clientWidth, h = () => mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w(), h(), false);
    renderer.domElement.className = "vx-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w() / h(), 0.1, 100);
    camera.position.set(11, 10, 13);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;
    controls.target.set(0, 1.5, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(6, 14, 8);
    scene.add(sun);

    scene.add(new THREE.GridHelper(GRID, GRID, 0x34d399, 0x1e2540));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(ground);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x090c16, transparent: true, opacity: 0.55 });
    const voxels = [];
    const key = (x, y, z) => `${x},${y},${z}`;
    const taken = new Map();

    function add(x, y, z, ci) {
      if (taken.has(key(x, y, z))) return;
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: PALETTE[ci], roughness: 0.55, metalness: 0.05 }));
      m.position.set(x + 0.5, y + 0.5, z + 0.5);
      m.add(new THREE.LineSegments(edgeGeo, edgeMat));
      m.scale.setScalar(0.01);
      m.userData = { g: [x, y, z], t: 0 }; // t drives the pop-in
      scene.add(m); voxels.push(m); taken.set(key(x, y, z), m);
      setCount(voxels.length);
    }
    function remove(m) {
      scene.remove(m); m.material.dispose();
      voxels.splice(voxels.indexOf(m), 1);
      taken.delete(key(...m.userData.g));
      setCount(voxels.length);
    }
    SEED.forEach(([x, y, z, c]) => add(x, y, z, c));
    api.current.clear = () => { [...voxels].forEach(remove); };
    api.current.reset = () => { [...voxels].forEach(remove); SEED.forEach(([x, y, z, c]) => add(x, y, z, c)); };

    // Ghost preview cube
    const ghost = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PALETTE[0], transparent: true, opacity: 0.4 }));
    ghost.visible = false; scene.add(ghost);

    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    function pick(e) {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects([...voxels, ground], false)[0];
      if (!hit) return null;
      if (hit.object === ground) {
        const x = Math.floor(hit.point.x + GRID / 2) - GRID / 2, z = Math.floor(hit.point.z + GRID / 2) - GRID / 2;
        return { cell: [x, 0, z], voxel: null };
      }
      const n = hit.face.normal, [gx, gy, gz] = hit.object.userData.g;
      return { cell: [gx + Math.round(n.x), gy + Math.round(n.y), gz + Math.round(n.z)], voxel: hit.object };
    }
    const inBounds = ([x, y, z]) => x >= -GRID / 2 && x < GRID / 2 && z >= -GRID / 2 && z < GRID / 2 && y >= 0 && y < 8;

    let idle;
    const wake = () => { controls.autoRotate = false; clearTimeout(idle); idle = setTimeout(() => (controls.autoRotate = true), 4000); };

    function onMove(e) {
      const p = pick(e), { mode, color } = stateRef.current;
      const erase = mode === "erase" || e.shiftKey;
      if (!p || (erase && !p.voxel) || (!erase && !inBounds(p.cell))) { ghost.visible = false; return; }
      ghost.visible = true;
      if (erase) { ghost.position.set(...p.voxel.userData.g.map((v) => v + 0.5)); ghost.material.color.set(0xf87171); ghost.scale.setScalar(1.06); }
      else { ghost.position.set(...p.cell.map((v) => v + 0.5)); ghost.material.color.set(PALETTE[color]); ghost.scale.setScalar(1); }
    }
    let down = null;
    const onDown = (e) => { down = [e.clientX, e.clientY]; wake(); };
    function onUp(e) {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; // it was a drag (orbit)
      const p = pick(e), { mode, color } = stateRef.current;
      if (!p) return;
      if (mode === "erase" || e.shiftKey) { if (p.voxel) remove(p.voxel); }
      else if (inBounds(p.cell)) add(...p.cell, color);
      onMove(e);
    }
    const onLeave = () => (ghost.visible = false);
    const el = renderer.domElement;
    el.addEventListener("pointermove", onMove); el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp); el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", wake, { passive: true });

    const ro = new ResizeObserver(() => { renderer.setSize(w(), h(), false); camera.aspect = w() / h(); camera.updateProjectionMatrix(); });
    ro.observe(mount);

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      voxels.forEach((m) => { if (m.userData.t < 1) { m.userData.t = Math.min(1, m.userData.t + 0.07); const t = m.userData.t; m.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.14 * (t < 1) - (1 - t) * 0.99 * (1 - t)); } else m.scale.setScalar(1); });
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf); clearTimeout(idle); ro.disconnect(); controls.dispose();
      el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp); el.removeEventListener("pointerleave", onLeave);
      voxels.forEach((m) => m.material.dispose()); geo.dispose(); edgeGeo.dispose(); edgeMat.dispose(); renderer.dispose();
      mount.removeChild(el);
    };
  }, []);

  return (
    <div className="vx">
      <div ref={mountRef} className="vx-stage" />
      <div className="vx-corner tl" /><div className="vx-corner br" />
      <div className="vx-hint">
        <span>Click to build · Shift-click to erase · Drag to orbit</span>
        <span><span className="vx-count">{count}</span> blocks</span>
      </div>
      <div className="vx-bar">
        <div className="vx-swatches" role="radiogroup" aria-label="Block colour">
          {PALETTE.map((c, i) => (
            <button key={c} type="button" role="radio" aria-checked={color === i} aria-label={`Colour ${i + 1}`} className={`vx-sw ${color === i ? "on" : ""}`} style={{ background: c }} onClick={() => { setColor(i); setMode("paint"); }} />
          ))}
        </div>
        <div className="vx-tools">
          <button type="button" className={`vx-tool ${mode === "paint" ? "on" : ""}`} onClick={() => setMode("paint")}>Build</button>
          <button type="button" className={`vx-tool ${mode === "erase" ? "on" : ""}`} onClick={() => setMode("erase")}>Erase</button>
          <button type="button" className="vx-tool" onClick={() => api.current.reset?.()}>Reset</button>
          <button type="button" className="vx-tool" onClick={() => api.current.clear?.()}>Clear</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleStart() {
    if (!user) { navigate("/login"); return; }
    setStarting(true);
    try {
      clearAssessmentCompleted();
      const newAssessmentId = await startAssessment();
      startAssessmentFlow();
      console.log("New assessment created:", newAssessmentId);
      console.log("Stored assessment ID:", localStorage.getItem("assessmentId"));
      navigate("/play/memory-matrix");
    } catch (err) {
      console.error("Could not start assessment:", err);
      alert("Couldn't start the assessment. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  function handleLogout() { clearSession(); navigate("/login"); }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";
  const Logo = () => (
    <div className="hp-logo">
      <span className="hp-logo-mark"><i /><i /><i /><i /></span>
      <span className="hp-wordmark">Mind<span>Metrics</span></span>
    </div>
  );

  return (
    <div className="hp-page">
      <style>{styles}</style>

      <nav className="hp-nav">
        <Logo />
        <div className="hp-nav-links">
          <a href="#how-it-works"><RollText text="How it works" /></a>
          <a href="#skills"><RollText text="Skills measured" roll="var(--violet)" /></a>
          <Link to="/performance"><RollText text="My performances" roll="var(--amber)" /></Link>
          <Link to="/analytics"><RollText text="My analysis" roll="var(--blue)" /></Link>
          <Link to="/about"><RollText text="About us" roll="var(--coral)" /></Link>
        </div>
        <div className="hp-nav-right" ref={menuRef}>
          {user ? (
            <>
              <button className="hp-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <span className="hp-menu-avatar">{initial}</span>
                <span>Menu</span>
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
            <Link to="/login"><button className="hp-nav-cta" type="button"><RollText text="Log in / Sign up" /></button></Link>
          )}
        </div>
      </nav>

      <section className="hp-hero">
        <div className="hp-hero-inner">
          <div>
            {user && <p className="hp-hello">Ready, {user.name.split(" ")[0]}?</p>}
            <h1 aria-label="Your mind. Your metrics.">
              <span className="line one"><RollText text="Your mind." roll="var(--mint)" /></span>
              <span className="line two"><RollText text="Your metrics." roll="var(--violet)" delay={350} /></span>
            </h1>
            <p className="lead">
              Short interactive games measure your memory, attention, observation, planning, reaction speed and decision making, then turn the results into a clear picture of how your mind performs.
            </p>
            <div className="hp-hero-meta">
              <span><b>6</b> skills tracked</span>
              <span><b>~25–35 min</b> to complete</span>
              <span><b>Instant</b> report</span>
            </div>
            <div className="hp-hero-ctas">
              <button className="hp-btn-primary" onClick={handleStart} disabled={starting}>
                {starting ? "Starting…" : <RollText text="Start assessment" roll="#04211A" />}
              </button>
              <a href="#how-it-works" style={{ textDecoration: "none" }}>
                <button className="hp-btn-secondary" type="button"><RollText text="How it works" roll="var(--violet)" /></button>
              </a>
            </div>
          </div>

          <VoxelPainter />
        </div>
      </section>

      <section className="hp-section" id="how-it-works">
        <div className="hp-section-head">
          <h2>How the assessment works</h2>
          <p>Read these before you start so your run counts.</p>
        </div>
        <div className="hp-rules-grid">
          {RULES.map((rule) => (
            <div className={`hp-rule ${rule.warn ? "warn" : ""}`} key={rule.title}>
              <span className="hp-rule-pip" />
              <div><h4>{rule.title}</h4><p>{rule.desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="hp-section" id="skills">
        <div className="hp-section-head">
          <h2>Six skills, one score each</h2>
          <p>Every game in the series feeds one or more of these.</p>
        </div>
        <div className="hp-skills-grid">
          {SKILLS.map((s) => (
            <div className="hp-skill" key={s.label} style={{ "--accent": s.hex }}>
              <span className="hp-skill-ico">{s.icon}</span>
              <h4>{s.label}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <Logo />
              <p>Interactive cognitive assessments powered by AI to reveal your strengths, improve performance, and unlock your potential.</p>
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
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}