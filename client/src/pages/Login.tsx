import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"
import { setPageTitle } from "../helpers";

export default function Login() {
    const [loginLoading, setLoginLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    setPageTitle("Login");

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoginLoading(true);
        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        await login(username, password);
        setLoginLoading(false);
    }

    useEffect(() => {
        if (user) {
            const redirect = searchParams.get("redirect");
            navigate(redirect?.startsWith("/") ? redirect : (user.role === "admin" ? "/admin" : "/library"), { replace: true });
        }
    }, [navigate, searchParams, user]);

    return (
        <section id="loginContent">
            <h1>Login</h1>
            
            <form method="POST" id="loginForm" onSubmit={handleLogin}>
                <input type="text" name="username" autoComplete="username" placeholder="Username" required />
                <input type="password" name="password" autoComplete="current-password" placeholder="Password" required />

                <button type="submit" disabled={loginLoading}>
                    {loginLoading ? "Logging in..." : "Login"}
                </button>
            </form>
        </section>
    )
}