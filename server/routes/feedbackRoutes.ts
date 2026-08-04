import { Request, Response, Router } from "express";
import { getCurrentActiveUser, requireAdmin } from "../middleware/auth.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import { ReaderFeedback } from "../models/index.js";

const router = Router();

router.use(requireAdmin);

//#region Routes

router.get("/", async (req: Request, res: Response) => {
    const user = await getCurrentActiveUser(req);
    if (!user?.active || user.role !== "admin") {
        return res.status(user ? 403 : 401).json({ error: user ? "Admin access required" : "Not authenticated" });
    }

    try {
        const feedback = await ReaderFeedback.findAll({
            include: [
                {
                    model: Book,
                    as: "Book",
                },
                {
                    model: User,
                    as: "reader",
                    attributes: ["id", "username", "role", "active"],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.json(feedback);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
