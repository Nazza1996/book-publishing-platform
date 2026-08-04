import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/releases.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SelectPicker } from "../../components/SelectPicker";
import { Search } from "../../components/Search";

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
    Book: BookSummary;
    title: string;
    content?: string;
    status: "scheduled" | "released";
    releaseAt: string | null;
    createdAt?: string;
    updatedAt?: string;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

const scheduleReferenceTime = Date.now();

export default function Schedule() {
    const [schedule, setSchedule] = useState<ChapterRelease[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedChannel, setSelectedChannel] = useState<"all" | ReaderChannel>("all");
    const [selectedTiming, setSelectedTiming] = useState<"all" | "upcoming" | "overdue" | "undated">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("Schedule");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchSchedule() {
            setLoading(true);
            setError("");

            try {
                const booksRes = await apiFetch("/api/books/dropdown", { toast: false });
                if (!booksRes.ok) {
                    setError("Could not load schedule.");
                    return;
                }

                const bookList = await booksRes.json() as BookSummary[];

                if (!isMounted) {
                    return;
                }

                const scheduleRes = await apiFetch("/api/releases/scheduled");
                const scheduleList = await scheduleRes.json() as ChapterRelease[];

                setBooks(bookList);
                setSchedule(scheduleList);
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
            if (selectedBookSlug !== "all" && item.Book.slug !== selectedBookSlug) {
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

            return item.title.toLowerCase().includes(normalizedSearch)
                || item.Book.title.toLowerCase().includes(normalizedSearch)
                || channelLabels[item.channel].toLowerCase().includes(normalizedSearch)
                || String(item.chapterNumber).includes(normalizedSearch);
        });
    }, [schedule, searchTerm, selectedBookSlug, selectedChannel, selectedTiming]);

    const nextItems = useMemo(() => {
        return filteredSchedule
            .filter((item) => item.releaseAt && new Date(item.releaseAt).getTime() >= scheduleReferenceTime)
            .slice(0, 5);
    }, [filteredSchedule]);

    const columns: DatatableColumn<ChapterRelease>[] = [
        {
            key: "release",
            header: "Scheduled Release",
            render: (item) => (
                <Link to={`/admin/book/${item.Book.slug}#releases`} className="datatable-link release-title-link">
                    <span>Chapter {item.chapterNumber}</span>
                    <strong>{item.title}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (item) => <Link to={`/admin/book/${item.Book.slug}`} className="datatable-link">{item.Book.title}</Link>,
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
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search schedule..."
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
                            options={[{ value: "all", label: "All Timing" }, { value: "upcoming", label: "Upcoming" }, { value: "overdue", label: "Overdue" }, { value: "undated", label: "No Date" }]}
                            onSelect={setSelectedTiming}
                            currentOption={selectedTiming}
                        />
                    </div>
                </div>

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
                                        <Link to={`/admin/book/${item.Book.slug}#releases`} className="schedule-timeline-item" key={item.id}>
                                            <time dateTime={item.releaseAt ?? undefined}>
                                                <strong>{item.releaseAt ? formatDay(item.releaseAt) : "-"}</strong>
                                                <span>{item.releaseAt ? formatMonth(item.releaseAt) : ""}</span>
                                            </time>
                                            <div>
                                                <strong>{item.title}</strong>
                                                <span>{item.Book.title} / {channelLabels[item.channel]} / {item.releaseAt ? formatTime(item.releaseAt) : "No time"}</span>
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
                            getRowKey={(item) => item.id!}
                            emptyMessage="No scheduled releases found."
                        />
                    </>
                )}
            </section>
        </div>
    );
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
