import { Request, Response, Router } from "express";
import { signRefreshToken, signToken, verifyRefreshToken, verifyToken } from "../utils/jwt.js";
import bcrypt, { hash } from "bcrypt";
import User from "../models/User.js";
import { requireAccessToken } from "../middleware/auth.js";


const router = Router();

const cookieBaseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
};

const accessTokenCookieOptions = {
    ...cookieBaseOptions,
    maxAge: 15 * 60 * 1000,
};

const refreshTokenCookieOptions = {
    ...cookieBaseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
};

function setAuthCookies(res: Response, user: { id: number; username: string }) {
    const tokenPayload = { id: user.id, username: user.username };

    res.cookie("token", signToken(tokenPayload), accessTokenCookieOptions);
    res.cookie("refreshToken", signRefreshToken(tokenPayload), refreshTokenCookieOptions);
}

function clearAuthCookies(res: Response) {
    res.clearCookie("token", cookieBaseOptions);
    res.clearCookie("refreshToken", cookieBaseOptions);
}

router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    setAuthCookies(res, { id: user.id, username: user.username });

    res.json({ user: { id: user.id, username: user.username } });
});

router.post("/register", async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const password_hash = await hash(password, 12);
        const newUser = await User.create({ username, password_hash });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: "Failed to register user" });
    }
});

router.post("/logout", (req: Request, res: Response) => {
    clearAuthCookies(res);
    res.json({ message: "Logged out" });
});

router.post("/refresh", async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const payload = verifyRefreshToken(refreshToken) as { id: number; username: string };
        const user = await User.findByPk(payload.id, {
            attributes: ["id", "username"],
        });

        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "User not found" });
        }

        res.cookie("token", signToken({ id: user.id, username: user.username }), accessTokenCookieOptions);
        return res.json({ user: { id: user.id, username: user.username } });
    } catch {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});

router.get("/currentUser", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json();
    }

    try {
        const payload: any = verifyToken(token);
        const user = await User.findByPk(payload.id, {
            attributes: ["id", "username"]
        });

        if (!user) {
            return res.status(404).json({ user: null, error: "User not found" });
        }

        res.json({ user });
    } catch (error) {
        res.status(401).json({ user: null, error: "Invalid token" });
    }
});

router.use(requireAccessToken);

router.get("/", async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({ attributes: ["id", "username"] });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username } = req.body;

    try {
        const user = await User.findByPk(id as string);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.username = username || user.username;

        const existingUsername = await User.findOne({ where: { username: user.username } });
        if (existingUsername && existingUsername.id !== user.id) {
            return res.status(400).json({ error: "Username already taken" });
        }

        await user.save();
        res.json({ message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id as string);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await user.destroy();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

export default router;