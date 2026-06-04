export default function Footer() {
    return (
        <footer>
            <div className="footer-content">
                <h2>Contact Me</h2>
                <a href="https://instagram.com/NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src="/images/social/instagram.png" alt="Instagram" className="social-icon" />
                </a>
                <a href="https://tiktok.com/@natetheplot" target="_blank" rel="noopener noreferrer">
                    <img src="/images/social/tik-tok.png" alt="TikTok" className="social-icon" />
                </a>
                <a href="https://youtube.com/@NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src="/images/social/youtube.png" alt="YouTube" className="social-icon" />
                </a>
                <a href="https://wattpad.com/NateThePlot" target="_blank" rel="noopener noreferrer">
                    <img src="/images/social/wattpad.png" alt="Wattpad" className="social-icon" />
                </a>
            </div>
            <p>&copy; {new Date().getFullYear()} NateThePlot. All rights reserved.</p>
        </footer>
    );
}