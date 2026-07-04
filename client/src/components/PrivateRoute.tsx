import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
    children: ReactNode;
    role?: "admin" | "reader";
}

export const PrivateRoute = ({ children, role = "admin" }: PrivateRouteProps) => {
    const { user, loading } = useAuth();

    if (!loading && !user) {
        const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (!loading && user && user.role !== role) {
        return <Navigate to={user.role === "reader" ? "/library" : "/notFound"} replace />;
    }

    return children;
};
