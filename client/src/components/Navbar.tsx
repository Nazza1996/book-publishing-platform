import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
    const { user } = useAuth();

    return (
        <nav>
            <a href="/" className="branding">
                <img src="/favicon.ico" alt="NateThePlot Logo" />
                <span>NateThePlot</span>
            </a>
            <ul className="nav-list">
                <li><a href="/">Home</a></li>
                <li><a href="/library">Library</a></li>
                {user && (
                    <li><a href="/admin">Admin</a></li>
                )}
            </ul>
        </nav>
    );
}