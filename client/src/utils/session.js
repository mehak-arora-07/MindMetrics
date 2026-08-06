

const API_BASE = `${import.meta.env.VITE_API_URL}`;

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

export function clearAssessmentId() {
    localStorage.removeItem("assessmentId");
}

export function getAssessmentId() {
  return localStorage.getItem("assessmentId");
}

export function getCurrentGameIndex() {
    return Number(localStorage.getItem("currentGameIndex") || 0);
}

export function setCurrentGameIndex(index) {
    localStorage.setItem("currentGameIndex", index);
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

export async function completeAssessment(assessmentId) {
  if (!assessmentId) {
    throw new Error("assessmentId is missing");
  }

  const res = await fetch(
    `${API_BASE}/api/assessments/${assessmentId}/complete`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  let data;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.success) {
    console.error("Complete assessment request failed:", {
      status: res.status,
      assessmentId,
      response: data,
    });

    throw new Error(
      data?.message ||
      data?.error ||
      `Failed to complete assessment (${res.status})`
    );
  }

  return data.assessment;
}
export function markAssessmentCompleted() {
  localStorage.setItem("assessmentCompleted", "true");
}

export function isAssessmentCompleted() {
  return localStorage.getItem("assessmentCompleted") === "true";
}

export function clearAssessmentCompleted() {
  localStorage.removeItem("assessmentCompleted");
}