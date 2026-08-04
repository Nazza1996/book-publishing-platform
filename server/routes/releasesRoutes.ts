import { Request, Response, Router } from "express";
import ChapterRelease from "../models/ChapterRelease.js";
import { requireAdmin } from "../middleware/auth.js";
import Book from "../models/Book.js";
import { Op } from "sequelize";

const router = Router();

router.use(requireAdmin);

//#region Routes

router.get("/", async (req: Request, res: Response) => {
    try {
        const releases = await ChapterRelease.findAll({
            include: [{
                model: Book,
                attributes: ["id", "slug", "title"],
            }],
            order: [
                ["releaseAt", "DESC"],
                [Book, "title", "DESC"],
                ["chapterNumber", "DESC"]
            ]
        })
        res.json(releases);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch releases" });
    }
});

router.get("/scheduled", async (req: Request, res: Response) => {
    try {
        const releases = await ChapterRelease.findAll({
            include: [{
                model: Book,
                attributes: ["id", "slug", "title"],
            }],
            where: {
                status: "scheduled",
            },
            order: [
                ["releaseAt", "DESC"],
                [Book, "title", "DESC"],
                ["chapterNumber", "DESC"]
            ]
        })
        res.json(releases);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch scheduled releases" });
    }
});

export default router;