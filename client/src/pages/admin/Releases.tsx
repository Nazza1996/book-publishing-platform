import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/releases.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";
import { SelectPicker } from "../../components/SelectPicker";
import { Search } from "../../components/Search";

type ReaderChannel = "alpha" | "beta" | "public";
type ReleaseStatus = "scheduled" | "released";

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
    status: ReleaseStatus;
    releaseAt: string | null;
    createdAt?: string;
    updatedAt?: string;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

export default function Releases() {
    const [releases, setReleases] = useState<ChapterRelease[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedChannel, setSelectedChannel] = useState<"all" | ReaderChannel>("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | ReleaseStatus>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("Releases");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchReleases() {
            setLoading(true);
            setError("");

            try {
                const booksRes = await apiFetch("/api/books/dropdown", { toast: false });
                if (!booksRes.ok) {
                    setError("Could not load releases.");
                    return;
                }

                const bookList = await booksRes.json() as BookSummary[];

                if (!isMounted) {
                    return;
                }

                const releasesRes = await apiFetch("/api/releases");
                const releasesList = await releasesRes.json() as ChapterRelease[];

                setBooks(bookList);
                setReleases(releasesList);
            } catch (e) {
                if (isMounted) {
                    setError("Could not load releases.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchReleases();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredReleases = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return releases.filter((release) => {
            if (selectedBookSlug !== "all" && release.Book.slug !== selectedBookSlug) {
                return false;
            }

            if (selectedChannel !== "all" && release.channel !== selectedChannel) {
                return false;
            }

            if (selectedStatus !== "all" && release.status !== selectedStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return release.title.toLowerCase().includes(normalizedSearch)
                || release.Book.title.toLowerCase().includes(normalizedSearch)
                || channelLabels[release.channel].toLowerCase().includes(normalizedSearch)
                || String(release.chapterNumber).includes(normalizedSearch);
        });
    }, [releases, searchTerm, selectedBookSlug, selectedChannel, selectedStatus]);

    const totals = useMemo(() => {
        return filteredReleases.reduce(
            (summary, release) => ({
                releases: summary.releases + 1,
                released: summary.released + (release.status === "released" ? 1 : 0),
                scheduled: summary.scheduled + (release.status === "scheduled" ? 1 : 0),
                public: summary.public + (release.channel === "public" ? 1 : 0),
            }),
            { releases: 0, released: 0, scheduled: 0, public: 0 }
        );
    }, [filteredReleases]);

    const columns: DatatableColumn<ChapterRelease>[] = [
        {
            key: "release",
            header: "Release",
            render: (release) => (
                <Link to={`/admin/book/${release.Book.slug}#releases`} className="datatable-link release-title-link">
                    <span>Chapter {release.chapterNumber}</span>
                    <strong>{release.title}</strong>
                </Link>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (release) => <Link to={`/admin/book/${release.Book.slug}`} className="datatable-link">{release.Book.title}</Link>,
        },
        {
            key: "channel",
            header: "Channel",
            render: (release) => <span className={`status-pill ${release.channel}`}>{channelLabels[release.channel]}</span>,
            width: 150,
        },
        {
            key: "status",
            header: "Status",
            render: (release) => <span className={`status-pill ${release.status}`}>{capitalize(release.status)}</span>,
            width: 120,
        },
        {
            key: "words",
            header: "Words",
            render: (release) => countWords(release.content!).toLocaleString(),
            width: 100,
        },
        {
            key: "releaseAt",
            header: "Release Date",
            render: (release) => release.releaseAt ? (
                <span title={formatDateTitle(release.releaseAt)}>{formatDate(release.releaseAt)}</span>
            ) : "-",
            width: 150,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id="releasesView" className="admin-section">
                <div className="release-page-header">
                    <div className="release-page-header-left">
                        <div>Releases</div>
                        <div>Browse every chapter snapshot released or queued across reader channels.</div>
                    </div>
                    <div className="release-page-header-right">
                        <Search
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search releases..."
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
                            options={[{ value: "all", label: "All Statuses" }, { value: "released", label: "Released" }, { value: "scheduled", label: "Scheduled" }]}
                            onSelect={setSelectedStatus}
                            currentOption={selectedStatus}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading releases...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="release-summary-grid">
                            <SummaryCard label="Release Records" value={totals.releases.toLocaleString()} />
                            <SummaryCard label="Released" value={totals.released.toLocaleString()} />
                            <SummaryCard label="Scheduled" value={totals.scheduled.toLocaleString()} to="/admin/schedule" />
                            <SummaryCard label="Public Channel" value={totals.public.toLocaleString()} />
                        </div>

                        <Datatable
                            title="All Releases"
                            columns={columns}
                            rows={filteredReleases}
                            getRowKey={(release) => release.id!}
                            emptyMessage="No releases found."
                        />
                    </>
                )}
            </section>
        </div>
    );
}

function SummaryCard({ label, value, to }: { label: string; value: string; to?: string }) {
    const content = (
        <>
            <span>{label}</span>
            <strong>{value}</strong>
        </>
    );

    return to ? (
        <Link to={to} className="release-summary-card linked">
            {content}
        </Link>
    ) : (
        <div className="release-summary-card">
            {content}
        </div>
    );
}

function countWords(content: string) {
    return content.trim().split(/\s+/).filter(Boolean).length;
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
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
