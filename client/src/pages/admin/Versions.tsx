import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/versions.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
}

interface ChapterRevision {
    id?: number;
    chapterNumber: number;
    revisionNumber: number;
    title: string;
    content: string | null;
    sourceBookVersionId: number | null;
    createdByLabel: string;
    createdAt?: string;
}

interface DraftBookResponse extends BookSummary {
    chapterRevisions?: ChapterRevision[];
}

interface VersionRow {
    id: string;
    bookId: number;
    bookSlug: string;
    bookTitle: string;
    chapterNumber: number;
    revisionNumber: number;
    title: string;
    content: string | null;
    sourceBookVersionId: number | null;
    createdByLabel: string;
    createdAt?: string;
    wordCount: number;
    isLatestForChapter: boolean;
}

export default function Versions() {
    const [versions, setVersions] = useState<VersionRow[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partialErrorCount, setPartialErrorCount] = useState(0);

    useEffect(() => {
        setPageTitle("Versions");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchVersions() {
            setLoading(true);
            setError("");
            setPartialErrorCount(0);

            try {
                const booksRes = await apiFetch("/api/books", { toast: false });
                if (!booksRes.ok) {
                    setError("Could not load versions.");
                    return;
                }

                const bookList = await booksRes.json() as BookSummary[];
                const settledBooks = await Promise.allSettled(
                    bookList.map(async (book) => {
                        const res = await apiFetch(`/api/books/${book.slug}?version=draft`, { toast: false });
                        if (!res.ok) {
                            throw new Error(`Could not load ${book.title}`);
                        }

                        return await res.json() as DraftBookResponse;
                    })
                );

                if (!isMounted) {
                    return;
                }

                const loadedBooks = settledBooks
                    .filter((result): result is PromiseFulfilledResult<DraftBookResponse> => result.status === "fulfilled")
                    .map((result) => result.value);

                setBooks(bookList);
                setVersions(loadedBooks.flatMap(toVersionRows).sort(compareVersionRows));
                setPartialErrorCount(settledBooks.filter((result) => result.status === "rejected").length);
            } catch {
                if (isMounted) {
                    setError("Could not load versions.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchVersions();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredVersions = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return versions.filter((version) => {
            if (selectedBookSlug !== "all" && version.bookSlug !== selectedBookSlug) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return version.title.toLowerCase().includes(normalizedSearch)
                || version.bookTitle.toLowerCase().includes(normalizedSearch)
                || version.createdByLabel.toLowerCase().includes(normalizedSearch)
                || String(version.chapterNumber).includes(normalizedSearch)
                || String(version.revisionNumber).includes(normalizedSearch);
        });
    }, [searchTerm, selectedBookSlug, versions]);

    const columns: DatatableColumn<VersionRow>[] = [
        {
            key: "version",
            header: "Version",
            render: (version) => (
                <Link to={`/admin/book/${version.bookSlug}#versions`} className="datatable-link version-title-link">
                    <span>Chapter {version.chapterNumber} / Revision {version.revisionNumber}</span>
                    <strong>{version.title}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (version) => <Link to={`/admin/book/${version.bookSlug}#versions`} className="datatable-link">{version.bookTitle}</Link>,
        },
        {
            key: "state",
            header: "State",
            render: (version) => (
                <span className={`status-pill ${version.isLatestForChapter ? "current" : "archived"}`}>
                    {version.isLatestForChapter ? "Latest" : "Snapshot"}
                </span>
            ),
            width: 120,
        },
        {
            key: "words",
            header: "Words",
            render: (version) => version.wordCount.toLocaleString(),
            width: 100,
        },
        {
            key: "createdBy",
            header: "Created By",
            render: (version) => version.createdByLabel,
            width: 140,
        },
        {
            key: "createdAt",
            header: "Created",
            render: (version) => version.createdAt ? (
                <span title={formatDateTitle(version.createdAt)}>{formatDate(version.createdAt)}</span>
            ) : "-",
            width: 140,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id="versionsView" className="admin-section">
                <div id="versionsHeader">
                    <div id="versionsHeaderLeft">
                        <div>Versions</div>
                        <div>Browse chapter revision snapshots across every book.</div>
                    </div>
                    <div id="versionsHeaderRight">
                        <input
                            id="searchVersionsInput"
                            type="text"
                            placeholder="Search versions..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <select value={selectedBookSlug} onChange={(event) => setSelectedBookSlug(event.target.value)}>
                            <option value="all">All Books</option>
                            {books.map((book) => (
                                <option key={book.id} value={book.slug}>{book.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {partialErrorCount > 0 && (
                    <div className="admin-state warning">
                        {partialErrorCount} {partialErrorCount === 1 ? "book could" : "books could"} not be loaded.
                    </div>
                )}

                {loading ? (
                    <div className="admin-state">Loading versions...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <Datatable
                            title="All Versions"
                            columns={columns}
                            rows={filteredVersions}
                            getRowKey={(version) => version.id}
                            emptyMessage="No versions found."
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function toVersionRows(book: DraftBookResponse): VersionRow[] {
    const revisions = book.chapterRevisions ?? [];
    const latestRevisionByChapter = revisions.reduce((latestByChapter, revision) => {
        const currentLatest = latestByChapter.get(revision.chapterNumber);

        if (!currentLatest || revision.revisionNumber > currentLatest) {
            latestByChapter.set(revision.chapterNumber, revision.revisionNumber);
        }

        return latestByChapter;
    }, new Map<number, number>());

    return revisions.map((revision) => ({
        id: `${book.id}-${revision.chapterNumber}-${revision.revisionNumber}`,
        bookId: book.id,
        bookSlug: book.slug,
        bookTitle: book.title,
        chapterNumber: revision.chapterNumber,
        revisionNumber: revision.revisionNumber,
        title: revision.title,
        content: revision.content,
        sourceBookVersionId: revision.sourceBookVersionId,
        createdByLabel: revision.createdByLabel,
        createdAt: revision.createdAt,
        wordCount: countWords(revision.content ?? ""),
        isLatestForChapter: latestRevisionByChapter.get(revision.chapterNumber) === revision.revisionNumber,
    }));
}

function compareVersionRows(a: VersionRow, b: VersionRow) {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (aTime !== bTime) {
        return bTime - aTime;
    }

    return b.revisionNumber - a.revisionNumber;
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
