import { useLocation } from "react-router-dom";
export default function Footer() {
    const location = useLocation();

    if (location.pathname.startsWith('/admin')) {
        return null; // Don't render footer on admin pages
    }

    return (
        <footer>
            <div className="footer-content">
                <h2>Book Publishing Platform</h2>
            </div>
            <p>&copy; {new Date().getFullYear()} Book Publishing Platform. All rights reserved.</p>
        </footer>
    );
}