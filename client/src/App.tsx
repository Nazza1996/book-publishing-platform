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
import Users from './pages/newAdmin/Users';
import AdminView from './pages/newAdmin/AdminView';
import AllBooks from './pages/newAdmin/AllBooks';
import ManageBook from './pages/newAdmin/ManageBook';
import AdminPlaceholder from './pages/newAdmin/AdminPlaceholder';
import Chapters from './pages/newAdmin/Chapters';

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
              <Route path='/admin/versions' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/reader-groups' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/releases' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/schedule' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/alpha-readers' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/beta-readers' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
              <Route path='/admin/feedback' element={<PrivateRoute><AdminPlaceholder /></PrivateRoute>} />
            </Routes>
            <Footer />
          </Router>
        </ReadingPreferencesProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
