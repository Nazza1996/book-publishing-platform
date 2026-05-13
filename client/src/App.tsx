import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Library from './pages/Library';
import NotFound from './pages/404';
import Book from './pages/Book';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path='*' element={<NotFound />} />
        <Route path='/' element={<Home />} />
        <Route path='/library' element={<Library />} />
        <Route path='/book/:id' element={<Book />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;