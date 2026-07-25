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
  const res = await fetch(`${API_BASE}/api/assessments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to start assessment");
  }

  setAssessmentId(data.assessment.assessmentId);
  return data.assessment.assessmentId;
}

// Call once the user has finished every game in the current assessment.
export async function completeAssessment(assessmentId) {
  const res = await fetch(`${API_BASE}/api/assessments/${assessmentId}/complete`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to complete assessment");
  }

  return data.assessment;
}