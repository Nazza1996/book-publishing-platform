import { Request, Response, Router } from "express";
import { Op } from "sequelize";
import Book from "../models/Book.js";
import BookVersion from "../models/BookVersion.js";
import Chapter from "../models/Chapter.js";
import { sequelize } from "../utils/database.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const books = await Book.findAll();
        
        // For each book, check if it has unpublished draft changes
        const booksWithDraftStatus = await Promise.all(
            books.map(async (book: any) => {
                let hasUnpublishedDrafts = false;
                
                // Only check if book is published
                if (book.publishedVersionId) {
                    const workingDraft = await BookVersion.findOne({
                        where: { bookId: book.id, isWorkingDraft: true }
                    });
                    
                    if (workingDraft) {
                        // Compare chapters between published and draft versions
                        const publishedChapters = await Chapter.findAll({
                            where: { bookVersionId: book.publishedVersionId },
                            order: [['chapterNumber', 'ASC']]
                        });
                        
                        const draftChapters = await Chapter.findAll({
                            where: { bookVersionId: workingDraft.id },
                            order: [['chapterNumber', 'ASC']]
                        });
                        
                        // Check if they're different
                        if (publishedChapters.length !== draftChapters.length) {
                            hasUnpublishedDrafts = true;
                        } else {
                            // Compare each chapter
                            for (let i = 0; i < publishedChapters.length; i++) {
                                const pub = publishedChapters[i].dataValues;
                                const draft = draftChapters[i].dataValues;
                                
                                if (pub.title !== draft.title || pub.content !== draft.content) {
                                    hasUnpublishedDrafts = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                return {
                    ...book.dataValues,
                    hasUnpublishedDrafts
                };
            })
        );
        
        res.json(booksWithDraftStatus);
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

router.get("/published", async (req: Request, res: Response) => {
    try {
        const books = await Book.findAll({
            where: { publishedVersionId: { [Op.not]: null } }
        });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch published books" });
    }
});

router.get("/featured", async (req: Request, res: Response) => {
    try {
        const books = await Book.findAll({
            where: { 
                isFeatured: true,
                publishedVersionId: { [Op.not]: null }
            }
        });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch featured books" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { version = 'draft' } = req.query;

    try {
        const book = await Book.findOne({ where: { id } });
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        // Check if requesting draft version
        if (version === 'draft') {
            const token = req.cookies?.token;
            if (!token) {
                return res.status(401).json({ error: "Not authenticated" });
            }
            
            // Get working draft version
            const draftVersion = await BookVersion.findOne({
                where: { bookId: book.id, isWorkingDraft: true }
            });

            if (!draftVersion) {
                return res.status(404).json({ error: "Draft not found" });
            }

            const chapters = await Chapter.findAll({ 
                where: { bookVersionId: draftVersion.id }
            });

            res.json({
                ...book.dataValues,
                version: { ...draftVersion.dataValues, chapters },
                versionStatus: 'draft'
            });
        } else {
            // Get published version
            if (!book.publishedVersionId) {
                return res.status(404).json({ error: "No published version available" });
            }

            const publishedVersion = await BookVersion.findOne({
                where: { id: book.publishedVersionId }
            });

            if (!publishedVersion) {
                return res.status(404).json({ error: "Published version not found" });
            }

            const chapters = await Chapter.findAll({ 
                where: { bookVersionId: publishedVersion.id }
            });

            res.json({
                ...book.dataValues,
                version: { ...publishedVersion.dataValues, chapters },
                versionStatus: 'published'
            });
        }
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

    try {
        if (book.id) {
            // Update existing book
            const existingBook = await Book.findOne({ where: { id: book.id } });
            
            if (existingBook) {
                await existingBook.update({
                    title: book.title,
                    description: book.description,
                });
        
                // Get or create working draft version
                let draftVersion = await BookVersion.findOne({
                    where: { bookId: existingBook.id, isWorkingDraft: true }
                });

                if (!draftVersion) {
                    draftVersion = await BookVersion.create({
                        bookId: existingBook.id,
                        status: 'draft',
                        isWorkingDraft: true
                    });
                }

                // Delete existing chapters in this version
                await Chapter.destroy({ where: { bookVersionId: draftVersion.id } });
        
                // Create new chapters
                const chaptersToCreate = book.chapters.map((chapter: any) => ({
                    bookVersionId: draftVersion.id,
                    chapterNumber: chapter.chapterNumber,
                    title: chapter.title,
                    content: chapter.content,
                }));
        
                await Chapter.bulkCreate(chaptersToCreate);
        
                return res.json({ id: existingBook.id, versionId: draftVersion.id });
            }
        }

        // Create new book
        const newBook = await Book.create({
            title: book.title,
            description: book.description,
        });

        // Create working draft version
        const draftVersion = await BookVersion.create({
            bookId: newBook.id,
            status: 'draft',
            isWorkingDraft: true
        });

        const chaptersToCreate = book.chapters.map((chapter: any) => ({
            bookVersionId: draftVersion.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
        }));

        await Chapter.bulkCreate(chaptersToCreate);

        return res.json({ id: newBook.id, versionId: draftVersion.id });
    } catch (error) {
        return res.status(500).json({ error });
    }
});

router.post("/publish", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { book } = req.body;

    try {
        if (!book.id) {
            return res.status(400).json({ error: "Book must have an id to publish" });
        }

        const existingBook = await Book.findOne({ where: { id: book.id } });
        
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        // Update book metadata
        await existingBook.update({
            title: book.title,
            description: book.description,
        });

        // Create published version
        const publishedVersion = await BookVersion.create({
            bookId: existingBook.id,
            status: 'published',
            isWorkingDraft: false
        });

        // Copy chapters from draft to published version
        const chaptersToCreate = book.chapters.map((chapter: any) => ({
            bookVersionId: publishedVersion.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
        }));

        await Chapter.bulkCreate(chaptersToCreate);

        // Update book to point to published version
        await existingBook.update({
            publishedVersionId: publishedVersion.id
        });

        // Mark old published version as not working draft if this is a republish
        const oldPublishedVersions = await BookVersion.findAll({
            where: {
                bookId: existingBook.id,
                id: { [Op.ne]: publishedVersion.id },
                status: 'published'
            }
        });

        return res.json({ id: existingBook.id, versionId: publishedVersion.id });
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

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        // Unpublish by clearing publishedVersionId
        await existingBook.update({ 
            publishedVersionId: null,
            isFeatured: false 
        });

        res.json({ message: "Book converted to draft successfully" });
    } catch (error) {
        return res.status(500).json({ error });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        // Cascade delete: BookVersion (which cascades to Chapter)
        await BookVersion.destroy({ where: { bookId: existingBook.id } });
        
        // Delete the book
        await existingBook.destroy();

        res.json({ message: "Book deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error });
    }
});

router.post("/toggleFeatured", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.body;

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        if (!existingBook.publishedVersionId) {
            return res.status(400).json({ error: "Only published books can be featured" });
        }

        await existingBook.update({ isFeatured: !existingBook.isFeatured });

        res.json({ message: "Book featured status toggled successfully" });
    } catch (error) {
        return res.status(500).json({ error });
    }
});

export default router;