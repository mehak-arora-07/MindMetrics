import { useState, useRef, useEffect } from "react";

// Drop this file into client/src/pages/AuthPage.jsx
// Wire up handleSubmit to your teammate's /api/auth/register and /api/auth/login routes.

const styles = `
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  background: #0B0F19;
  width: 100%;
  min-height: 100vh;
}

.auth-wrap {
  min-height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
}

.auth-brand {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
}

.auth-brand canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.auth-brand-content {
  position: relative;
  z-index: 2;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 30px;
  font-weight: 700;
  color: #E5E7EB;
  letter-spacing: -0.5px;
}

.auth-wordmark {
  color: #E5E7EB;
  transition: background-position 0.5s ease, color 0.1s ease;
  background-image: linear-gradient(90deg, #34D399, #3B82F6, #A78BFA, #F59E0B, #F87171);
  background-size: 300% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  cursor: default;
}

.auth-wordmark:hover {
  color: transparent;
  background-position: 0% 0;
}

.auth-logo-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #34D399;
  flex-shrink: 0;
}

.auth-tagline {
  margin-top: auto;
  padding-top: 200px;
  position: relative;
  z-index: 2;
}

.auth-tagline h1 {
  font-size: 34px;
  font-weight: 600;
  color: #E5E7EB;
  line-height: 1.25;
  margin: 0 0 12px;
}

.auth-tagline span {
  color: #34D399;
}

.auth-tagline p {
  font-size: 14px;
  color: #8B93A7;
  line-height: 1.6;
  max-width: 380px;
  margin: 0;
}

.auth-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.auth-card {
  width: 100%;
  max-width: 320px;
}

.auth-card-topbar {
  height: 4px;
  border-radius: 4px;
  margin-bottom: 28px;
  background: linear-gradient(90deg, #34D399, #3B82F6, #A78BFA, #F59E0B, #F87171);
}

.auth-toggle {
  display: flex;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
}

.auth-toggle button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #8B93A7;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-toggle button.active {
  background: #34D399;
  color: #05221A;
}

.auth-card h2 {
  color: #E5E7EB;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px;
}

.auth-card .sub {
  color: #8B93A7;
  font-size: 13px;
  margin: 0 0 22px;
}

.auth-field {
  margin-bottom: 16px;
}

.auth-field label {
  display: block;
  font-size: 13px;
  color: #8B93A7;
  margin-bottom: 6px;
}

.auth-field input {
  width: 100%;
  box-sizing: border-box;
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 11px 14px;
  color: #E5E7EB;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.auth-field input:focus {
  border-color: var(--focus-color, #34D399);
  box-shadow: 0 0 0 3px var(--focus-glow, rgba(52, 211, 153, 0.15));
}

.auth-field input::placeholder {
  color: #4B5468;
}

.auth-error {
  background: rgba(216, 90, 48, 0.1);
  border: 1px solid rgba(216, 90, 48, 0.3);
  color: #F0997B;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.auth-submit {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.15s ease;
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  font-size: 13px;
  color: #8B93A7;
  margin-top: 20px;
}

.auth-switch button {
  background: none;
  border: none;
  color: #34D399;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 860px) {
  .auth-wrap { grid-template-columns: 1fr; }
  .auth-brand { display: none; }
}
`;

// Six nodes = your six cognitive skills. Each orbits the core at its own
// radius/speed; pulses travel inward along the spokes like data being
// assessed. This is the actual mechanic of the product, not decoration.
const SKILLS = [
  { label: "Memory", color: "52, 211, 153" },    // mint
  { label: "Attention", color: "59, 130, 246" }, // blue
  { label: "Observation", color: "167, 139, 250" }, // purple
  { label: "Planning", color: "59, 130, 246" },  // blue
  { label: "Reaction", color: "245, 158, 11" },  // amber
  { label: "Decision", color: "248, 113, 113" }, // coral
];

function SkillOrbit() {
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
      cy = height * 0.42;
      baseRadius = Math.min(width, height) * 0.34;
    }

    function drawOrbitRing(radiusX, radiusY, color) {
      ctx.strokeStyle = `rgba(${color}, 0.14)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawCore(pulse) {
      const r = 11 + pulse * 5;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 5);
      grad.addColorStop(0, `rgba(52, 211, 153, ${0.55 + pulse * 0.2})`);
      grad.addColorStop(1, "rgba(52, 211, 153, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(229, 231, 235, 0.95)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function tick() {
      t += 0.006;
      ctx.clearRect(0, 0, width, height);

      const corePulse = (Math.sin(t * 2) + 1) / 2;

      SKILLS.forEach((skill, i) => {
        const radius = baseRadius * (1 + 0.16 * (i % 3) / 2);
        drawOrbitRing(radius, radius * 0.55, skill.color);
      });

      drawCore(corePulse);

      SKILLS.forEach((skill, i) => {
        const angle = t * (0.3 + i * 0.025) + (i * Math.PI * 2) / SKILLS.length;
        const radius = baseRadius * (1 + 0.16 * (i % 3) / 2);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.55;

        const lineGrad = ctx.createLinearGradient(x, y, cx, cy);
        lineGrad.addColorStop(0, `rgba(${skill.color}, 0.4)`);
        lineGrad.addColorStop(1, `rgba(${skill.color}, 0.04)`);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        const travel = (t * 0.8 + i * 0.6) % 1;
        const px = x + (cx - x) * travel;
        const py = y + (cy - y) * travel;
        ctx.fillStyle = `rgba(${skill.color}, ${0.95 * (1 - travel * 0.5)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${skill.color}, 0.95)`;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${skill.color}, 0.18)`;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "13px Inter, sans-serif";
        ctx.fillStyle = "rgba(139, 147, 167, 0.85)";
        ctx.textAlign = "center";
        ctx.fillText(skill.label, x, y + 26);
      });

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

  return <canvas ref={canvasRef} />;
}

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      if (mode === "login") {
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      } else {
        setMode("login");
        setForm({ name: "", email: form.email, password: "" });
      }
    } catch (err) {
      setError("Could not reach server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <style>{styles}</style>

      <div className="auth-brand">
        <SkillOrbit />
        <div className="auth-brand-content">
          <div className="auth-logo">
            <span className="auth-logo-dot" />
            <span className="auth-wordmark">MindMetrics</span>
          </div>
        </div>
        <div className="auth-tagline">
          <h1>
            Understand how <br /> your <span>mind</span> really works.
          </h1>
          <p>
            Interactive cognitive assessments powered by AI to reveal your
            strengths, improve performance, and unlock your potential.
          </p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-topbar" />
          <div className="auth-toggle">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Log in
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="sub">
            {mode === "login"
              ? "Log in to continue your cognitive assessment journey."
              : "Start tracking your cognitive performance today."}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="auth-field">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Jainy Shah"
                  value={form.name}
                  onChange={handleChange}
                  style={{ "--focus-color": "#A78BFA", "--focus-glow": "rgba(167, 139, 250, 0.15)" }}
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                style={{ "--focus-color": "#3B82F6", "--focus-glow": "rgba(59, 130, 246, 0.15)" }}
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={handleChange}
                style={{ "--focus-color": "#F87171", "--focus-glow": "rgba(248, 113, 113, 0.15)" }}
                required
              />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Log in"
                : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button type="button" onClick={() => setMode("register")}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
