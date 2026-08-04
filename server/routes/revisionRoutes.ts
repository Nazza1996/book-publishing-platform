import { Request, Response, Router } from "express";
import ChapterRevision from "../models/ChapterRevision.js";
import { requireAdmin } from "../middleware/auth.js";
import User from "../models/User.js";

const router = Router();

router.use(requireAdmin);

//#region Routes

router.get("/", async (req: Request, res: Response) => {
    try {
        const releases = await ChapterRevision.findAll({
            include: [
                "book",
                {
                    model: User,
                    as: "creator",
                    attributes: ["id", "username"]
                }
            ],
            order: [["createdAt", "DESC"]]
        });
        res.json(releases);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch revisions" });
    }
});

export default router;
