import { Router } from "express";
import { BookController } from "../controllers/BookController";

const router = Router();

router.get("/", (req, res) => {
    BookController.listBooks()
        .then(books => res.json(books))
        .catch(err => res.status(500).json({ error: "Failed to fetch books" }));
});

router.get("/published", (req, res) => {
    BookController.getPublishedBooks()
        .then(books => res.json(books))
        .catch(err => res.status(500).json({ error: "Failed to fetch books" }));
});

router.get("/featured", (req, res) => {
    BookController.getFeaturedBooks()
        .then(books => {
            res.json(books);
        })
        .catch(err => res.status(500).json({ error: "Failed to fetch books" }));
});

router.get("/:slug", (req, res) => {
    const { slug } = req.params;
    BookController.getBook(slug)
        .then(book => {
            if (!book) {
                return res.status(404).json({ error: "Book not found" });
            }
            res.json(book);
        })
        .catch(err => res.status(500).json({ error: "Failed to fetch book" }));
});

export default router;