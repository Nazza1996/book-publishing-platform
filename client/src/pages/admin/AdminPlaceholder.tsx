import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { setPageTitle } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import AdminNav from "./AdminNav";

const labels: Record<string, string> = {
    "/admin/series": "Series",
    "/admin/chapters": "Chapters",
    "/admin/versions": "Versions",
    "/admin/reader-groups": "Reader Groups",
    "/admin/releases": "Releases",
    "/admin/schedule": "Schedule",
    "/admin/announcements": "Announcements",
    "/admin/alpha-readers": "Alpha Readers",
    "/admin/beta-readers": "Beta Readers",
    "/admin/feedback": "Feedback",
    "/admin/settings": "Settings"
};

export default function AdminPlaceholder() {
    const location = useLocation();
    const title = labels[location.pathname] ?? "Admin";

    useEffect(() => {
        setPageTitle(title);
    }, [title]);

    return (
        <div id="adminView">
            <AdminNav />
            <section className="admin-section admin-placeholder">
                <div>
                    <h1>{title}</h1>
                    <p>This area is reserved for the new admin panel workflow.</p>
                </div>
            </section>
        </div>
    );
}
