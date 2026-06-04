import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../helpers";

interface User {
    id: string;
    username: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/users/currentUser", { credentials: "include", toast: false });
                
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData.user);
                }
            } catch (error) {
                setUser(null);
                setError("Failed to fetch user");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const login = async (username: string, password: string) => {
        const res = await apiFetch("/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            setError("Invalid credentials");
            return;
        }

        const data = await res.json();
        setUser(data.user);
        setError(null);
    }

    const logout = () => {
        apiFetch("/api/users/logout", {
            method: "POST",
            credentials: "include"
        })
            .then(() => {
                setUser(null);
                setError(null);
            });
    }

    const register = async (username: string, password: string) => {
        const res = await apiFetch("/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            setError("Failed to register");
            return;
        }

        const data = await res.json();
        setUser(data.user);
        setError(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};