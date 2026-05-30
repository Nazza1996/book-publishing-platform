import { Request, Response, Router } from "express";
import { Op } from "sequelize";
import Book from "../models/Book.js";
import BookVersion from "../models/BookVersion.js";
import Chapter from "../models/Chapter.js";
import { hasValidAccessToken, requireAccessToken } from "../middleware/auth.js";

const router = Router();

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'book';
}

async function buildUniqueSlug(title: string, excludeBookId?: number) {
    const baseSlug = slugifyTitle(title);
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
        const existingBook = await Book.findOne({ where: { slug } });

        if (!existingBook || (excludeBookId && existingBook.id === excludeBookId)) {
            return slug;
        }

        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

async function getBookByIdentifier(identifier: string) {
    const bookBySlug = await Book.findOne({ where: { slug: identifier } });

    if (bookBySlug) {
        return bookBySlug;
    }

    const numericId = Number(identifier);
    if (!Number.isNaN(numericId)) {
        return Book.findOne({ where: { id: numericId } });
    }

    return null;
}

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
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
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

router.get("/:slug", async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { version = 'draft' } = req.query;

    try {
        const book = await getBookByIdentifier(slug as string);
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        // Check if requesting draft version
        if (version === 'draft') {
            if (!hasValidAccessToken(req)) {
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

            const publishedVersion = book.publishedVersionId
                ? await BookVersion.findOne({ where: { id: book.publishedVersionId } })
                : null;

            const publishedChapters = publishedVersion
                ? await Chapter.findAll({
                    where: { bookVersionId: publishedVersion.id }
                })
                : [];

            res.json({
                ...book.dataValues,
                publishedVersion: publishedVersion
                    ? { ...publishedVersion.dataValues, chapters: publishedChapters }
                    : null,
                version: { ...draftVersion.dataValues, chapters },
                versionStatus: 'draft'
            });
        } else {
            // Get published version
            if (!book.publishedVersionId) {
                return res.status(404).json({ error: "Book not found" });
            }

            const publishedVersion = await BookVersion.findOne({
                where: { id: book.publishedVersionId }
            });

            if (!publishedVersion) {
                return res.status(404).json({ error: "Book not found" });
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
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.use(requireAccessToken);

router.post("/saveDraft", async (req: Request, res: Response) => {
    const { book, scope = 'all', currentChapter, currentChapterNumber } = req.body;

    try {
        if (book.id) {
            // Update existing book
            const existingBook = await Book.findOne({ where: { id: book.id } });
            
            if (existingBook) {
                const slug = await buildUniqueSlug(book.title, existingBook.id);
                await existingBook.update({
                    slug,
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

                if (scope === 'current' && currentChapter) {
                    const chapterNumber = currentChapterNumber ?? currentChapter.chapterNumber;
                    const existingChapter = await Chapter.findOne({
                        where: {
                            bookVersionId: draftVersion.id,
                            chapterNumber
                        }
                    });

                    if (existingChapter) {
                        await existingChapter.update({
                            title: currentChapter.title,
                            content: currentChapter.content,
                        });
                    } else {
                        await Chapter.create({
                            bookVersionId: draftVersion.id,
                            chapterNumber,
                            title: currentChapter.title,
                            content: currentChapter.content,
                        });
                    }

                    return res.json({ id: existingBook.id, slug: existingBook.slug, versionId: draftVersion.id });
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
        
                return res.json({ id: existingBook.id, slug: existingBook.slug, versionId: draftVersion.id });
            }
        }

        // Create new book
        const slug = await buildUniqueSlug(book.title);
        const newBook = await Book.create({
            slug,
            title: book.title,
            description: book.description,
        });

        // Create working draft version
        const draftVersion = await BookVersion.create({
            bookId: newBook.id,
            status: 'draft',
            isWorkingDraft: true
        });

        if (scope === 'current' && currentChapter) {
            await Chapter.create({
                bookVersionId: draftVersion.id,
                chapterNumber: currentChapterNumber ?? currentChapter.chapterNumber,
                title: currentChapter.title,
                content: currentChapter.content,
            });

            return res.json({ id: newBook.id, slug: newBook.slug, versionId: draftVersion.id });
        }

        const chaptersToCreate = book.chapters.map((chapter: any) => ({
            bookVersionId: draftVersion.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
        }));

        await Chapter.bulkCreate(chaptersToCreate);

        return res.json({ id: newBook.id, slug: newBook.slug, versionId: draftVersion.id });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/publish", async (req: Request, res: Response) => {
    const { book, scope = 'all', currentChapter, currentChapterNumber } = req.body;

    try {
        const existingBook = book.id
            ? await Book.findOne({ where: { id: book.id } })
            : await Book.create({
                slug: await buildUniqueSlug(book.title),
                title: book.title,
                description: book.description,
            });

        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        const slug = await buildUniqueSlug(book.title, existingBook.id);

        // Update book metadata
        await existingBook.update({
            slug,
            title: book.title,
            description: book.description,
        });

        if (scope === 'current' && currentChapter) {
            const chapterNumberToReplace = Number(currentChapterNumber ?? currentChapter.chapterNumber);

            if (Number.isNaN(chapterNumberToReplace)) {
                return res.status(400).json({ error: "A valid currentChapterNumber is required" });
            }

            let publishedVersion = existingBook.publishedVersionId
                ? await BookVersion.findOne({ where: { id: existingBook.publishedVersionId } })
                : null;

            if (!publishedVersion) {
                publishedVersion = await BookVersion.create({
                    bookId: existingBook.id,
                    status: 'published',
                    isWorkingDraft: false
                });
            }

            const existingChapter = await Chapter.findOne({
                where: {
                    bookVersionId: publishedVersion.id,
                    chapterNumber: chapterNumberToReplace
                }
            });

            if (existingChapter) {
                await existingChapter.update({
                    title: currentChapter.title,
                    content: currentChapter.content,
                });
            } else {
                await Chapter.create({
                    bookVersionId: publishedVersion.id,
                    chapterNumber: chapterNumberToReplace,
                    title: currentChapter.title,
                    content: currentChapter.content,
                });
            }

            await existingBook.update({
                slug,
                publishedVersionId: publishedVersion.id
            });

            return res.json({ id: existingBook.id, slug: existingBook.slug, versionId: publishedVersion.id });
        }

        // Create published version
        const publishedVersion = await BookVersion.create({
            bookId: existingBook.id,
            status: 'published',
            isWorkingDraft: false
        });

        const chaptersToPublish = book.chapters.map((chapter: any) => ({
                bookVersionId: publishedVersion.id,
                chapterNumber: chapter.chapterNumber,
                title: chapter.title,
                content: chapter.content,
            }));

        await Chapter.bulkCreate(chaptersToPublish);

        if (scope !== 'current') {
            // Keep the working draft aligned with the just-published content so
            // republishing does not leave stale draft-change indicators behind.
            const workingDraft = await BookVersion.findOne({
                where: {
                    bookId: existingBook.id,
                    isWorkingDraft: true
                }
            });

            if (workingDraft) {
                await Chapter.destroy({ where: { bookVersionId: workingDraft.id } });
                await Chapter.bulkCreate(
                    chaptersToPublish.map((chapter: any) => ({
                        ...chapter,
                        bookVersionId: workingDraft.id
                    }))
                );
            }
        }

        // Update book to point to published version
        await existingBook.update({
            slug,
            publishedVersionId: publishedVersion.id
        });

        return res.json({ id: existingBook.id, slug: existingBook.slug, versionId: publishedVersion.id });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/convertToDraft", async (req: Request, res: Response) => {
    const { book, id, scope = 'all', currentChapterNumber } = req.body;
    const bookId = book?.id ?? id;

    try {
        if (!bookId) {
            return res.status(400).json({ error: "Book must have an id to unpublish" });
        }

        const existingBook = await Book.findOne({ where: { id: bookId } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        if (scope === 'current') {
            if (!existingBook.publishedVersionId) {
                return res.status(400).json({ error: "Only published books can unpublish a chapter" });
            }

            const chapterNumberToRemove = Number(currentChapterNumber);
            if (Number.isNaN(chapterNumberToRemove)) {
                return res.status(400).json({ error: "A valid currentChapterNumber is required" });
            }

            const publishedVersion = await BookVersion.findOne({
                where: { id: existingBook.publishedVersionId }
            });

            if (!publishedVersion) {
                return res.status(404).json({ error: "Published version not found" });
            }

            const publishedChapters = await Chapter.findAll({
                where: { bookVersionId: publishedVersion.id },
                order: [['chapterNumber', 'ASC']]
            });

            const chaptersToKeep = publishedChapters.filter(chapter => chapter.chapterNumber !== chapterNumberToRemove);

            if (chaptersToKeep.length === 0) {
                await existingBook.update({
                    publishedVersionId: null,
                    isFeatured: false
                });

                return res.json({ message: "Book converted to draft successfully", versionId: null });
            }

            const nextPublishedVersion = await BookVersion.create({
                bookId: existingBook.id,
                status: 'published',
                isWorkingDraft: false
            });

            await Chapter.bulkCreate(
                chaptersToKeep.map((chapter: any) => ({
                    bookVersionId: nextPublishedVersion.id,
                    chapterNumber: chapter.chapterNumber,
                    title: chapter.title,
                    content: chapter.content,
                }))
            );

            await existingBook.update({
                publishedVersionId: nextPublishedVersion.id
            });

            return res.json({ message: "Chapter unpublished successfully", versionId: nextPublishedVersion.id });
        }

        // Unpublish by clearing publishedVersionId
        await existingBook.update({ 
            publishedVersionId: null,
            isFeatured: false 
        });

        res.json({ message: "Book converted to draft successfully", versionId: null });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
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
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
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
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;