import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import "../../styles/admin/shared-admin.scss";
import "../../styles/admin/readers.scss";
import AdminNav from "./AdminNav";
import Datatable, { type DatatableColumn } from "./Datatable";

type ReaderChannel = "alpha" | "beta" | "public";
type MemberStatus = "active" | "removed";

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

interface ReaderGroupMember {
    id?: number;
    readerGroupId: number;
    userId: number | null;
    username: string;
    status: MemberStatus;
    joinedAt: string | null;
    createdAt?: string;
    updatedAt?: string;
    user?: ReaderAccount | null;
}

interface ReaderGroup {
    id?: number;
    channel: ReaderChannel;
    name: string;
    description?: string;
    memberCount?: number;
    members?: ReaderGroupMember[];
}

interface DraftBookResponse extends BookSummary {
    readerGroups?: ReaderGroup[];
}

interface GroupRow {
    id: string;
    groupId?: number;
    bookId: number;
    bookSlug: string;
    bookTitle: string;
    channel: ReaderChannel;
    name: string;
    description: string;
    activeCount: number;
    removedCount: number;
    totalMembers: number;
    lastJoinedAt: string | null;
}

interface MemberRow {
    id: string;
    memberId?: number;
    groupId?: number;
    bookId: number;
    bookSlug: string;
    bookTitle: string;
    channel: ReaderChannel;
    groupName: string;
    username: string;
    status: MemberStatus;
    joinedAt: string | null;
    accountActive: boolean | null;
}

const channelLabels: Record<ReaderChannel, string> = {
    alpha: "Alpha Readers",
    beta: "Beta Readers",
    public: "Public Readers",
};

