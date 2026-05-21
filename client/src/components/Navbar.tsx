import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Navbar() {
    const { user } = useAuth();

    return (
        <nav>
            <Link to="/" className="branding">
                <img src="/favicon.ico" alt="NateThePlot Logo" />
                <span>NateThePlot</span>
            </Link>
            <ul className="nav-list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/library">Library</Link></li>
                {user && (
                    <li><Link to="/admin">Admin</Link></li>
                )}
            </ul>
        </nav>
    );
}