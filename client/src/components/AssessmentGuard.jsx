import { Navigate } from "react-router-dom";
import { getAssessmentId } from "../utils/session";

export default function AssessmentGuard({ children }) {
  const assessmentId = getAssessmentId();

  if (!assessmentId) {
    return <Navigate to="/" replace />;
  }

  return children;
}