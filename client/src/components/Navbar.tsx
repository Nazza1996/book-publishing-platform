export default function Navbar() {
    return (
        <nav>
            <a href="/" className="branding">
                <img src="/favicon.ico" alt="NateThePlot Logo" />
                <span>NateThePlot</span>
            </a>
            <ul className="nav-list">
                <li><a href="/">Home</a></li>
                <li><a href="/library">Library</a></li>
            </ul>
        </nav>
    );
}