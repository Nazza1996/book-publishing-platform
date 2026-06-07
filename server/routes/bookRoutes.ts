import { Request, Response, Router } from "express";
import { Op } from "sequelize";
import Book from "../models/Book.js";
import BookChannelMetadata, { ReaderChannel } from "../models/BookChannelMetadata.js";
import BookVersion from "../models/BookVersion.js";
import Chapter from "../models/Chapter.js";
import ChapterRevision from "../models/ChapterRevision.js";
import ChapterRelease from "../models/ChapterRelease.js";
import ReaderFeedback from "../models/ReaderFeedback.js";
import ReaderGroup from "../models/ReaderGroup.js";
import ReaderGroupMember from "../models/ReaderGroupMember.js";
import { hasValidAccessToken, requireAccessToken } from "../middleware/auth.js";

const router = Router();
const readerChannels: ReaderChannel[] = ["alpha", "beta", "public"];
const readerChannelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

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

function serializeChannelMetadata(rows: BookChannelMetadata[]) {
    return readerChannels.reduce((metadata, channel) => {
        const row = rows.find((item) => item.channel === channel);

        metadata[channel] = {
            description: row?.description ?? "",
            authorNote: row?.authorNote ?? "",
            releaseLimit: row?.releaseLimit ?? 0,
            nextRelease: row?.nextRelease ?? "",
        };

        return metadata;
    }, {} as Record<ReaderChannel, {
        description: string;
        authorNote: string;
        releaseLimit: number;
        nextRelease: string;
    }>);
}

async function ensureBookChannelMetadata(bookId: number, fallbackDescription = "") {
    for (const channel of readerChannels) {
        const existing = await BookChannelMetadata.findOne({
            where: { bookId, channel }
        });

        if (!existing) {
            await BookChannelMetadata.create({
                bookId,
                channel,
                description: fallbackDescription,
                authorNote: "",
                releaseLimit: 0,
                nextRelease: "",
            });
        }
    }
}

async function ensureReaderGroups(bookId: number) {
    for (const channel of readerChannels) {
        const existing = await ReaderGroup.findOne({
            where: { bookId, channel }
        });

        if (!existing) {
            await ReaderGroup.create({
                bookId,
                channel,
                name: readerChannelLabels[channel],
                description: "",
                memberCount: 0,
            });
        }
    }
}

async function getBookReleaseData(book: Book) {
    await ensureBookChannelMetadata(book.id, book.description);
    await ensureReaderGroups(book.id);

    const channelMetadataRows = await BookChannelMetadata.findAll({
        where: { bookId: book.id },
        order: [["channel", "ASC"]]
    });

    const releases = await ChapterRelease.findAll({
        where: { bookId: book.id },
        order: [["releaseAt", "ASC"], ["chapterNumber", "ASC"]]
    });

    const readerGroups = await ReaderGroup.findAll({
        where: { bookId: book.id },
        include: [{ model: ReaderGroupMember, as: "members" }],
        order: [["channel", "ASC"]]
    });

    const feedback = await ReaderFeedback.findAll({
        where: { bookId: book.id },
        order: [["createdAt", "DESC"]]
    });

    const chapterRevisions = await ChapterRevision.findAll({
        where: { bookId: book.id },
        order: [["chapterNumber", "ASC"], ["revisionNumber", "DESC"]]
    });

    return {
        channelMetadata: serializeChannelMetadata(channelMetadataRows),
        releases,
        readerGroups,
        feedback,
        chapterRevisions
    };
}

async function getBookReleaseSummary(bookId: number) {
    const releases = await ChapterRelease.findAll({
        where: { bookId },
        attributes: ["channel", "status", "chapterNumber"]
    });

    return readerChannels.reduce((summary, channel) => {
        const channelReleases = releases.filter((release) => release.channel === channel);

        summary[channel] = {
            released: channelReleases.filter((release) => release.status === "released").length,
            scheduled: channelReleases.filter((release) => release.status === "scheduled").length,
        };

        return summary;
    }, {} as Record<ReaderChannel, { released: number; scheduled: number }>);
}

