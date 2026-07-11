import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import WhackACircle from "./games/WhackACircle";
import MemoryMatrix from "./games/MemoryMatrix"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/play/whack-a-circle" element={<WhackACircle />} />
        <Route path="/play/memory-matrix" element={<MemoryMatrix />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;