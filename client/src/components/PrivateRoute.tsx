import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
    children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
    const { user, loading } = useAuth();

    if (!loading && !user) {
        window.location.href = "/login";
        return null;
    }

    return children;
};
