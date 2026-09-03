import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faBook,
    faCalendarDays,
    faComments,
    faPlus,
    faRightFromBracket,
    faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin-dashboard.scss";
import "../../styles/admin/shared-admin.scss";
import AdminNav from "./AdminNav";
import { formatReleaseDay, formatReleaseMonth, formatReleaseTime } from "../../utils/releaseDates";

type ReaderChannel = "alpha" | "beta" | "public";
type BookStatus = "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";
type ReleaseStatus = "scheduled" | "released";
type FeedbackStatus = "open" | "reviewed" | "resolved";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
    status?: BookStatus;
    updatedAt?: string;
    releaseSummary?: Record<string, {
        released: number;
        scheduled: number;
    }>;
    nextRelease?: {
        channel: ReaderChannel;
        chapterNumber: number;
        releaseAt: string;
    } | null;
}

interface ChapterRelease {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number;
    title?: string;
    status: ReleaseStatus;
    releaseAt: string | null;
    updatedAt?: string;
}

interface ReaderFeedbackItem {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number | null;
    readerUsername: string;
    comment: string;
    status: FeedbackStatus;
    createdAt?: string;
    reader?: {
        username: string;
    } | null;
}

interface ReaderGroupMember {
    status: "active" | "removed";
    user?: {
        active: boolean;
    } | null;
}

interface ReaderGroup {
    channel: ReaderChannel;
    members?: ReaderGroupMember[];
}

interface DraftBookResponse extends BookSummary {
    releases?: ChapterRelease[];
    feedback?: ReaderFeedbackItem[];
    readerGroups?: ReaderGroup[];
}

interface UserRow {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
}

interface ReleaseRow extends ChapterRelease {
    Book: BookSummary;
}

interface FeedbackRow extends ReaderFeedbackItem {
    Book: BookSummary;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha",
    beta: "Beta",
    public: "Public",
};

const bookStatusLabels: Record<BookStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    finished: "Finished",
    cancelled: "Cancelled",
};

