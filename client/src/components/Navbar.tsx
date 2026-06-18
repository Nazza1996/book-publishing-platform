import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav>
            <Link to="/" className="branding">
                <img src="/favicon.ico" alt="NateThePlot Logo" />
                <span>NateThePlot</span>
            </Link>
            <ul className="nav-list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/library">Library</Link></li>
                {user && user.role === "admin" && (
                    <li><Link to="/admin">Admin</Link></li>
                )}
            </ul>
            <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                {theme === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="5"></circle>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                    </svg>
                )}
            </button>
        </nav>
    );
}