async function syncBookChannelMetadata(bookId: number, input: any, fallbackDescription: string) {
    await ensureBookChannelMetadata(bookId, fallbackDescription);

    if (!input || typeof input !== "object") {
        return;
    }

    for (const channel of readerChannels) {
        const metadata = input[channel];

        if (!metadata || typeof metadata !== "object") {
            continue;
        }

        await BookChannelMetadata.update(
            {
                description: metadata.description ?? fallbackDescription,
                authorNote: metadata.authorNote ?? "",
                releaseLimit: Number.isFinite(Number(metadata.releaseLimit)) ? Number(metadata.releaseLimit) : 0,
                nextRelease: metadata.nextRelease ?? "",
            },
            {
                where: { bookId, channel }
            }
        );
    }
}

async function ensureWorkingDraftVersion(book: Book) {
    let draftVersion = await BookVersion.findOne({
        where: { bookId: book.id, isWorkingDraft: true }
    });

    if (draftVersion) {
        return draftVersion;
    }

    draftVersion = await BookVersion.create({
        bookId: book.id,
        isWorkingDraft: true
    });

    const sourceVersion = await BookVersion.findOne({
        where: { bookId: book.id },
        order: [
            ["isWorkingDraft", "DESC"],
            ["updatedAt", "DESC"]
        ]
    });

    if (!sourceVersion) {
        return draftVersion;
    }

    const sourceChapters = await Chapter.findAll({
        where: { bookVersionId: sourceVersion.id },
        order: [["chapterNumber", "ASC"]]
    });

    if (sourceChapters.length > 0) {
        await Chapter.bulkCreate(sourceChapters.map((chapter: any) => ({
            bookVersionId: draftVersion!.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
        })));
    }

    return draftVersion;
}

