import { useState } from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { getTheme, setTheme } from "../utils/theme";

// Small sun / moon button. Needs `themeCss` (from utils/theme) on the page for its styling.
export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button type="button" className="tt-btn" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark" ? <FaSun /> : <FaMoon />}
    </button>
  );
}
