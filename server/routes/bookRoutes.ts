import { Request, Response, Router } from "express";
import Book from "../models/Book";
import Chapter from "../models/Chapter";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const books = await Book.findAll();
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch books" });
    }
});

router.get("/published", async (req: Request, res: Response) => {
    try {
        const books = await Book.findAll({ where: { status: "published" } });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch published books" });
    }
});

router.get("/featured", async (req: Request, res: Response) => {
    try {
        const books = await Book.findAll({ where: { isFeatured: true, status: "published" } });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch featured books" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const book = await Book.findOne({ where: { id } });
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        if (book.status !== "published") {
            const token = req.cookies?.token;
            if (!token) {
                return res.status(401).json({ error: "Not authenticated" });
            }
        }

        const chapters = await Chapter.findAll({ where: { bookId: book.id } });
        book.dataValues.chapters = chapters;

        res.json(book);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.post("/saveDraft", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    
    const { book } = req.body;

    if (book.id) {
        const existingBook = await Book.findOne({ where: { id: book.id } });
        
        if (existingBook) {
            await existingBook.update({
                title: book.title,
                description: book.description,
            });
    
            await Chapter.destroy({ where: { bookId: existingBook.id } });
    
            const chaptersToCreate = book.chapters.map((chapter: any) => ({
                bookId: existingBook.id,
                chapterNumber: chapter.chapterNumber,
                title: chapter.title,
                content: chapter.content,
            }));
    
            await Chapter.bulkCreate(chaptersToCreate);
    
            return res.json({ id: existingBook.id });
        }
    }

    const newBook = await Book.create({
        title: book.title,
        description: book.description,
        status: "draft",
    });

    const chaptersToCreate = book.chapters.map((chapter: any) => ({
        bookId: newBook.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
    }));

    await Chapter.bulkCreate(chaptersToCreate);

    return res.json({ id: newBook.id });
});

router.post("/publish", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { book } = req.body;

    try {
        if (book.id) {
            const existingBook = await Book.findOne({ where: { id: book.id } });
            
            if (existingBook) {
                await existingBook.update({
                    title: book.title,
                    description: book.description,
                    status: "published",
                });
    
                await Chapter.destroy({ where: { bookId: existingBook.id } });
        
                const chaptersToCreate = book.chapters.map((chapter: any) => ({
                    bookId: existingBook.id,
                    chapterNumber: chapter.chapterNumber,
                    title: chapter.title,
                    content: chapter.content,
                }));
        
                await Chapter.bulkCreate(chaptersToCreate);
        
                return res.json({ id: existingBook.id });
            }
        }
    
        const newBook = await Book.create({
            title: book.title,
            description: book.description,
            status: "published",
        });
    
        const chaptersToCreate = book.chapters.map((chapter: any) => ({
            bookId: newBook.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
        }));
    
        await Chapter.bulkCreate(chaptersToCreate);

        return res.json({ id: newBook.id });
    } catch (error) {
        return res.status(500).json({ error });
    }
    
});

router.post("/convertToDraft", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.body;

    const existingBook = await Book.findOne({ where: { id } });
    if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
    }

    await existingBook.update({ status: "draft", isFeatured: false });

    res.json({ message: "Book converted to draft successfully" });
});

router.delete("/:id", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const existingBook = await Book.findOne({ where: { id } });
    if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
    }

    await existingBook.destroy();

    res.json({ message: "Book deleted successfully" });
});

router.post("/toggleFeatured", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.body;

    const existingBook = await Book.findOne({ where: { id } });
    if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
    }

    if (existingBook.status !== "published") {
        return res.status(400).json({ error: "Only published books can be featured" });
    }

    await existingBook.update({ isFeatured: !existingBook.isFeatured });

    res.json({ message: "Book featured status toggled successfully" });
});

export default router;