import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import WhackACircle from "./games/WhackACircle";
import PatternSequence from "./games/PatternSequence";
import MemoryMatrix from "./games/MemoryMatrix"
import HiddenSymbol from "./games/HiddenSymbol";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/play/whack-a-circle" element={<WhackACircle />} />
        <Route path="/play/pattern-sequence" element={<PatternSequence />} />
        <Route path="/play/memory-matrix" element={<MemoryMatrix />} />
        <Route path="/play/hidden-symbol" element={<HiddenSymbol />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;