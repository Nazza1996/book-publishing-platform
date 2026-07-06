import { useLocation } from "react-router-dom";
import instagramIcon from "../assets/social/instagram.png";
import tiktokIcon from "../assets/social/tik-tok.png";
import youtubeIcon from "../assets/social/youtube.png";
import wattpadIcon from "../assets/social/wattpad.png";

export default function Footer() {
    const location = useLocation();

    if (location.pathname.startsWith('/admin')) {
        return null; // Don't render footer on admin pages
    }

    return (
        <footer>
            <div className="footer-content">
                <h2>Contact Me</h2>
                <a href="https://instagram.com/NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src={instagramIcon} alt="Instagram" className="social-icon" />
                </a>
                <a href="https://tiktok.com/@natetheplot" target="_blank" rel="noopener noreferrer">
                    <img src={tiktokIcon} alt="TikTok" className="social-icon" />
                </a>
                <a href="https://youtube.com/@NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src={youtubeIcon} alt="YouTube" className="social-icon" />
                </a>
                <a href="https://wattpad.com/NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src={wattpadIcon} alt="Wattpad" className="social-icon" />
                </a>
            </div>
            <p>&copy; {new Date().getFullYear()} NateThePlot. All rights reserved.</p>
        </footer>
    );
}