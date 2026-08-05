import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getUser, getAssessmentId} from "./utils/session";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import PatternSequence from "./games/PatternSequence";
import MemoryMatrix from "./games/MemoryMatrix";
import DualTask from "./games/DualTask";
import CPT from "./games/ContinuousPerformanceTest";
import KeepTrackTask from "./games/KeepTrackTask";
import MultiSwitch from "./games/MultiSwitch";
import FindTheBox from "./games/FindTheBox";
import OperationSpanTask from "./games/OperationSpanTask"
import RuleDiscovery from "./games/RuleDiscovery";
import ColorNumberReaction from "./games/ColorNumberReaction";
import MyProfile from "./pages/MyProfile";
import AboutUs from "./pages/AboutUs";
import PerformancePage from "./pages/Performance";
import AssessmentReportPage from "./pages/Analytics";
import ProtectedRoute from "./components/ProtectedRoute";
import AssessmentGuard from "./components/AssessmentGuard";

function App() {
  const assessmentId = getAssessmentId();
  const [user] = useState(() => getUser());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/results" element={<Results />} /> */}
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/about" element={<AboutUs />} />


        <Route
          path="/play/pattern-sequence"
          element={
          <ProtectedRoute>
          <AssessmentGuard>
          <PatternSequence userId={user?.userId} assessmentId={assessmentId} />
          </AssessmentGuard>
          </ProtectedRoute>
          }
        />
        <Route
          path="/play/memory-matrix"
          element={
          <ProtectedRoute>
          <AssessmentGuard>
          <MemoryMatrix userId={user?.userId} assessmentId={assessmentId} />
          </AssessmentGuard>
          </ProtectedRoute>}
        />
        <Route
          path="/play/dual-task"
          element={
          <ProtectedRoute>
            <AssessmentGuard>
          <DualTask userId={user?.userId} assessmentId={assessmentId} />
          </AssessmentGuard>
          </ProtectedRoute>}
        />
        <Route
          path="/play/cpt"
          element={
          <ProtectedRoute>
            <AssessmentGuard>
          <CPT userId={user?.userId} assessmentId={assessmentId} />
          </AssessmentGuard>
          </ProtectedRoute>}
        />
        <Route 
         path="/play/keep-track"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <KeepTrackTask userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}
         />
         <Route 
         path="/play/multi-switch"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <MultiSwitch userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}
         />
        <Route
         path="/play/find-the-box"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <FindTheBox userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}      
         />
         <Route
         path="/play/operation-span"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <OperationSpanTask userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}      
         />
         <Route
         path="/play/rule-discovery"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <RuleDiscovery userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}      
         />
         <Route
         path="/play/color-number"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <ColorNumberReaction userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}      
         />
         <Route
         path="/performance"
         element={
         <ProtectedRoute>
          <AssessmentGuard>
         <PerformancePage userId={user?.userId} assessmentId={assessmentId} />
         </AssessmentGuard>
         </ProtectedRoute>}      
         />
         <Route path="/analytics/:id" element={
          <ProtectedRoute>
            <AssessmentGuard>
          <AssessmentReportPage />
          </AssessmentGuard>
          </ProtectedRoute>
        } />
         <Route path="/analytics" element={
          <ProtectedRoute>
            <AssessmentGuard>
          <AssessmentReportPage  userId={user?.userId} assessmentId={assessmentId}/>
          </AssessmentGuard>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;