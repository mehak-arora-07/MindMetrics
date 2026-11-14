// Single source of truth for the dark / light theme.
// Importing this file applies the saved theme right away, so every page that
// imports it (HomePage + all games) stays in sync, even after a refresh.
const KEY = "theme";

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable - theme still applies for this visit */
  }
}

if (typeof document !== "undefined") setTheme(getTheme());

// CSS variables shared by every page. Drop `${themeCss}` at the top of a styles string.
export const themeCss = `
:root {
  color-scheme: dark;
  --ink: #090C16; --panel: #10152A; --line: #1E2540;
  --bone: #ECE8DC; --mute: #8D93AB; --faint: #5B6380;
  --mint: #2FF3B0; --blue: #4F9CFF; --violet: #B794FF; --amber: #FFB020; --coral: #FF7A7A; --sky: #45CCFF;
  --mint-soft: #8CF7CC; --blue-soft: #7DB8FF; --coral-soft: #FFB4B4; --lilac: #D09BFF;
  --yellow: #FFD43B; --orange: #FFA060; --pink: #FF86C8; --teal: #35F0D8;
  --mint-rgb: 47, 243, 176; --blue-rgb: 79, 156, 255; --violet-rgb: 183, 148, 255;
  --amber-rgb: 255, 176, 32; --coral-rgb: 255, 122, 122;
  --ink-rgb: 9, 12, 22; --wash-rgb: 255, 255, 255;
  --on-accent: #04211A; --shadow-a: .5;
}
:root[data-theme="light"] {
  color-scheme: light;
  --ink: #F4F1E8; --panel: #FFFFFF; --line: #DAD5C5;
  --bone: #141A2E; --mute: #5A6280; --faint: #8E94A8;
  --mint: #0E9F73; --blue: #2563EB; --violet: #7C3AED; --amber: #C2680A; --coral: #DC3C45; --sky: #0284C7;
  --mint-soft: #3FCB9F; --blue-soft: #3B82F6; --coral-soft: #F5777E; --lilac: #9F67F5;
  --yellow: #B7791F; --orange: #D9621E; --pink: #DB3F96; --teal: #0F9D93;
  --mint-rgb: 14, 159, 115; --blue-rgb: 37, 99, 235; --violet-rgb: 124, 58, 237;
  --amber-rgb: 194, 104, 10; --coral-rgb: 220, 60, 69;
  --ink-rgb: 244, 241, 232; --wash-rgb: 20, 26, 46;
  --on-accent: #FFFFFF; --shadow-a: .14;
}
button:focus-visible, a:focus-visible { outline: 2px solid var(--mint); outline-offset: 3px; }
.tt-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; padding: 0; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--bone); font-size: 16px; cursor: pointer; transition: border-color .15s, color .15s; }
.tt-btn:hover { border-color: var(--mint); color: var(--mint); }
`;
