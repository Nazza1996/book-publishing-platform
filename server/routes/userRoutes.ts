import { Request, Response, Router } from "express";
import { signRefreshToken, signToken, verifyRefreshToken, verifyToken } from "../utils/jwt.js";
import bcrypt, { hash } from "bcrypt";
import User from "../models/User.js";
import { getCurrentActiveUser, isTokenCurrentForUser, requireAdmin, type AuthUser } from "../middleware/auth.js";


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

type PublicUser = {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
};

//#region Routes

router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const identifier = String(username || "").trim();

    const user = await User.findOne({ where: { username: identifier } });
    if (!user || user.username !== identifier) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.active) {
        return res.status(403).json({ error: "This account no longer has access" });
    }

    if (typeof password !== "string" || !password || password.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const publicUser = serializeUser(user);
    setAuthCookies(res, user);

    res.json({ user: publicUser });
});

router.post("/register", async (req: Request, res: Response) => {
    try {
        const { username, password, role = "reader", active = true } = req.body;
        const userCount = await User.count();
        const requestingUser = await getCurrentActiveUser(req);
        const isBootstrap = userCount === 0;

        if (!isBootstrap && requestingUser?.role !== "admin") {
            return res.status(requestingUser ? 403 : 401).json({ error: "Admin access required" });
        }

        const displayUsername = String(username ?? "").trim();

        if (!displayUsername || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        if (!["admin", "reader"].includes(role)) {
            return res.status(400).json({ error: "A valid role is required" });
        }

        if (typeof active !== "boolean") {
            return res.status(400).json({ error: "A valid active value is required" });
        }

        const password_hash = await hash(password, 12);
        const newUser = await User.create({
            username: displayUsername,
            password_hash,
            role: isBootstrap ? "admin" : role,
            active,
        });
        const publicUser = serializeUser(newUser);

        if (isBootstrap) {
            setAuthCookies(res, newUser);
        }

        res.status(201).json({ user: publicUser });
    } catch (error: any) {
        if (error?.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({ error: "Username already taken" });
        }

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
        const payload = verifyRefreshToken(refreshToken) as AuthUser;
        const user = await User.findByPk(payload.id, {
            attributes: ["id", "username", "role", "active", "password_changed_at"],
        });

        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "User not found" });
        }

        if (!user.active) {
            clearAuthCookies(res);
            return res.status(403).json({ error: "This account no longer has access" });
        }

        if (!isTokenCurrentForUser(payload, user)) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "Session expired" });
        }

        const publicUser = serializeUser(user);
        res.cookie("token", signToken(createTokenPayload(user)), accessTokenCookieOptions);
        return res.json({ user: publicUser });
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
            attributes: ["id", "username", "role", "active", "password_changed_at"]
        });

        if (!user) {
            return res.status(404).json({ user: null, error: "User not found" });
        }

        if (!user.active) {
            clearAuthCookies(res);
            return res.status(403).json({ user: null, error: "This account no longer has access" });
        }

        if (!isTokenCurrentForUser(payload, user)) {
            clearAuthCookies(res);
            return res.status(401).json({ user: null, error: "Session expired" });
        }

        res.json({ user: serializeUser(user) });
    } catch (error) {
        res.status(401).json({ user: null, error: "Invalid token" });
    }
});

router.use(requireAdmin);

router.get("/", async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "username", "role", "active", "createdAt", "updatedAt"],
        });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, active, password } = req.body;

    try {
        const user = await User.findByPk(id as string);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const currentUser = (req as any).user as PublicUser;

        if (role && !["admin", "reader"].includes(role)) {
            return res.status(400).json({ error: "A valid role is required" });
        }

        if (active !== undefined && typeof active !== "boolean") {
            return res.status(400).json({ error: "A valid active value is required" });
        }

        if (currentUser.id === user.id && (role === "reader" || active === false)) {
            return res.status(400).json({ error: "You cannot revoke or demote your own admin account" });
        }

        const nextUsername = username !== undefined ? String(username).trim() : user.username;
        if (!nextUsername) {
            return res.status(400).json({ error: "Username is required" });
        }

        user.username = nextUsername;
        user.role = role || user.role;
        user.active = active ?? user.active;

        const existingUsername = await User.findOne({ where: { username: user.username } });
        if (existingUsername && existingUsername.id !== user.id) {
            return res.status(400).json({ error: "Username already taken" });
        }

        if (currentUser.role === "admin" && user.role !== "admin" && password && typeof password === "string" && password.trim()) {
            user.password_hash = await hash(password, 12);
            user.password_changed_at = new Date();
        }

        await user.save();
        res.json({ user: serializeUser(user), message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
    }
});

router.patch("/:id/access", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
        return res.status(400).json({ error: "A valid active value is required" });
    }

    try {
        const user = await User.findByPk(id as string);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const currentUser = (req as any).user as PublicUser;
        if (currentUser.id === user.id && active === false) {
            return res.status(400).json({ error: "You cannot revoke your own account" });
        }

        await user.update({ active });
        res.json({ user: serializeUser(user) });
    } catch (error) {
        res.status(500).json({ error: "Failed to update access" });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id as string);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const currentUser = (req as any).user as PublicUser;
        if (currentUser.id === user.id) {
            return res.status(400).json({ error: "You cannot delete your own account" });
        }

        await user.destroy();
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

//#region Functions

function serializeUser(user: User): PublicUser {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active,
    };
}

function createTokenPayload(user: User) {
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active,
        passwordChangedAt: user.password_changed_at?.getTime() ?? null,
    };
}

function setAuthCookies(res: Response, user: User) {
    const tokenPayload = createTokenPayload(user);
    res.cookie("token", signToken(tokenPayload), accessTokenCookieOptions);
    res.cookie("refreshToken", signRefreshToken(tokenPayload), refreshTokenCookieOptions);
}

function clearAuthCookies(res: Response) {
    res.clearCookie("token", cookieBaseOptions);
    res.clearCookie("refreshToken", cookieBaseOptions);
}

export default router;
