import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CameraPage from './components/CameraPage';

function App() {
  return (
    <Router>
      <div className="w-full min-h-screen bg-black text-white overflow-hidden">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/camera" element={<CameraPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
