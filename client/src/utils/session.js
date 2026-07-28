// Drop into client/src/utils/session.js
// Small wrapper around localStorage + the /api/assessments and
// /api/sessions routes so game components and App.jsx don't each
// reimplement this.

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

  const res = await fetch(`${API_BASE}/api/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to start assessment");
  }

  const newAssessmentId = data.assessment?.assessmentId;

  if (!newAssessmentId) {
    throw new Error("Backend did not return an assessmentId");
  }

  setAssessmentId(newAssessmentId);

  return newAssessmentId;
}

// Saves a completed game session against the current assessment.
// Every game calls this the same way — no game reimplements the
// fetch/token/assessmentId logic itself.
export async function saveGameSession(sessionData) {
  const token = getToken();
  const assessmentId = getAssessmentId();

  if (!token) {
    throw new Error("No login token found");
  }

  if (!assessmentId) {
    throw new Error("No assessment ID found");
  }

  const payload = {
    assessmentId,
    gameId: sessionData.gameId,
    accuracy: Number(sessionData.accuracy),
    avgTimeMs: Number(sessionData.avgTimeMs),
    metrics: sessionData.metrics || {},
    completed: sessionData.completed ?? true,
  };

  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error || "Failed to save game session");
  }

  return data.session;
}