// Drop into client/src/utils/session.js
// Small wrapper around localStorage + the /api/assessments route so game
// components and App.jsx don't each reimplement this.

const API_BASE = "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("assessmentId");
}

export function getAssessmentId() {
  return localStorage.getItem("assessmentId");
}

export function setAssessmentId(id) {
  localStorage.setItem("assessmentId", id);
}

// Creates a new assessment for the logged-in user and stores its id.
// Call this once, right before routing someone into the first game.
export async function startAssessment() {
  const token = getToken();

  console.log("Starting assessment...");
  console.log("Token exists:", !!token);

  const res = await fetch("http://localhost:5000/api/assessments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  console.log("Assessment response status:", res.status);
  console.log("Assessment response:", data);

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to start assessment");
  }

  const newAssessmentId =
    data.assessmentId || data.assessment?.assessmentId;

  if (!newAssessmentId) {
    throw new Error("Backend did not return an assessmentId");
  }

  setAssessmentId(newAssessmentId);

  return newAssessmentId;
}
// export async function saveGameSession(sessionData) {
//   const token = getToken();
//   const assessmentId = getAssessmentId();

//   if (!token) {
//     throw new Error("No login token found");
//   }

//   if (!assessmentId) {
//     throw new Error("No assessment ID found");
//   }

//   const payload = {
//     assessmentId,
//     gameId: sessionData.gameId,
//     accuracy: Number(sessionData.accuracy),
//     avgTimeMs: Number(sessionData.avgTimeMs),
//     metrics: sessionData.metrics || {},
//     completed: sessionData.completed ?? true,
//   };

//   console.log("Sending session payload:", payload);

//   const res = await fetch(`${API_BASE}/api/sessions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify(payload),
//   });

//   const data = await res.json();

//   console.log("Session API response:", data);

//   if (!res.ok || !data.success) {
//     throw new Error(
//       data.message ||
//       data.error ||
//       "Failed to save game session"
//     );
//   }

//   return data.session;
// }  