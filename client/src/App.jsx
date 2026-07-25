import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import PatternSequence from "./games/PatternSequence";
import MemoryMatrix from "./games/MemoryMatrix";
import DualTask from "./games/DualTask";
import CPT from "./games/ContinuousPerformanceTest";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/play/pattern-sequence" element={<PatternSequence />} />
        <Route path="/play/memory-matrix" element={<MemoryMatrix />} />
        <Route path="/play/dual-task" element={<DualTask />} />
        <Route path="/play/cpt" element={<CPT/>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;