export default function ReaderGroups({ channel }: { channel: "alpha" | "beta" }) {
    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [selectedBookSlug, setSelectedBookSlug] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState<"all" | MemberStatus>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partialErrorCount, setPartialErrorCount] = useState(0);

    const title = channelLabels[channel];

    useEffect(() => {
        setPageTitle(title);
    }, [title]);

    useEffect(() => {
        let isMounted = true;

        async function fetchReaderGroups() {
            setLoading(true);
            setError("");
            setPartialErrorCount(0);

            try {
                const booksRes = await apiFetch("/api/books", { toast: false });
                if (!booksRes.ok) {
                    setError(`Could not load ${title.toLowerCase()}.`);
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
                setGroups(loadedBooks.map((book) => toGroupRow(book, channel)).filter((row): row is GroupRow => Boolean(row)));
                setMembers(loadedBooks.flatMap((book) => toMemberRows(book, channel)).sort(compareMemberRows));
                setPartialErrorCount(settledBooks.filter((result) => result.status === "rejected").length);
            } catch {
                if (isMounted) {
                    setError(`Could not load ${title.toLowerCase()}.`);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchReaderGroups();

        return () => {
            isMounted = false;
        };
    }, [channel, title]);

    const filteredGroups = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return groups.filter((group) => {
            if (selectedBookSlug !== "all" && group.bookSlug !== selectedBookSlug) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return group.bookTitle.toLowerCase().includes(normalizedSearch)
                || group.name.toLowerCase().includes(normalizedSearch)
                || group.description.toLowerCase().includes(normalizedSearch);
        });
    }, [groups, searchTerm, selectedBookSlug]);

    const filteredMembers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return members.filter((member) => {
            if (selectedBookSlug !== "all" && member.bookSlug !== selectedBookSlug) {
                return false;
            }

            if (selectedStatus !== "all" && member.status !== selectedStatus) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return member.username.toLowerCase().includes(normalizedSearch)
                || member.bookTitle.toLowerCase().includes(normalizedSearch)
                || member.groupName.toLowerCase().includes(normalizedSearch);
        });
    }, [members, searchTerm, selectedBookSlug, selectedStatus]);

    const totals = useMemo(() => {
        return filteredGroups.reduce(
            (summary, group) => ({
                groups: summary.groups + 1,
                active: summary.active + group.activeCount,
                empty: summary.empty + (group.totalMembers === 0 ? 1 : 0),
            }),
            { groups: 0, active: 0, empty: 0 }
        );
    }, [filteredGroups]);

    const groupColumns: DatatableColumn<GroupRow>[] = [
        {
            key: "book",
            header: "Book",
            render: (group) => <Link to={`/admin/book/${group.bookSlug}#reader-groups`} className="datatable-link">{group.bookTitle}</Link>,
        },
        {
            key: "group",
            header: "Group",
            render: (group) => (
                <Link to={`/admin/book/${group.bookSlug}#reader-groups`} className="datatable-link reader-title-link">
                    <span>{channelLabels[group.channel]}</span>
                    <strong>{group.name}</strong>
                </Link>
            ),
        },
        {
            key: "active",
            header: "Active",
            render: (group) => group.activeCount.toLocaleString(),
            width: 90,
        },
        {
            key: "removed",
            header: "Removed",
            render: (group) => group.removedCount.toLocaleString(),
            width: 100,
        },
        {
            key: "lastJoined",
            header: "Last Joined",
            render: (group) => group.lastJoinedAt ? (
                <span title={formatDateTitle(group.lastJoinedAt)}>{formatDate(group.lastJoinedAt)}</span>
            ) : "-",
            width: 140,
        },
    ];

    const memberColumns: DatatableColumn<MemberRow>[] = [
        {
            key: "member",
            header: "Member",
            render: (member) => (
                <span className="reader-title-link">
                    <span>{member.accountActive === false ? "Inactive account" : "Reader account"}</span>
                    <strong>{member.username}</strong>
                </span>
            ),
        },
        {
            key: "book",
            header: "Book",
            render: (member) => <Link to={`/admin/book/${member.bookSlug}#reader-groups`} className="datatable-link">{member.bookTitle}</Link>,
        },
        {
            key: "status",
            header: "Status",
            render: (member) => <span className={`status-pill ${member.status}`}>{capitalize(member.status)}</span>,
            width: 120,
        },
        {
            key: "joined",
            header: "Joined",
            render: (member) => member.joinedAt ? (
                <span title={formatDateTitle(member.joinedAt)}>{formatDate(member.joinedAt)}</span>
            ) : "-",
            width: 140,
        },
        {
            key: "access",
            header: "Access",
            render: (member) => (
                <Link to={`/admin/book/${member.bookSlug}#reader-groups`} className="secondary-btn reader-action-link">
                    Manage
                </Link>
            ),
            width: 120,
        },
    ];

    return (
        <div id="adminView">
            <AdminNav />
            <section id={`${channel}ReadersView`} className="admin-section">
                <div className="reader-page-header">
                    <div className="reader-page-header-left">
                        <div>{title}</div>
                        <div>Review reader access groups and member status across every book.</div>
                    </div>
                    <div className="reader-page-header-right">
                        <input
                            type="text"
                            placeholder="Search readers..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        <select value={selectedBookSlug} onChange={(event) => setSelectedBookSlug(event.target.value)}>
                            <option value="all">All Books</option>
                            {books.map((book) => (
                                <option key={book.id} value={book.slug}>{book.title}</option>
                            ))}
                        </select>
                        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as "all" | MemberStatus)}>
                            <option value="all">All Member Statuses</option>
                            <option value="active">Active</option>
                            <option value="removed">Removed</option>
                        </select>
                    </div>
                </div>

                {partialErrorCount > 0 && (
                    <div className="admin-state warning">
                        {partialErrorCount} {partialErrorCount === 1 ? "book could" : "books could"} not be loaded.
                    </div>
                )}

                {loading ? (
                    <div className="admin-state">Loading {title.toLowerCase()}...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <div className="reader-summary-grid">
                            <SummaryCard label="Book Groups" value={totals.groups.toLocaleString()} />
                            <SummaryCard label="Active Members" value={totals.active.toLocaleString()} />
                            <SummaryCard label="Empty Groups" value={totals.empty.toLocaleString()} />
                        </div>

                        <Datatable
                            title={`${title} Groups`}
                            columns={groupColumns}
                            rows={filteredGroups}
                            getRowKey={(group) => group.id}
                            emptyMessage={`No ${title.toLowerCase()} groups found.`}
                        />

                        <Datatable
                            title={`${title} Members`}
                            columns={memberColumns}
                            rows={filteredMembers}
                            getRowKey={(member) => member.id}
                            emptyMessage={`No ${title.toLowerCase()} members found.`}
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

function toGroupRow(book: DraftBookResponse, channel: ReaderChannel): GroupRow | null {
    const group = (book.readerGroups ?? []).find((item) => item.channel === channel);

    if (!group) {
        return null;
    }

    const members = group.members ?? [];
    const activeCount = members.filter((member) => normalizeMemberStatus(member.status) === "active").length;
    const removedCount = members.filter((member) => normalizeMemberStatus(member.status) === "removed").length;
    const lastJoinedAt = members
        .map((member) => member.joinedAt)
        .filter((joinedAt): joinedAt is string => Boolean(joinedAt))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    return {
        id: String(group.id ?? `${book.id}-${channel}`),
        groupId: group.id,
        bookId: book.id,
        bookSlug: book.slug,
        bookTitle: book.title,
        channel,
        name: group.name || channelLabels[channel],
        description: group.description ?? "",
        activeCount,
        removedCount,
        totalMembers: members.length,
        lastJoinedAt,
    };
}

function toMemberRows(book: DraftBookResponse, channel: ReaderChannel): MemberRow[] {
    const group = (book.readerGroups ?? []).find((item) => item.channel === channel);

    if (!group) {
        return [];
    }

    return (group.members ?? []).map((member) => ({
        id: String(member.id ?? `${book.id}-${channel}-${member.username}`),
        memberId: member.id,
        groupId: group.id,
        bookId: book.id,
        bookSlug: book.slug,
        bookTitle: book.title,
        channel,
        groupName: group.name || channelLabels[channel],
        username: member.user?.username ?? member.username,
        status: normalizeMemberStatus(member.status),
        joinedAt: member.joinedAt,
        accountActive: member.user?.active ?? null,
    }));
}

function compareMemberRows(a: MemberRow, b: MemberRow) {
    if (a.status !== b.status) {
        return statusOrder(a.status) - statusOrder(b.status);
    }

    if (a.bookTitle !== b.bookTitle) {
        return a.bookTitle.localeCompare(b.bookTitle);
    }

    return a.username.localeCompare(b.username);
}

function statusOrder(status: MemberStatus) {
    if (status === "active") {
        return 0;
    }

    return 1;
}

function normalizeMemberStatus(status: string): MemberStatus {
    return status === "removed" ? "removed" : "active";
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
