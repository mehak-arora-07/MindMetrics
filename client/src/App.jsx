import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getUser, getAssessmentId, startAssessment } from "./utils/session";
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


function App() {
  const [assessmentId, setAssessmentIdState] = useState(() =>
    getAssessmentId()
  );

  const [user] = useState(() => getUser());

  useEffect(() => {
    const createAssessment = async () => {
      if (assessmentId || !user) {
        return;
      }

      try {
        const newAssessmentId = await startAssessment();

        console.log("Assessment started:", newAssessmentId);

        setAssessmentIdState(newAssessmentId);
      } catch (err) {
        console.error("Could not start assessment:", err);
      }
    };

    createAssessment();
  }, [assessmentId, user]);


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
          element={<PatternSequence userId={user?.userId} assessmentId={assessmentId} />}
        />
        <Route
          path="/play/memory-matrix"
          element={<MemoryMatrix userId={user?.userId} assessmentId={assessmentId} />}
        />
        <Route
          path="/play/dual-task"
          element={<DualTask userId={user?.userId} assessmentId={assessmentId} />}
        />
        <Route
          path="/play/cpt"
          element={<CPT userId={user?.userId} assessmentId={assessmentId} />}
        />
        <Route 
         path="/play/keep-track"
         element={<KeepTrackTask userId={user?.userId} assessmentId={assessmentId} />}
         />
         <Route 
         path="/play/multi-switch"
         element={<MultiSwitch userId={user?.userId} assessmentId={assessmentId} />}
         />
        <Route
         path="/play/find-the-box"
         element={<FindTheBox userId={user?.userId} assessmentId={assessmentId} />}      
         />
         <Route
         path="/play/operation-span"
         element={<OperationSpanTask userId={user?.userId} assessmentId={assessmentId} />}      
         />
         <Route
         path="/play/rule-discovery"
         element={<RuleDiscovery userId={user?.userId} assessmentId={assessmentId} />}      
         />
         <Route
         path="/play/color-number"
         element={<ColorNumberReaction userId={user?.userId} assessmentId={assessmentId} />}      
         />
      </Routes>
    </BrowserRouter>
  );
}

export default App;