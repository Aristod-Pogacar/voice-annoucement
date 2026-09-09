import { BrowserRouter, Routes, Route } from "react-router-dom";

import ReceptionPage from "./pages/ReceptionPage";
import AnnouncementPage from "./pages/AnnouncementPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AnnouncementPage />} />
        <Route path="/reception" element={<ReceptionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;