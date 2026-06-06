import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { setPageTitle } from "../../helpers";
import '../../styles/admin-dashboard.scss';
import '../../styles/admin/shared-admin.scss';
import AdminNav from "./AdminNav";

export default function AdminView() {
    const { logout, user } = useAuth();
    setPageTitle("Dashboard");

    return (
        <div id="adminView">
            <AdminNav />
            <section id="adminDashboard" className="admin-section">
                <h1>Dashboard</h1>
                <p>Welcome back{`, ${user?.username}`}!</p>

                <div className="admin-actions">
                    <Link className="btn" to="/admin/users">View Users</Link>
                    <Link className="btn" to="/admin/manage_books">Manage Books</Link>
                    <button className="btn" onClick={logout}>
                        Logout
                    </button>
                </div>
            </section>
        </div>
    )
}