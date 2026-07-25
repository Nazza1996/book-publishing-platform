import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import '../../styles/admin/all-books.scss';
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { Search } from "../../components/Search";

type BookStatus = "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
    genres?: string[];
    status?: BookStatus;
    updatedAt: string;
    releaseSummary?: Record<string, {
        released: number;
        scheduled: number;
    }>;
    nextRelease?: {
        channel: string;
        chapterNumber: number;
        releaseAt: string;
    } | null;
}

const statusLabels: Record<BookStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    finished: "Finished",
    cancelled: "Cancelled",
};

export default function AllBooks() {
    const navigate = useNavigate();
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("All Books");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchBooks() {
            setLoading(true);
            setError("");

            try {
                const res = await apiFetch('/api/books');
                if (!res.ok) {
                    setError("Could not load books.");
                    return;
                }

                const data = await res.json();
                if (isMounted) {
                    setBooks(data);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchBooks();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredBooks = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return books;
        }

        return books.filter(book =>
            book.title.toLowerCase().includes(normalizedSearch)
        );
    }, [books, searchTerm]);

    const summary = useMemo(() => {
        return filteredBooks.reduce(
            (current, book) => {
                const status = book.status ?? "in_progress";

                return {
                    total: current.total + 1,
                    inProgress: current.inProgress + (status === "in_progress" ? 1 : 0),
                    publishedChapters: current.publishedChapters + (book.releaseSummary?.public?.released ?? 0),
                    scheduledReleases: current.scheduledReleases + Object.values(book.releaseSummary ?? {})
                        .reduce((total, channel) => total + channel.scheduled, 0),
                };
            },
            { total: 0, inProgress: 0, publishedChapters: 0, scheduledReleases: 0 }
        );
    }, [filteredBooks]);

    return (
        <div id="adminView">
            <AdminNav />
            <section id="allBooksView" className="admin-section">
                <div id="allBooksHeader">
                    <div id="booksHeaderLeft">
                        <div>Books</div>
                        <div>Create, manage and publish your books.</div>
                    </div>
                    <div id="booksHeaderRight">
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search books..."
                        />
                        <button id="newBookButton" onClick={() => navigate('/admin/new-book')}>New Book</button>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading books...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="books-summary-grid">
                            <SummaryCard label="Total Books" value={summary.total.toLocaleString()} />
                            <SummaryCard label="In Progress" value={summary.inProgress.toLocaleString()} />
                            <SummaryCard label="Published Chapters" value={summary.publishedChapters.toLocaleString()} to="/admin/chapters" />
                            <SummaryCard label="Scheduled Releases" value={summary.scheduledReleases.toLocaleString()} to="/admin/schedule" />
                        </div>

                        <BooksTable
                            books={filteredBooks}
                            onStatusChange={(bookId, status) => {
                                setBooks((current) => current.map((book) =>
                                    book.id === bookId ? { ...book, status } : book
                                ));
                            }}
                        />
                    </>
                )}
            </section>
        </div>
    )
}

function SummaryCard({ label, value, to }: { label: string; value: string; to?: string }) {
    const content = (
        <>
            <span>{label}</span>
            <strong>{value}</strong>
        </>
    );

    return to ? (
        <Link to={to} className="books-summary-card linked">
            {content}
        </Link>
    ) : (
        <div className="books-summary-card">
            {content}
        </div>
    );
}

function BooksTable({
    books,
    onStatusChange
}: {
    books: BookSummary[];
    onStatusChange: (bookId: number, status: BookStatus) => void;
}) {
    const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
    const [openStatusId, setOpenStatusId] = useState<number | null>(null);

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        }).format(date);
    }

    function formatDateTitle(dateString: string) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            month: 'long',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        }).format(date);
    }

    function getStatus(book: BookSummary) {
        return book.status ?? "in_progress";
    }

    async function handleStatusChange(book: BookSummary, status: BookStatus) {
        const previousStatus = getStatus(book);

        onStatusChange(book.id, status);
        setSavingStatusId(book.id);

        try {
            const res = await apiFetch(`/api/books/${book.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!res.ok) {
                onStatusChange(book.id, previousStatus);
            }
        } finally {
            setSavingStatusId(null);
        }
    }

    function renderStatusDropdown(book: BookSummary) {
        return (
            <div
                className="status-dropdown"
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setOpenStatusId(null);
                    }
                }}
            >
                <button
                    type="button"
                    className="status-dropdown-trigger"
                    onClick={() => setOpenStatusId(openStatusId === book.id ? null : book.id)}
                    disabled={savingStatusId === book.id}
                    aria-haspopup="listbox"
                    aria-expanded={openStatusId === book.id}
                    aria-label={`Change status for ${book.title}`}
                >
                    <span className={`status-pill ${statusClassName(getStatus(book))}`}>{statusLabels[getStatus(book)]}</span>
                </button>

                {openStatusId === book.id && (
                    <div className="status-dropdown-menu" role="listbox" aria-label={`Status options for ${book.title}`}>
                        {Object.entries(statusLabels).map(([value, label]) => {
                            const status = value as BookStatus;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    className={`status-dropdown-option ${getStatus(book) === status ? 'active' : ''}`}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        setOpenStatusId(null);
                                        handleStatusChange(book, status);
                                    }}
                                    role="option"
                                    aria-selected={getStatus(book) === status}
                                >
                                    <span className={`status-pill ${statusClassName(status)}`}>{label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    const columns: DatatableColumn<BookSummary>[] = [
        {
            key: "title",
            header: "Title",
            render: (book) => <Link to={`/admin/book/${book.slug}`} className="datatable-link">{book.title}</Link>,
        },
        {
            key: "genres",
            header: "Genres",
            render: (book) => {
                const genres = book.genres || [];
                const genreString = genres.length > 0 ? genres.join(", ") : "-";
                return genreString.length > 50 ? genreString.slice(0, 50) + "..." : genreString;
            },
            title: (book) => {
                const genres = book.genres || [];
                return genres.length > 0 ? genres.join(", ") : "";
            }
        },
        {
            key: "status",
            header: "Status",
            render: renderStatusDropdown,
        },
        {
            key: "updatedAt",
            header: "Last Updated",
            render: (book) => formatDate(book.updatedAt),
            title: (book) => formatDateTitle(book.updatedAt),
        },
        {
            key: "nextRelease",
            header: "Next Release",
            render: (book) => book.nextRelease ? formatDate(book.nextRelease.releaseAt) : "-",
            title: (book) => book.nextRelease ? formatDateTitle(book.nextRelease.releaseAt) : "",
        },
    ];

    return (
        <Datatable
            title="All Books"
            columns={columns}
            rows={books}
            getRowKey={(book) => book.id}
            emptyMessage="No books found."
        />
    )
}

function statusClassName(status: BookStatus) {
    return status.replace(/_/g, "-");
}
