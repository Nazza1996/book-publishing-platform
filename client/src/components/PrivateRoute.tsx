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
        return <Navigate to="/login" replace />;
    }

    if (!loading && user && user.role !== role) {
        return <Navigate to={user.role === "reader" ? "/library" : "/notFound"} replace />;
    }

    return children;
};
