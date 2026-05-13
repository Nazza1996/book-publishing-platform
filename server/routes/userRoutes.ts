import { Request, Response, Router } from "express";
import { signToken, verifyToken } from "../utils/jwt";
import bcrypt, { hash } from "bcrypt";
import User from "../models/User";


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
        const password_hash = await hash(password, 16);
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
        return res.status(401).json({ user: null, error: "Not authenticated" });
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
    try {
        const users = await User.findAll({ attributes: ["id", "username"] });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

export default router;