import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
    children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
    const { user, loading } = useAuth();

    if (!loading && !user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};
