import { NavLink } from "react-router-dom";

export default function AdminNav() {
    return (
        <div id="adminNav">
            <span id="adminNavTitle">BookAdmin</span>

            <div className="admin-nav-section">
                <NavLink to="/admin" end>Dashboard</NavLink>
            </div>

            <div className="admin-nav-section">
                <span className="admin-nav-section-title">BOOKS</span>
                <NavLink to="/admin/all-books">All Books</NavLink>
                <NavLink to="/admin/new-book">New Book</NavLink>
                <NavLink to="/admin/series">Series</NavLink>
            </div>

            <div className="admin-nav-section">
                <span className="admin-nav-section-title">CONTENT</span>
                <NavLink to="/admin/chapters">Chapters</NavLink>
                <NavLink to="/admin/versions">Versions</NavLink>
                <NavLink to="/admin/reader-groups">Reader Groups</NavLink>
            </div>

            <div className="admin-nav-section">
                <span className="admin-nav-section-title">PUBLISH & SCHEDULE</span>
                <NavLink to="/admin/releases">Releases</NavLink>
                <NavLink to="/admin/schedule">Schedule</NavLink>
                <NavLink to="/admin/announcements">Announcements</NavLink>
            </div>

            <div className="admin-nav-section">
                <span className="admin-nav-section-title">READERS</span>
                <NavLink to="/admin/alpha-readers">Alpha Readers</NavLink>
                <NavLink to="/admin/beta-readers">Beta Readers</NavLink>
                <NavLink to="/admin/feedback">Feedback</NavLink>
            </div>

            <div className="admin-nav-section">
                <span className="admin-nav-section-title">SETTINGS</span>
                <NavLink to="/admin/users">Users</NavLink>
                <NavLink to="/admin/settings">Settings</NavLink>
            </div>
        </div>
    )
}
