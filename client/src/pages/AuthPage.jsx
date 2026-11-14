import { useState } from "react";
import { themeCss } from "../utils/theme";
import VoxelPainter from "../components/VoxelPainter";
import ThemeToggle from "../components/ThemeToggle";


const styles = `
${themeCss}
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0 !important;
  padding: 0 !important;
  background: var(--ink);
  width: 100% !important;
  max-width: none !important;
  min-height: 100vh;
  border: none !important;
  text-align: left !important;
}

.auth-wrap {
  min-height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: var(--ink);
  font-family: 'Inter', -apple-system, sans-serif;
}

.auth-brand {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 28px;
  padding: 48px;
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
  color: var(--bone);
  letter-spacing: -0.5px;
}

.auth-wordmark {
  color: var(--bone);
  transition: background-position 0.5s ease, color 0.1s ease;
  background-image: linear-gradient(90deg, var(--mint), var(--blue), var(--violet), var(--amber), var(--coral));
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
  background: var(--mint);
  flex-shrink: 0;
}

.auth-tagline {
  position: relative;
  z-index: 2;
}

.auth-stage {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 560px;
}

.auth-tagline h1 {
  font-size: 34px;
  font-weight: 600;
  color: var(--bone);
  line-height: 1.25;
  margin: 0 0 12px;
}

.auth-tagline span {
  color: var(--mint);
}

.auth-tagline p {
  font-size: 14px;
  color: var(--mute);
  line-height: 1.6;
  max-width: 380px;
  margin: 0;
}

.auth-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.auth-theme { position: absolute; top: 20px; right: 24px; }

.auth-card {
  width: 100%;
  max-width: 320px;
}

.auth-card-topbar {
  height: 4px;
  border-radius: 4px;
  margin-bottom: 28px;
  background: linear-gradient(90deg, var(--mint), var(--blue), var(--violet), var(--amber), var(--coral));
}

.auth-toggle {
  display: flex;
  background: var(--panel);
  border: 1px solid var(--line);
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
  color: var(--mute);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-toggle button.active {
  background: var(--mint);
  color: var(--on-accent);
}

.auth-card h2 {
  color: var(--bone);
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px;
}

.auth-card .sub {
  color: var(--mute);
  font-size: 13px;
  margin: 0 0 22px;
}

.auth-field {
  margin-bottom: 16px;
}

.auth-field label {
  display: block;
  font-size: 13px;
  color: var(--mute);
  margin-bottom: 6px;
}

.auth-field input {
  width: 100%;
  box-sizing: border-box;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 11px 14px;
  color: var(--bone);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.auth-field input:focus {
  border-color: var(--focus-color, var(--mint));
  box-shadow: 0 0 0 3px var(--focus-glow, rgba(var(--mint-rgb), 0.15));
}

.auth-field input::placeholder {
  color: var(--faint);
}

.auth-error {
  background: rgba(var(--coral-rgb), 0.1);
  border: 1px solid rgba(var(--coral-rgb), 0.3);
  color: var(--coral);
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
  background: var(--mint);
  color: var(--on-accent);
  box-shadow: 3px 3px 0 var(--blue);
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
  color: var(--mute);
  margin-top: 20px;
}

.auth-switch button {
  background: none;
  border: none;
  color: var(--mint);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 860px) {
  .auth-wrap { grid-template-columns: 1fr; }
  .auth-brand { display: none; }
}

@media (max-width: 480px) {
  .auth-panel { padding: 28px 20px; }
  .auth-card { max-width: 100%; }
  /* 16px prevents iOS Safari from auto-zooming the page on input focus */
  .auth-field input { font-size: 16px; }
}
`;

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
     const passwordPattern = /^[A-Za-z0-9]{6,}$/;

  if (!passwordPattern.test(form.password)) {
    setError(
      "Password must be at least 6 characters and contain only letters and numbers."
    );
    return;
  }

  setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
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
        // Your /api/auth/login route returns { token, user: { userId, name, email } }.
        // Game components need userId (for props / the session POST), so store
        // both the token and the user object, not just the token.
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/";
        // added "/" just temporarily as we don't hve a dashboard page for now 
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
        <div className="auth-brand-content">
          <div className="auth-logo">
            <span className="auth-logo-mark"><i /><i /><i /><i /></span>
            <span className="auth-wordmark">Mind Metrics</span>
          </div>
        </div>
        <div className="auth-stage">
          <VoxelPainter stageHeight={360} />
        </div>
        <div className="auth-tagline">
        <h1>
  Test your skills. <br />
  Track your <span>performance.</span>
</h1>

<p>
  Complete short cognitive games and view your scores, progress,
  and performance insights in one place.
</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-theme"><ThemeToggle /></div>
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
              ? "Log in to continue your assessments."
              : "Log in to continue your assessments."}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="auth-field">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="abc"
                  value={form.name}
                  onChange={handleChange}
                  style={{ "--focus-color": "var(--violet)", "--focus-glow": "rgba(var(--violet-rgb), 0.15)" }}
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
                style={{ "--focus-color": "var(--blue)", "--focus-glow": "rgba(var(--blue-rgb), 0.15)" }}
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
             <input
  type="password"
  name="password"
  placeholder="Minimum 6 letters or numbers"
  value={form.password}
  onChange={handleChange}
  minLength={6}
  pattern="[A-Za-z0-9]+"
  title="Use at least 6 characters with letters and numbers only"
  style={{
    "--focus-color": "var(--coral)",
    "--focus-glow": "rgba(var(--coral-rgb), 0.15)",
  }}
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