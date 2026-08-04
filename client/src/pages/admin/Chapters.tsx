import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/chapters.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { SelectPicker } from "../../components/SelectPicker";
import { Search } from "../../components/Search";

type BookStatus = "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";
type ReleaseStatus = "scheduled" | "released";
type ReaderChannel = "alpha" | "beta" | "public";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
    status?: BookStatus;
}

interface Chapter {
    id?: number;
    chapterNumber: number;
    title: string;
    content: string;
    updatedAt?: string;
}

interface ChapterRelease {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number;
    status: ReleaseStatus;
    releaseAt: string | null;
}

interface DraftBookResponse extends BookSummary {
    version?: {
        chapters?: Chapter[];
    };
    releases?: ChapterRelease[];
}

interface ChapterRow {
    id: string;
    bookId: number;
    bookSlug: string;
    bookTitle: string;
    bookStatus: BookStatus;
    chapterNumber: number;
    chapterTitle: string;
    wordCount: number;
    updatedAt?: string;
    releasedCount: number;
    scheduledCount: number;
}

const bookStatusLabels: Record<BookStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    finished: "Finished",
    cancelled: "Cancelled",
};

export default function Chapters() {
    const [chapters, setChapters] = useState<ChapterRow[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | BookStatus>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("Chapters");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchChapters() {
            setLoading(true);
            setError("");

            try {
                const chaptersRes = await apiFetch("/api/books/chapters", { toast: false });
                if (!chaptersRes.ok) {
                    setError("Could not load chapters.");
                    return;
                }

                const loadedBooks = await chaptersRes.json() as DraftBookResponse[];

                if (!isMounted) {
                    return;
                }

                setBooks(loadedBooks.map(({ id, slug, title, status }) => ({ id, slug, title, status })));
                setChapters(loadedBooks.flatMap(toChapterRows));
            } catch {
                if (isMounted) {
                    setError("Could not load chapters.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchChapters();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredChapters = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return chapters.filter((chapter) => {
            if (selectedBookSlug !== "all" && chapter.bookSlug !== selectedBookSlug) {
                return false;
            }

            if (selectedStatus !== "all" && chapter.bookStatus !== selectedStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return chapter.chapterTitle.toLowerCase().includes(normalizedSearch)
                || chapter.bookTitle.toLowerCase().includes(normalizedSearch)
                || String(chapter.chapterNumber).includes(normalizedSearch);
        });
    }, [chapters, searchTerm, selectedBookSlug, selectedStatus]);

    const totals = useMemo(() => {
        return filteredChapters.reduce(
            (summary, chapter) => ({
                chapters: summary.chapters + 1,
                words: summary.words + chapter.wordCount,
                released: summary.released + (chapter.releasedCount > 0 ? 1 : 0),
                scheduled: summary.scheduled + (chapter.scheduledCount > 0 ? 1 : 0),
            }),
            { chapters: 0, words: 0, released: 0, scheduled: 0 }
        );
    }, [filteredChapters]);

    const columns: DatatableColumn<ChapterRow>[] = [
        {
            key: "chapter",
            header: "Chapter",
            render: (chapter) => (
                <Link to={`/admin/book/${chapter.bookSlug}#chapters`} className="datatable-link chapter-title-link">
                    <span>Chapter {chapter.chapterNumber}</span>
                    <strong>{chapter.chapterTitle}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (chapter) => <Link to={`/admin/book/${chapter.bookSlug}`} className="datatable-link">{chapter.bookTitle}</Link>,
        },
        {
            key: "status",
            header: "Book Status",
            render: (chapter) => <span className={`status-pill ${statusClassName(chapter.bookStatus)}`}>{bookStatusLabels[chapter.bookStatus]}</span>,
            width: 150,
        },
        {
            key: "words",
            header: "Words",
            render: (chapter) => chapter.wordCount.toLocaleString(),
            width: 110,
        },
        {
            key: "releaseState",
            header: "Release State",
            render: renderReleaseState,
            width: 170,
        },
        {
            key: "updatedAt",
            header: "Updated",
            render: (chapter) => chapter.updatedAt ? (
                <span title={formatDateTitle(chapter.updatedAt)}>{formatDate(chapter.updatedAt)}</span>
            ) : "-",
            width: 140,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id="chaptersView" className="admin-section">
                <div id="chaptersHeader">
                    <div id="chaptersHeaderLeft">
                        <div>Chapters</div>
                        <div>Review draft chapters across every book.</div>
                    </div>
                    <div id="chaptersHeaderRight">
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search chapters..."
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Books" }, ...books.map((book) => ({ value: book.slug, label: book.title }))]}
                            onSelect={setSelectedBookSlug}
                            currentOption={selectedBookSlug}
                            width={350}
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Statuses" }, ...Object.entries(bookStatusLabels).map(([status, label]) => ({ value: status, label }))]}
                            onSelect={setSelectedStatus}
                            currentOption={selectedStatus}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading chapters...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="chapter-summary-grid">
                            <SummaryCard label="Chapters" value={totals.chapters.toLocaleString()} />
                            <SummaryCard label="Words" value={totals.words.toLocaleString()} />
                            <SummaryCard label="Released" value={totals.released.toLocaleString()} />
                            <SummaryCard label="Scheduled" value={totals.scheduled.toLocaleString()} />
                        </div>

                        <Datatable
                            title="All Chapters"
                            columns={columns}
                            rows={filteredChapters}
                            getRowKey={(chapter) => chapter.id}
                            emptyMessage="No chapters found."
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="chapter-summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function toChapterRows(book: DraftBookResponse): ChapterRow[] {
    const releases = book.releases ?? [];
    const chapters = book.version?.chapters ?? [];

    return chapters
        .slice()
        .sort((a, b) => a.chapterNumber - b.chapterNumber)
        .map((chapter) => {
            const chapterReleases = releases.filter((release) => release.chapterNumber === chapter.chapterNumber);

            return {
                id: `${book.id}-${chapter.chapterNumber}`,
                bookId: book.id,
                bookSlug: book.slug,
                bookTitle: book.title,
                bookStatus: book.status ?? "in_progress",
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title || `Chapter ${chapter.chapterNumber}`,
                wordCount: countWords(chapter.content),
                updatedAt: chapter.updatedAt,
                releasedCount: chapterReleases.filter((release) => release.status === "released").length,
                scheduledCount: chapterReleases.filter((release) => release.status === "scheduled").length,
            };
        });
}

function renderReleaseState(chapter: ChapterRow) {
    if (chapter.releasedCount === 0 && chapter.scheduledCount === 0) {
        return <span className="status-pill unreleased">Unreleased</span>;
    }

    return (
        <div className="chapter-release-state">
            {chapter.releasedCount > 0 && <span className="status-pill released">{chapter.releasedCount} released</span>}
            {chapter.scheduledCount > 0 && <span className="status-pill scheduled">{chapter.scheduledCount} scheduled</span>}
        </div>
    );
}

function countWords(content: string) {
    return content.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(new Date(dateString));
}

function formatDateTitle(dateString: string) {
    return new Intl.DateTimeFormat("en-GB", {
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(new Date(dateString));
}

function statusClassName(status: BookStatus) {
    return status.replace(/_/g, "-");
}
