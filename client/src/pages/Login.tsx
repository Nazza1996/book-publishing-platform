import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext"
import { setPageTitle } from "../helpers";

export default function Login() {
    const [loginLoading, setLoginLoading] = useState(false);
    const { login, user } = useAuth();

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
            window.location.href = "/admin";
        }
    }, [user]);

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