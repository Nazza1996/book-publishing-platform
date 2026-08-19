import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/index.scss';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ReadingPreferencesProvider } from './contexts/ReadingPreferencesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Library from './pages/Library';
import NotFound from './pages/404';
import Book from './pages/Book';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import Users from './pages/admin/users';
import AdminView from './pages/admin/AdminView';
import AllBooks from './pages/admin/AllBooks';
import ManageBook from './pages/admin/ManageBook';
import Chapters from './pages/admin/Chapters';
import Versions from './pages/admin/Versions';
import Releases from './pages/admin/Releases';
import Schedule from './pages/admin/Schedule';
import ReaderGroups from './pages/admin/ReaderGroups';
import Feedback from './pages/admin/Feedback';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ReadingPreferencesProvider>
          <Router>
            <Navbar />
            <Routes>
              <Route path='*' element={<NotFound />} />
              <Route path='/' element={<Home />} />
              <Route path='/library' element={<Library />} />
              <Route path='/book/:slug' element={<Book />} />
              <Route path='/login' element={<Login />} />
              <Route path='/admin' element={<PrivateRoute><AdminView /></PrivateRoute>} />
              <Route path='/admin/users' element={<PrivateRoute><Users /></PrivateRoute>} />
              <Route path='/admin/all-books' element={<PrivateRoute><AllBooks /></PrivateRoute>} />
              <Route path='/admin/new-book' element={<PrivateRoute><ManageBook /></PrivateRoute>} />
              <Route path='/admin/book/:slug' element={<PrivateRoute><ManageBook /></PrivateRoute>} />
              <Route path='/admin/chapters' element={<PrivateRoute><Chapters /></PrivateRoute>} />
              <Route path='/admin/versions' element={<PrivateRoute><Versions /></PrivateRoute>} />
              <Route path='/admin/releases' element={<PrivateRoute><Releases /></PrivateRoute>} />
              <Route path='/admin/schedule' element={<PrivateRoute><Schedule /></PrivateRoute>} />
              <Route path='/admin/alpha-readers' element={<PrivateRoute><ReaderGroups channel="alpha" /></PrivateRoute>} />
              <Route path='/admin/beta-readers' element={<PrivateRoute><ReaderGroups channel="beta" /></PrivateRoute>} />
              <Route path='/admin/feedback' element={<PrivateRoute><Feedback /></PrivateRoute>} />
            </Routes>
            <Footer />
          </Router>
        </ReadingPreferencesProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
