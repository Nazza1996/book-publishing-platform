import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext"

export default function Login() {
    const { login, user } = useAuth();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        await login(username, password);
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
                <input name="username" placeholder="Username" required />
                <input type="password" name="password" placeholder="Password" required />

                <button type="submit">Login</button>
            </form>
        </section>
    )
}