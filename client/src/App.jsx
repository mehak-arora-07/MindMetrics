import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import WhackACircle from "./games/WhackACircle";
import PatternSequence from "./games/PatternSequence";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/play/whack-a-circle" element={<WhackACircle />} />
        <Route path="/play/pattern-sequence" element={<PatternSequence />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;