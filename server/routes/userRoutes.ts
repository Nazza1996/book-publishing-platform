import { Request, Response, Router } from "express";
import { signToken, verifyToken } from "../utils/jwt.js";
import bcrypt, { hash } from "bcrypt";
import User from "../models/User.js";


const router = Router();

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

    const token = signToken({ id: user.id, username: user.username });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000, // 1 hour
    })
    .json({ user: { id: user.id, username: user.username } });
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
    res.clearCookie("token").json({ message: "Logged out" });
});

router.get("/currentUser", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
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

router.get("/", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const users = await User.findAll({ attributes: ["id", "username"] });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.put("/:id", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

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
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

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