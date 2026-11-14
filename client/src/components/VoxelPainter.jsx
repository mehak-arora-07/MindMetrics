import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Self-contained styles (dark "night stage" in both themes).
const vxCss = `
.vx { --ink: #090C16; --panel: #10152A; --line: #1E2540; --bone: #ECE8DC; --mute: #8D93AB; --mint: #2FF3B0; position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; box-shadow: 0 30px 80px -30px rgba(47,243,176,.25), 0 0 0 1px rgba(255,255,255,.02) inset; font-family: 'Inter', -apple-system, sans-serif; }
.vx-stage { position: relative; }
.vx-canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
.vx-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border-top: 1px solid var(--line); background: rgba(9,12,22,.55); }
.vx-swatches { display: flex; gap: 8px; }
.vx-sw { width: 24px; height: 24px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform .12s; }
.vx-sw:hover { transform: translateY(-2px); }
.vx-sw.on { border-color: var(--bone); transform: translateY(-3px); }
.vx-tools { display: flex; gap: 6px; }
.vx-tool { background: transparent; color: var(--mute); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; font: 600 12.5px 'Inter', -apple-system, sans-serif; cursor: pointer; }
.vx-tool:hover { color: var(--bone); border-color: #2c3560; }
.vx-tool.on { background: var(--bone); color: var(--ink); border-color: var(--bone); }
.vx-hint { position: absolute; left: 14px; top: 12px; right: 14px; color: var(--mute); font-size: 12.5px; pointer-events: none; display: flex; justify-content: space-between; gap: 10px; }
.vx-count { color: var(--bone); font-weight: 600; }
.vx-corner { position: absolute; width: 14px; height: 14px; border: 2px solid var(--mint); pointer-events: none; opacity: .7; }
.vx-corner.tl { left: 8px; top: 34px; border-right: 0; border-bottom: 0; } .vx-corner.br { right: 8px; bottom: 62px; border-left: 0; border-top: 0; }
`;

const PALETTE = ["#2FF3B0", "#4F9CFF", "#B794FF", "#FFB020", "#FF7A7A", "#FFF6E0"];
const GRID = 10; // 10 x 10 floor, max height 8

// A small starter sculpture so the stage never looks empty: [x, y, z, colorIdx]
const SEED = [
  [-1,0,-1,0],[0,0,-1,0],[1,0,-1,1],[-1,0,0,0],[0,0,0,1],[1,0,0,2],[-1,0,1,1],[0,0,1,2],[1,0,1,2],
  [0,1,0,3],[-1,1,-1,0],[1,1,1,2],[0,2,0,4],
];

export default function VoxelPainter({ stageHeight = 480 }) {
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(6, 14, 8);
    scene.add(sun);

    scene.add(new THREE.GridHelper(GRID, GRID, 0x2ff3b0, 0x2a3358));
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
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: PALETTE[ci], emissive: PALETTE[ci], emissiveIntensity: 0.22, roughness: 0.4, metalness: 0.05 }));
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
      if (erase) { ghost.position.set(...p.voxel.userData.g.map((v) => v + 0.5)); ghost.material.color.set(0xff7a7a); ghost.scale.setScalar(1.06); }
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
      <style>{vxCss}</style>
      <div ref={mountRef} className="vx-stage" style={{ height: stageHeight }} />
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
