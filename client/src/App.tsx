import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Library from './pages/Library';
import NotFound from './pages/404';
import Book from './pages/Book';
import { AuthProvider } from './contexts/AuthContext';
import AdminDashboard from './pages/admin/AdminDashboard';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import Users from './pages/admin/Users';
import ManageBooks from './pages/admin/manageBooks/ManageBooks';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path='*' element={<NotFound />} />
          <Route path='/' element={<Home />} />
          <Route path='/library' element={<Library />} />
          <Route path='/book/:slug' element={<Book />} />
          <Route path='/login' element={<Login />} />
          <Route path='/admin' element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path='/admin/users' element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path='/admin/manage_books' element={<PrivateRoute><ManageBooks /></PrivateRoute>} />
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;