router.get("/", async (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const books = await Book.findAll();
        
        const booksWithReleaseData = await Promise.all(
            books.map(async (book: any) => {
                const releaseSummary = await getBookReleaseSummary(book.id);
                const nextRelease = await ChapterRelease.findOne({
                    where: {
                        bookId: book.id,
                        status: "scheduled",
                        releaseAt: { [Op.gt]: new Date() }
                    },
                    order: [["releaseAt", "ASC"]],
                    attributes: ["channel", "chapterNumber", "releaseAt"]
                });
                
                return {
                    ...book.dataValues,
                    releaseSummary,
                    nextRelease
                };
            })
        );
        
        res.json(booksWithReleaseData);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

async function getReleasedPublicBooks() {
    const releasedPublicRows = await ChapterRelease.findAll({
        where: { channel: "public", status: "released" },
        attributes: ["bookId"],
        group: ["bookId"]
    });
    const bookIds = releasedPublicRows.map((release) => release.bookId);

    if (bookIds.length === 0) {
        return [];
    }

    return Book.findAll({
        where: { id: { [Op.in]: bookIds } }
    });
}

router.get("/released", async (req: Request, res: Response) => {
    try {
        const books = await getReleasedPublicBooks();
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch released books" });
    }
});

router.get("/featured", async (req: Request, res: Response) => {
    try {
        const releasedPublicRows = await ChapterRelease.findAll({
            where: { channel: "public", status: "released" },
            attributes: ["bookId"],
            group: ["bookId"]
        });
        const bookIds = releasedPublicRows.map((release) => release.bookId);

        if (bookIds.length === 0) {
            return res.json([]);
        }

        const books = await Book.findAll({
            where: { 
                isFeatured: true,
                id: { [Op.in]: bookIds }
            }
        });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch featured books" });
    }
});

router.get("/:slug", async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { version = 'public' } = req.query;

    try {
        const book = await getBookByIdentifier(slug as string);
        if (!book) {
            return res.status(404).json({ error: "Book not found" });
        }

        if (version === 'draft') {
            if (!hasValidAccessToken(req)) {
                return res.status(401).json({ error: "Not authenticated" });
            }
            
            const draftVersion = await ensureWorkingDraftVersion(book);

            const chapters = await Chapter.findAll({ 
                where: { bookVersionId: draftVersion.id }
            });

            const releaseData = await getBookReleaseData(book);

            res.json({
                ...book.dataValues,
                ...releaseData,
                version: { ...draftVersion.dataValues, chapters },
                versionStatus: 'working_draft'
            });
        } else {
            const publicReleases = await ChapterRelease.findAll({
                where: {
                    bookId: book.id,
                    channel: "public",
                    status: "released"
                },
                order: [["chapterNumber", "ASC"]]
            });

            if (publicReleases.length === 0) {
                return res.status(404).json({ error: "Book not found" });
            }

            const chapters = publicReleases.map((release) => ({
                id: release.id,
                chapterNumber: release.chapterNumber,
                title: release.title,
                content: release.content,
                updatedAt: release.updatedAt,
            }));
            const releaseData = await getBookReleaseData(book);

            res.json({
                ...book.dataValues,
                ...releaseData,
                version: { chapters },
                versionStatus: 'public_release'
            });
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.use(requireAccessToken);

router.post("/saveDraft", async (req: Request, res: Response) => {
    const { book, scope = 'all', currentChapter, currentChapterNumber, channelMetadata } = req.body;

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
                    status: book.status ?? existingBook.status,
                });
                await syncBookChannelMetadata(existingBook.id, channelMetadata ?? book.channelMetadata, book.description);
        
                // Get or create working draft version
                const draftVersion = await ensureWorkingDraftVersion(existingBook);

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
            status: book.status ?? "in_progress",
        });
        await syncBookChannelMetadata(newBook.id, channelMetadata ?? book.channelMetadata, book.description);

        // Create working draft version
        const draftVersion = await BookVersion.create({
            bookId: newBook.id,
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

        const publicReleaseCount = await ChapterRelease.count({
            where: {
                bookId: existingBook.id,
                channel: "public",
                status: "released"
            }
        });

        if (!publicReleaseCount) {
            return res.status(400).json({ error: "Only books with public releases can be featured" });
        }

        await existingBook.update({ isFeatured: !existingBook.isFeatured });

        res.json({ message: "Book featured status toggled successfully" });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["not_started", "in_progress", "on_hold", "finished", "cancelled"];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "A valid book status is required" });
    }

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        await existingBook.update({ status });
        res.json(existingBook);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/:id/releases", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { channel, chapterNumber, status = "scheduled", releaseAt = null, title, content } = req.body;

    if (!readerChannels.includes(channel)) {
        return res.status(400).json({ error: "A valid reader channel is required" });
    }

    const normalizedChapterNumber = Number(chapterNumber);
    if (!normalizedChapterNumber || Number.isNaN(normalizedChapterNumber)) {
        return res.status(400).json({ error: "A valid chapter number is required" });
    }

    if (!["scheduled", "released"].includes(status)) {
        return res.status(400).json({ error: "A valid release status is required" });
    }

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        let snapshotTitle = typeof title === "string" ? title : "";
        let snapshotContent = typeof content === "string" ? content : "";

        if (!snapshotTitle || !snapshotContent) {
            const draftVersion = await ensureWorkingDraftVersion(existingBook);
            const chapter = await Chapter.findOne({
                where: {
                    bookVersionId: draftVersion.id,
                    chapterNumber: normalizedChapterNumber,
                }
            });

            if (!chapter) {
                return res.status(404).json({ error: "Chapter not found" });
            }

            snapshotTitle ||= chapter.title;
            snapshotContent ||= chapter.content;
        }

        const [release] = await ChapterRelease.findOrCreate({
            where: {
                bookId: existingBook.id,
                channel,
                chapterNumber: normalizedChapterNumber,
            },
            defaults: {
                bookId: existingBook.id,
                channel,
                chapterNumber: normalizedChapterNumber,
                title: snapshotTitle,
                content: snapshotContent,
                status,
                releaseAt: releaseAt ? new Date(releaseAt) : null,
            }
        });

        if (!release.isNewRecord) {
            await release.update({
                title: snapshotTitle,
                content: snapshotContent,
                status,
                releaseAt: releaseAt ? new Date(releaseAt) : null,
            });
        }

        res.json(release);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.delete("/:id/releases/:releaseId", async (req: Request, res: Response) => {
    const { id, releaseId } = req.params;

    try {
        const release = await ChapterRelease.findOne({
            where: {
                id: releaseId,
                bookId: id,
            }
        });

        if (!release) {
            return res.status(404).json({ error: "Release not found" });
        }

        await release.destroy();

        res.json({ message: "Release removed" });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/:id/reader-groups/:groupId/members", async (req: Request, res: Response) => {
    const { id, groupId } = req.params;
    const { username, status = "active" } = req.body;

    if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Reader username is required" });
    }

    try {
        const group = await ReaderGroup.findOne({
            where: { id: groupId, bookId: id }
        });

        if (!group) {
            return res.status(404).json({ error: "Reader group not found" });
        }

        const [member, created] = await ReaderGroupMember.findOrCreate({
            where: { readerGroupId: group.id, username },
            defaults: {
                readerGroupId: group.id,
                username,
                status,
                joinedAt: new Date(),
            }
        });

        if (!created) {
            await member.update({
                username,
                status,
            });
        }

        const memberCount = await ReaderGroupMember.count({
            where: { readerGroupId: group.id, status: { [Op.ne]: "removed" } }
        });
        await group.update({ memberCount });

        res.json({ ...member.dataValues, readerGroupId: group.id });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/:id/feedback", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { channel = "alpha", chapterNumber = null, readerUsername = "Reader", comment } = req.body;

    if (!readerChannels.includes(channel)) {
        return res.status(400).json({ error: "A valid reader channel is required" });
    }

    if (!comment || typeof comment !== "string") {
        return res.status(400).json({ error: "Feedback comment is required" });
    }

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        const feedback = await ReaderFeedback.create({
            bookId: existingBook.id,
            channel,
            chapterNumber: chapterNumber ? Number(chapterNumber) : null,
            readerUsername,
            comment,
            status: "open",
        });

        res.json(feedback);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.patch("/:id/feedback/:feedbackId", async (req: Request, res: Response) => {
    const { id, feedbackId } = req.params;
    const { status } = req.body;

    if (!["open", "reviewed", "resolved"].includes(status)) {
        return res.status(400).json({ error: "A valid feedback status is required" });
    }

    try {
        const feedback = await ReaderFeedback.findOne({
            where: { id: feedbackId, bookId: id }
        });

        if (!feedback) {
            return res.status(404).json({ error: "Feedback not found" });
        }

        await feedback.update({ status });
        res.json(feedback);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/:id/chapters/:chapterNumber/revisions", async (req: Request, res: Response) => {
    const { id, chapterNumber } = req.params;
    const normalizedChapterNumber = Number(chapterNumber);

    if (!normalizedChapterNumber || Number.isNaN(normalizedChapterNumber)) {
        return res.status(400).json({ error: "A valid chapter number is required" });
    }

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        const draftVersion = await ensureWorkingDraftVersion(existingBook);

        const chapter = await Chapter.findOne({
            where: {
                bookVersionId: draftVersion.id,
                chapterNumber: normalizedChapterNumber,
            }
        });

        if (!chapter) {
            return res.status(404).json({ error: "Chapter not found" });
        }

        const latestRevision = await ChapterRevision.findOne({
            where: { bookId: existingBook.id, chapterNumber: normalizedChapterNumber },
            order: [["revisionNumber", "DESC"]]
        });

        const revision = await ChapterRevision.create({
            bookId: existingBook.id,
            chapterNumber: normalizedChapterNumber,
            revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
            title: chapter.title,
            content: chapter.content,
            sourceBookVersionId: draftVersion.id,
            createdByLabel: "Admin",
        });

        res.json(revision);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

router.post("/:id/chapters/:chapterNumber/revisions/:revisionId/restore", async (req: Request, res: Response) => {
    const { id, chapterNumber, revisionId } = req.params;
    const normalizedChapterNumber = Number(chapterNumber);

    if (!normalizedChapterNumber || Number.isNaN(normalizedChapterNumber)) {
        return res.status(400).json({ error: "A valid chapter number is required" });
    }

    try {
        const existingBook = await Book.findOne({ where: { id } });
        if (!existingBook) {
            return res.status(404).json({ error: "Book not found" });
        }

        const revision = await ChapterRevision.findOne({
            where: {
                id: revisionId,
                bookId: existingBook.id,
                chapterNumber: normalizedChapterNumber,
            }
        });

        if (!revision) {
            return res.status(404).json({ error: "Revision not found" });
        }

        const draftVersion = await ensureWorkingDraftVersion(existingBook);

        const [chapter] = await Chapter.findOrCreate({
            where: {
                bookVersionId: draftVersion.id,
                chapterNumber: normalizedChapterNumber,
            },
            defaults: {
                bookVersionId: draftVersion.id,
                chapterNumber: normalizedChapterNumber,
                title: revision.title,
                content: revision.content ?? "",
            }
        });

        if (!chapter.isNewRecord) {
            await chapter.update({
                title: revision.title,
                content: revision.content ?? "",
            });
        }

        res.json(chapter);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
