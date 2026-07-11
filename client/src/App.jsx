import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import WhackACircle from "./games/WhackACircle";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/play/whack-a-circle" element={<WhackACircle />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;