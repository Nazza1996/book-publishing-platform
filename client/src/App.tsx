import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Library from './pages/Library';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="*" element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;