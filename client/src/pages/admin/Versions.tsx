import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/versions.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { SelectPicker } from "../../components/SelectPicker";
import { Search } from "../../components/Search";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
}

interface User {
    id: number;
    username: string;
    role: 'admin' | 'reader';
    active: boolean;
}

interface ChapterRevision {
    id?: number;
    chapterNumber: number;
    revisionNumber: number;
    title: string;
    content: string | null;
    sourceBookVersionId: number | null;
    createdBy: number;
    createdAt?: string;
    bookId: number;
    book: BookSummary;
    creator: User;
}

export default function Versions() {
    const [versions, setVersions] = useState<ChapterRevision[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("Versions");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchVersions() {
            setLoading(true);
            setError("");

            try {
                const booksRes = await apiFetch("/api/books/dropdown", { toast: false });
                if (!booksRes.ok) {
                    setError("Could not load versions.");
                    return;
                }

                const bookList = await booksRes.json() as BookSummary[];

                if (!isMounted) {
                    return;
                }

                const chapterRevisionsRes = await apiFetch("/api/revisions", { toast: false });
                const chapterRevisions = await chapterRevisionsRes.json();

                setBooks(bookList);
                setVersions(chapterRevisions);
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
            if (selectedBookSlug !== "all" && version.book.slug !== selectedBookSlug) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return version.title.toLowerCase().includes(normalizedSearch)
                || version.book.title.toLowerCase().includes(normalizedSearch)
                || version.creator?.username.toLowerCase().includes(normalizedSearch)
                || String(version.chapterNumber).includes(normalizedSearch)
                || String(version.revisionNumber).includes(normalizedSearch);
        });
    }, [searchTerm, selectedBookSlug, versions]);

    function isLatestRevision(revision: ChapterRevision) {
        const revisionsInSameChapter = versions.filter((version) => version.bookId === revision.bookId && version.chapterNumber === revision.chapterNumber);
        
        let isLatest = true;
        revisionsInSameChapter.forEach(current => {
            if (revision.revisionNumber < current.revisionNumber) {
                isLatest = false;
            }
        });

        return isLatest;
    }

    const columns: DatatableColumn<ChapterRevision>[] = [
        {
            key: "version",
            header: "Version",
            render: (version) => (
                <Link to={`/admin/book/${version.book.slug}#versions`} className="datatable-link version-title-link">
                    <span>Chapter {version.chapterNumber} / Revision {version.revisionNumber}</span>
                    <strong>{version.title}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (version) => <Link to={`/admin/book/${version.book.slug}#versions`} className="datatable-link">{version.book.title}</Link>,
        },
        {
            key: "state",
            header: "State",
            render: (version) => (
                <span className={`status-pill ${isLatestRevision(version) ? "current" : "archived"}`}>
                    {isLatestRevision(version) ? "Latest" : "Snapshot"}
                </span>
            ),
            width: 120,
        },
        {
            key: "words",
            header: "Words",
            render: (version) => countWords(version.content!).toLocaleString(),
            width: 100,
        },
        {
            key: "createdBy",
            header: "Created By",
            render: (version) => version.creator?.username || "Unknown User",
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
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search versions..."
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Books" }, ...books.map((book) => ({ value: book.slug, label: book.title }))]}
                            onSelect={setSelectedBookSlug}
                            currentOption={selectedBookSlug}
                            width={350}
                        />
                    </div>
                </div>

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
                            getRowKey={(version) => version.id!}
                            emptyMessage="No versions found."
                        />
                    </>
                )}
            </section>
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
