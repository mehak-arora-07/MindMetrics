const KEY = "assessmentProgress";

// Starts a brand new assessment
export function startAssessmentFlow() {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      currentGame: 0,
      started: true,
      completed: false,
    })
  );
}

// Returns the assessment flow object
export function getAssessmentFlow() {
  const data = localStorage.getItem(KEY);

  if (!data) return null;

  return JSON.parse(data);
}

// Updates the current game index
export function updateCurrentGame(index) {
  const flow = getAssessmentFlow();

  if (!flow) return;

  flow.currentGame = index;

  localStorage.setItem(KEY, JSON.stringify(flow));
}

// Marks the assessment as completed
export function markAssessmentCompleted() {
  const flow = getAssessmentFlow();

  if (!flow) return;

  flow.completed = true;

  localStorage.setItem(KEY, JSON.stringify(flow));
}

// Checks whether the assessment has been completed
export function isAssessmentCompleted() {
  const flow = getAssessmentFlow();

  return flow?.completed === true;
}

// Clears the assessment flow
export function finishAssessmentFlow() {
  localStorage.removeItem(KEY);
}