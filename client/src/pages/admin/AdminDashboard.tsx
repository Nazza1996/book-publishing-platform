import { useAuth } from "../../contexts/AuthContext";
import { setPageTitle } from "../../helpers";
import '../../styles/admin-dashboard.css';

export default function AdminDashboard() {
    const { logout } = useAuth();
    setPageTitle("Dashboard");

    return (
        <section id="adminDashboard">
            <h1>Dashboard</h1>
            <p>Welcome back, admin.</p>

            <div className="admin-actions">
                <a className="btn" href="/admin/users/">View Users</a>
                <a className="btn" href="/admin/manage_books">Manage Books</a>
                <button className="btn" onClick={logout}>
                    Logout
                </button>
            </div>
        </section>
    )
}