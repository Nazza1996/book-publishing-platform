import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/releases.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type ReaderChannel = "alpha" | "beta" | "public";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
}

interface ChapterRelease {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number;
    title?: string;
    content?: string;
    status: "scheduled" | "released";
    releaseAt: string | null;
    createdAt?: string;
    updatedAt?: string;
}

interface DraftBookResponse extends BookSummary {
    releases?: ChapterRelease[];
}

interface ScheduleRow {
    id: string;
    bookId: number;
    bookSlug: string;
    bookTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    channel: ReaderChannel;
    releaseAt: string | null;
    wordCount: number;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

const scheduleReferenceTime = Date.now();

export default function Schedule() {
    const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedChannel, setSelectedChannel] = useState<"all" | ReaderChannel>("all");
    const [selectedTiming, setSelectedTiming] = useState<"all" | "upcoming" | "overdue" | "undated">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partialErrorCount, setPartialErrorCount] = useState(0);

    useEffect(() => {
        setPageTitle("Schedule");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchSchedule() {
            setLoading(true);
            setError("");
            setPartialErrorCount(0);

            try {
                const booksRes = await apiFetch("/api/books", { toast: false });
                if (!booksRes.ok) {
                    setError("Could not load schedule.");
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
                setSchedule(loadedBooks.flatMap(toScheduleRows).sort(compareScheduleRows));
                setPartialErrorCount(settledBooks.filter((result) => result.status === "rejected").length);
            } catch {
                if (isMounted) {
                    setError("Could not load schedule.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchSchedule();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredSchedule = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return schedule.filter((item) => {
            if (selectedBookSlug !== "all" && item.bookSlug !== selectedBookSlug) {
                return false;
            }

            if (selectedChannel !== "all" && item.channel !== selectedChannel) {
                return false;
            }

            if (selectedTiming !== "all" && getTiming(item.releaseAt, scheduleReferenceTime) !== selectedTiming) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return item.chapterTitle.toLowerCase().includes(normalizedSearch)
                || item.bookTitle.toLowerCase().includes(normalizedSearch)
                || channelLabels[item.channel].toLowerCase().includes(normalizedSearch)
                || String(item.chapterNumber).includes(normalizedSearch);
        });
    }, [schedule, searchTerm, selectedBookSlug, selectedChannel, selectedTiming]);

    const nextItems = useMemo(() => {
        return filteredSchedule
            .filter((item) => item.releaseAt && new Date(item.releaseAt).getTime() >= scheduleReferenceTime)
            .slice(0, 5);
    }, [filteredSchedule]);

    const columns: DatatableColumn<ScheduleRow>[] = [
        {
            key: "release",
            header: "Scheduled Release",
            render: (item) => (
                <Link to={`/admin/book/${item.bookSlug}#releases`} className="datatable-link release-title-link">
                    <span>Chapter {item.chapterNumber}</span>
                    <strong>{item.chapterTitle}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (item) => <Link to={`/admin/book/${item.bookSlug}`} className="datatable-link">{item.bookTitle}</Link>,
        },
        {
            key: "channel",
            header: "Channel",
            render: (item) => <span className={`status-pill ${item.channel}`}>{channelLabels[item.channel]}</span>,
            width: 150,
        },
        {
            key: "date",
            header: "Date",
            render: (item) => item.releaseAt ? (
                <span title={formatDateTitle(item.releaseAt)}>{formatDate(item.releaseAt)}</span>
            ) : "-",
            width: 150,
        },
        {
            key: "time",
            header: "Time",
            render: (item) => item.releaseAt ? formatTime(item.releaseAt) : "-",
            width: 100,
        },
        {
            key: "timing",
            header: "Timing",
            render: (item) => {
                const timing = getTiming(item.releaseAt, scheduleReferenceTime);

                return <span className={`status-pill ${timing}`}>{timingLabel(timing)}</span>;
            },
            width: 120,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id="scheduleView" className="admin-section">
                <div className="release-page-header">
                    <div className="release-page-header-left">
                        <div>Schedule</div>
                        <div>Track queued chapter releases by date, reader channel and book.</div>
                    </div>
                    <div className="release-page-header-right">
                        <input
                            type="text"
                            placeholder="Search schedule..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <select value={selectedBookSlug} onChange={(event) => setSelectedBookSlug(event.target.value)}>
                            <option value="all">All Books</option>
                            {books.map((book) => (
                                <option key={book.id} value={book.slug}>{book.title}</option>
                            ))}
                        </select>
                        <select value={selectedChannel} onChange={(event) => setSelectedChannel(event.target.value as "all" | ReaderChannel)}>
                            <option value="all">All Channels</option>
                            {Object.entries(channelLabels).map(([channel, label]) => (
                                <option key={channel} value={channel}>{label}</option>
                            ))}
                        </select>
                        <select value={selectedTiming} onChange={(event) => setSelectedTiming(event.target.value as "all" | "upcoming" | "overdue" | "undated")}>
                            <option value="all">All Timing</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="overdue">Overdue</option>
                            <option value="undated">No Date</option>
                        </select>
                    </div>
                </div>

                {partialErrorCount > 0 && (
                    <div className="admin-state warning">
                        {partialErrorCount} {partialErrorCount === 1 ? "book could" : "books could"} not be loaded.
                    </div>
                )}

                {loading ? (
                    <div className="admin-state">Loading schedule...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <section className="datatable-wrapper">
                            <div className="schedule-next-header">
                                <span>Next Releases</span>
                                <Link to="/admin/releases">
                                    View all releases
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </Link>
                            </div>
                            {nextItems.length === 0 ? (
                                <div className="datatable-empty-state">No upcoming dated releases.</div>
                            ) : (
                                <div className="schedule-timeline">
                                    {nextItems.map((item) => (
                                        <Link to={`/admin/book/${item.bookSlug}#releases`} className="schedule-timeline-item" key={item.id}>
                                            <time dateTime={item.releaseAt ?? undefined}>
                                                <strong>{item.releaseAt ? formatDay(item.releaseAt) : "-"}</strong>
                                                <span>{item.releaseAt ? formatMonth(item.releaseAt) : ""}</span>
                                            </time>
                                            <div>
                                                <strong>{item.chapterTitle}</strong>
                                                <span>{item.bookTitle} / {channelLabels[item.channel]} / {item.releaseAt ? formatTime(item.releaseAt) : "No time"}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                        <Datatable
                            title="Scheduled Releases"
                            columns={columns}
                            rows={filteredSchedule}
                            getRowKey={(item) => item.id}
                            emptyMessage="No scheduled releases found."
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function toScheduleRows(book: DraftBookResponse): ScheduleRow[] {
    return (book.releases ?? [])
        .filter((release) => release.status === "scheduled")
        .map((release) => ({
            id: String(release.id ?? `${book.id}-${release.channel}-${release.chapterNumber}`),
            bookId: book.id,
            bookSlug: book.slug,
            bookTitle: book.title,
            chapterNumber: release.chapterNumber,
            chapterTitle: release.title || `Chapter ${release.chapterNumber}`,
            channel: release.channel,
            releaseAt: release.releaseAt,
            wordCount: countWords(release.content ?? ""),
        }));
}

function compareScheduleRows(a: ScheduleRow, b: ScheduleRow) {
    const aTime = a.releaseAt ? new Date(a.releaseAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.releaseAt ? new Date(b.releaseAt).getTime() : Number.MAX_SAFE_INTEGER;

    if (aTime !== bTime) {
        return aTime - bTime;
    }

    if (a.bookTitle !== b.bookTitle) {
        return a.bookTitle.localeCompare(b.bookTitle);
    }

    return a.chapterNumber - b.chapterNumber;
}

function getTiming(releaseAt: string | null, now: number): "upcoming" | "overdue" | "undated" {
    if (!releaseAt) {
        return "undated";
    }

    return new Date(releaseAt).getTime() < now ? "overdue" : "upcoming";
}

function timingLabel(timing: "upcoming" | "overdue" | "undated") {
    if (timing === "undated") {
        return "No Date";
    }

    return timing.charAt(0).toUpperCase() + timing.slice(1);
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

function formatTime(dateString: string) {
    return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
}

function formatDay(dateString: string) {
    return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
    }).format(new Date(dateString));
}

function formatMonth(dateString: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
    }).format(new Date(dateString));
}
