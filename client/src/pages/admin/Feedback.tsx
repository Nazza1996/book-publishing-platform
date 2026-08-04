import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle, toast } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/readers.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { SelectPicker } from "../../components/SelectPicker";
import { Search } from "../../components/Search";

type ReaderChannel = "alpha" | "beta" | "public";
type FeedbackStatus = "open" | "reviewed" | "resolved";
type FeedbackReadFilter = "all" | "unread" | "read";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
}

interface ReaderAccount {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
}

interface ReaderFeedbackItem {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number | null;
    readerUserId?: number | null;
    readerUsername: string;
    comment: string;
    status: FeedbackStatus;
    createdAt?: string;
    updatedAt?: string;
    reader?: ReaderAccount | null;
}

interface FeedbackRow {
    id: string;
    feedbackId?: number;
    Book: BookSummary;
    channel: ReaderChannel;
    chapterNumber: number | null;
    readerUsername: string;
    comment: string;
    status: FeedbackStatus;
    createdAt?: string;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

export default function Feedback() {
    const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedChannel, setSelectedChannel] = useState<"all" | ReaderChannel>("all");
    const [selectedReadFilter, setSelectedReadFilter] = useState<FeedbackReadFilter>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [savingFeedbackId, setSavingFeedbackId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("Feedback");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchFeedback() {
            setLoading(true);
            setError("");

            try {

                const [feedbackRes, booksRes] = await Promise.all([
                    apiFetch("/api/feedback", { toast: false }),
                    apiFetch("/api/books/dropdown", { toast: false }),
                ]);

                if (!feedbackRes.ok) {
                    setError("Could not load feedback.");
                    return;
                }

                const feedbackList = await feedbackRes.json() as FeedbackRow[];
                const booksList = await booksRes.json() as BookSummary[];

                if (!isMounted) {
                    return;
                }

                setBooks(booksList);
                setFeedback(feedbackList);
            } catch {
                if (isMounted) {
                    setError("Could not load feedback.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchFeedback();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredFeedback = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return feedback.filter((item) => {
            if (selectedBookSlug !== "all" && item.Book.slug !== selectedBookSlug) {
                return false;
            }

            if (selectedChannel !== "all" && item.channel !== selectedChannel) {
                return false;
            }

            if (selectedReadFilter === "read" && !isFeedbackRead(item.status)) {
                return false;
            }

            if (selectedReadFilter === "unread" && isFeedbackRead(item.status)) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return item.comment.toLowerCase().includes(normalizedSearch)
                || item.readerUsername.toLowerCase().includes(normalizedSearch)
                || item.Book.title.toLowerCase().includes(normalizedSearch)
                || channelLabels[item.channel].toLowerCase().includes(normalizedSearch)
                || String(item.chapterNumber ?? "").includes(normalizedSearch);
        });
    }, [feedback, searchTerm, selectedBookSlug, selectedChannel, selectedReadFilter]);

    const totals = useMemo(() => {
        return filteredFeedback.reduce(
            (summary, item) => ({
                feedback: summary.feedback + 1,
                unread: summary.unread + (!isFeedbackRead(item.status) ? 1 : 0),
                read: summary.read + (isFeedbackRead(item.status) ? 1 : 0),
            }),
            { feedback: 0, unread: 0, read: 0 }
        );
    }, [filteredFeedback]);

    async function handleFeedbackReadState(item: FeedbackRow, read: boolean) {
        if (!item.feedbackId) {
            return;
        }

        const status: FeedbackStatus = read ? "reviewed" : "open";
        const previousStatus = item.status;
        setSavingFeedbackId(item.feedbackId);
        setFeedback((current) => current.map((candidate) =>
            candidate.feedbackId === item.feedbackId ? { ...candidate, status } : candidate
        ));

        try {
            const res = await apiFetch(`/api/books/${item.Book.id}/feedback/${item.feedbackId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (!res.ok) {
                setFeedback((current) => current.map((candidate) =>
                    candidate.feedbackId === item.feedbackId ? { ...candidate, status: previousStatus } : candidate
                ));
                return;
            }

            const updated = await res.json() as ReaderFeedbackItem;
            setFeedback((current) => current.map((candidate) =>
                candidate.feedbackId === updated.id ? { ...candidate, status: updated.status } : candidate
            ));
            toast.success(read ? "Feedback marked as read" : "Feedback marked as unread");
        } finally {
            setSavingFeedbackId(null);
        }
    }

    const columns: DatatableColumn<FeedbackRow>[] = [
        {
            key: "comment",
            header: "Feedback",
            render: (item) => (
                <Link to={`/admin/book/${item.Book.slug}#feedback`} className="datatable-link feedback-comment-link">
                    <strong>{item.readerUsername}</strong>
                    <span>{item.comment}</span>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (item) => <Link to={`/admin/book/${item.Book.slug}#feedback`} className="datatable-link">{item.Book.title}</Link>,
            width: 180,
        },
        {
            key: "channel",
            header: "Channel",
            render: (item) => <span className={`status-pill ${item.channel}`}>{channelLabels[item.channel]}</span>,
            width: 150,
        },
        {
            key: "chapter",
            header: "Chapter",
            render: (item) => item.chapterNumber ? `Chapter ${item.chapterNumber}` : "-",
            width: 130,
        },
        {
            key: "status",
            header: "Status",
            render: (item) => <span className={`status-pill ${feedbackReadClass(item.status)}`}>{feedbackReadLabel(item.status)}</span>,
            width: 120,
        },
        {
            key: "created",
            header: "Created",
            render: (item) => item.createdAt ? (
                <span title={formatDateTitle(item.createdAt)}>{formatDate(item.createdAt)}</span>
            ) : "-",
            width: 130,
        },
        {
            key: "actions",
            header: "Actions",
            render: (item) => (
                <div className="reader-row-actions">
                    <button
                        className="secondary-btn"
                        disabled={!item.feedbackId || savingFeedbackId === item.feedbackId}
                        onClick={() => handleFeedbackReadState(item, !isFeedbackRead(item.status))}
                    >
                        {isFeedbackRead(item.status) ? "Mark unread" : "Mark as read"}
                    </button>
                </div>
            ),
            width: 150,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id="feedbackView" className="admin-section">
                <div className="reader-page-header">
                    <div className="reader-page-header-left">
                        <div>Feedback</div>
                        <div>Track reader comments across books, chapters and release channels.</div>
                    </div>
                    <div className="reader-page-header-right">
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search feedback..."
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Books" }, ...books.map((book) => ({ value: book.slug, label: book.title }))]}
                            onSelect={setSelectedBookSlug}
                            currentOption={selectedBookSlug}
                            width={350}
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Channels" }, ...Object.entries(channelLabels).map(([channel, label]) => ({ value: channel, label }))]}
                            onSelect={setSelectedChannel}
                            currentOption={selectedChannel}
                        />
                        <SelectPicker
                            options={[{ value: "all", label: "All Feedback" }, { value: "unread", label: "Unread" }, { value: "read", label: "Read" }]}
                            onSelect={setSelectedReadFilter}
                            currentOption={selectedReadFilter}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading feedback...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="reader-summary-grid feedback-summary-grid">
                            <SummaryCard label="Feedback Items" value={totals.feedback.toLocaleString()} />
                            <SummaryCard label="Unread" value={totals.unread.toLocaleString()} />
                            <SummaryCard label="Read" value={totals.read.toLocaleString()} />
                        </div>

                        <Datatable
                            title="Reader Feedback"
                            columns={columns}
                            rows={filteredFeedback}
                            getRowKey={(item) => item.id}
                            emptyMessage="No feedback found."
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="reader-summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function isFeedbackRead(status: FeedbackStatus) {
    return status === "reviewed" || status === "resolved";
}

function feedbackReadLabel(status: FeedbackStatus) {
    return isFeedbackRead(status) ? "Read" : "Unread";
}

function feedbackReadClass(status: FeedbackStatus) {
    return isFeedbackRead(status) ? "read" : "unread";
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