export default function AdminView() {
    const { logout, user } = useAuth();
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [releases, setReleases] = useState<ReleaseRow[]>([]);
    const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partialErrorCount, setPartialErrorCount] = useState(0);

    useEffect(() => {
        setPageTitle("Dashboard");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchDashboard() {
            setLoading(true);
            setError("");
            setPartialErrorCount(0);

            try {
                const [booksRes, usersRes, releaseRes, feedbackRes] = await Promise.all([
                    apiFetch("/api/books", { toast: false }),
                    apiFetch("/api/users", { toast: false }),
                    apiFetch("/api/releases", { toast: false }),
                    apiFetch("/api/feedback", { toast: false }),
                ]);

                if (!booksRes.ok || !usersRes.ok || !releaseRes.ok || !feedbackRes.ok) {
                    setError("Could not load dashboard.");
                    return;
                }

                const bookList = await booksRes.json() as BookSummary[];
                const userData = await usersRes.json() as { users: UserRow[] };
                const releaseList = await releaseRes.json() as ReleaseRow[];
                const feedbackList = await feedbackRes.json() as FeedbackRow[];

                const settledDrafts = await Promise.allSettled(
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

                setBooks(bookList);
                setUsers(userData.users ?? []);
                setReleases(releaseList);
                setFeedback(feedbackList);
                setPartialErrorCount(settledDrafts.filter((result) => result.status === "rejected").length);
            } catch {
                if (isMounted) {
                    setError("Could not load dashboard.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchDashboard();

        return () => {
            isMounted = false;
        };
    }, []);

    // const releases = useMemo(() => toReleaseRows(draftBooks), [draftBooks]);
    // const feedback = useMemo(() => toFeedbackRows(draftBooks), [draftBooks]);

    const summary = useMemo(() => {
        const scheduledReleases = releases.filter((release) => release.status === "scheduled").length;
        const publicReleasedChapters = books.reduce(
            (total, book) => total + (book.releaseSummary?.public?.released ?? 0),
            0
        );
        const unreadFeedback = feedback.filter((item) => item.status === "open").length;
        const readerAccounts = users.filter((item) => item.role === "reader");
        const activeReaderAccounts = readerAccounts.filter((item) => item.active).length;

        return {
            books: books.length,
            activeBooks: books.filter((book) => (book.status ?? "in_progress") === "in_progress").length,
            publicReleasedChapters,
            scheduledReleases,
            unreadFeedback,
            activeReaderAccounts,
            inactiveReaderAccounts: readerAccounts.length - activeReaderAccounts,
        };
    }, [books, feedback, releases, users]);

    const upcomingReleases = useMemo(() => {
        const now = Date.now();

        return releases
            .filter((release) => release.status === "scheduled" && release.releaseAt && new Date(release.releaseAt).getTime() >= now)
            .sort((a, b) => new Date(a.releaseAt!).getTime() - new Date(b.releaseAt!).getTime())
            .slice(0, 5);
    }, [releases]);

    const workflowItems = useMemo(() => {
        return [
            {
                label: "Draft books",
                value: summary.activeBooks,
                to: "/admin/all-books",
            },
            {
                label: "Upcoming releases",
                value: upcomingReleases.length,
                to: "/admin/schedule",
            },
            {
                label: "Reader feedback",
                value: feedback.length,
                to: "/admin/feedback",
            },
            {
                label: "Reader accounts",
                value: summary.activeReaderAccounts,
                to: "/admin/users",
            },
        ];
    }, [feedback.length, summary.activeBooks, summary.activeReaderAccounts, upcomingReleases.length]);

    const recentBooks = useMemo(() => {
        return [...books]
            .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
            .slice(0, 5);
    }, [books]);

    const recentFeedback = useMemo(() => {
        return feedback
            .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
            .slice(0, 4);
    }, [feedback]);

    return (
        <div id="adminView">
            <AdminNav />
            <section id="adminDashboard" className="admin-section">
                <div className="dashboard-header">
                    <div>
                        <span className="dashboard-kicker">Dashboard</span>
                        <h1>Welcome back{user?.username ? `, ${user.username}` : ""}</h1>
                        <p>Current publishing, reader, and feedback activity in one place.</p>
                    </div>
                    <div className="dashboard-actions">
                        <Link className="primary-btn" to="/admin/new-book">
                            <FontAwesomeIcon icon={faPlus} />
                            New Book
                        </Link>
                        <button className="secondary-btn" type="button" onClick={logout}>
                            <FontAwesomeIcon icon={faRightFromBracket} />
                            Logout
                        </button>
                    </div>
                </div>

                {partialErrorCount > 0 && (
                    <div className="admin-state warning">
                        {partialErrorCount} {partialErrorCount === 1 ? "book could" : "books could"} not be fully loaded.
                    </div>
                )}

                {loading ? (
                    <div className="admin-state">Loading dashboard...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="dashboard-metrics">
                            <MetricCard icon={faBook} label="Books" value={summary.books} detail={`${summary.activeBooks} in progress`} to="/admin/all-books" />
                            <MetricCard icon={faCalendarDays} label="Scheduled" value={summary.scheduledReleases} detail={`${summary.publicReleasedChapters} public chapters released`} to="/admin/schedule" />
                            <MetricCard icon={faComments} label="Unread Feedback" value={summary.unreadFeedback} detail={`${feedback.length} total comments`} to="/admin/feedback" />
                            <MetricCard icon={faUsers} label="Active Readers" value={summary.activeReaderAccounts} detail={`${users.filter((item) => item.role === "reader").length} reader accounts total`} to="/admin/users" />
                        </div>

                        <div className="dashboard-grid">
                            <section className="dashboard-panel dashboard-panel-large">
                                <PanelHeader title="Upcoming Releases" to="/admin/schedule" />
                                {upcomingReleases.length === 0 ? (
                                    <div className="dashboard-empty">No upcoming dated releases.</div>
                                ) : (
                                    <div className="dashboard-release-list">
                                        {upcomingReleases.map((release) => (
                                            <Link to={`/admin/book/${release.Book.slug}#releases`} className="dashboard-release-item" key={release.id ?? `${release.Book.slug}-${release.channel}-${release.chapterNumber}`}>
                                                <time dateTime={release.releaseAt ?? undefined}>
                                                    <strong>{formatReleaseDay(release.releaseAt)}</strong>
                                                    <span>{formatReleaseMonth(release.releaseAt)}</span>
                                                </time>
                                                <div>
                                                    <strong>{release.title || `Chapter ${release.chapterNumber}`}</strong>
                                                    <span>{release.Book.title} / {channelLabels[release.channel]} / {formatReleaseTime(release.releaseAt)}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="dashboard-panel">
                                <PanelHeader title="Workflow" to="/admin/all-books" />
                                <div className="attention-list">
                                    {workflowItems.map((item) => (
                                        <Link className={item.value > 0 ? "attention-item active" : "attention-item"} to={item.to} key={item.label}>
                                            <span>{item.label}</span>
                                            <strong>{item.value.toLocaleString()}</strong>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="dashboard-panel">
                                <PanelHeader title="Recent Books" to="/admin/all-books" />
                                <div className="dashboard-list">
                                    {recentBooks.length === 0 ? (
                                        <div className="dashboard-empty">No books yet.</div>
                                    ) : recentBooks.map((book) => (
                                        <Link to={`/admin/book/${book.slug}`} className="dashboard-list-item" key={book.id}>
                                            <div>
                                                <strong>{book.title}</strong>
                                                <span>{book.updatedAt ? `Updated ${formatRelativeDate(book.updatedAt)}` : "No update date"}</span>
                                            </div>
                                            <span className={`status-pill ${statusClassName(book.status ?? "in_progress")}`}>
                                                {bookStatusLabels[book.status ?? "in_progress"]}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            <section className="dashboard-panel">
                                <PanelHeader title="Recent Feedback" to="/admin/feedback" />
                                <div className="dashboard-list">
                                    {recentFeedback.length === 0 ? (
                                        <div className="dashboard-empty">No feedback yet.</div>
                                    ) : recentFeedback.map((item) => (
                                        <Link to={`/admin/book/${item.Book.slug}#feedback`} className="dashboard-list-item feedback" key={item.id ?? `${item.Book.slug}-${item.createdAt}`}>
                                            <div>
                                                <strong>{item.reader?.username ?? item.readerUsername}</strong>
                                                <span>{item.Book.title} / {item.chapterNumber ? `Chapter ${item.chapterNumber}` : "Whole book"}</span>
                                                <p>{item.comment}</p>
                                            </div>
                                            <span className={`status-pill ${item.status === "open" ? "unread" : "read"}`}>
                                                {item.status === "open" ? "Unread" : "Read"}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    detail,
    to,
}: {
    icon: any;
    label: string;
    value: number;
    detail: string;
    to: string;
}) {
    return (
        <Link className="dashboard-metric" to={to}>
            <span className="dashboard-metric-icon"><FontAwesomeIcon icon={icon} /></span>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
            <small>{detail}</small>
        </Link>
    );
}

function PanelHeader({ title, to }: { title: string; to: string }) {
    return (
        <div className="dashboard-panel-header">
            <h2>{title}</h2>
            <Link to={to}>
                View
                <FontAwesomeIcon icon={faArrowRight} />
            </Link>
        </div>
    );
}

function statusClassName(status: BookStatus) {
    return status.replace(/_/g, "-");
}

function formatRelativeDate(dateString: string) {
    const date = new Date(dateString);
    const elapsedMs = Date.now() - date.getTime();
    const elapsedDays = Math.floor(elapsedMs / 86_400_000);

    if (elapsedDays <= 0) {
        return "today";
    }

    if (elapsedDays === 1) {
        return "yesterday";
    }

    if (elapsedDays < 7) {
        return `${elapsedDays} days ago`;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    }).format(date);
}
