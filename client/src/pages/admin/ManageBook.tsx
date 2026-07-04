import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignCenter, faAlignLeft, faAlignRight, faBold, faItalic, faUnderline } from "@fortawesome/free-solid-svg-icons";
import { apiFetch, setPageTitle, toast } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import '../../styles/admin/manage-book.scss';
import AdminNav from "./AdminNav";

type ReaderChannel = "alpha" | "beta" | "public";
type BookStatus = "not_started" | "in_progress" | "on_hold" | "finished" | "cancelled";

interface Chapter {
    id?: number;
    title: string;
    content: string;
    chapterNumber: number;
    updatedAt?: string;
}

interface BookEditorState {
    id: number | null;
    slug: string;
    title: string;
    description: string;
    status: BookStatus;
    isFeatured: boolean;
    chapters: Chapter[];
    releases: ChapterRelease[];
    readerGroups: ReaderGroup[];
    feedback: ReaderFeedbackItem[];
    chapterRevisions: ChapterRevision[];
}

interface ChannelMetadata {
    description: string;
    authorNote: string;
    releaseLimit: number;
    nextRelease: string;
}

interface ReaderGroup {
    id?: number;
    key: ReaderChannel;
    channel?: ReaderChannel;
    label: string;
    name?: string;
    shortLabel: string;
    members: number;
    memberCount?: number;
    tone: string;
    description?: string;
    memberList?: ReaderGroupMember[];
}

interface ChapterRelease {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number;
    title?: string;
    content?: string;
    status: "scheduled" | "released";
    releaseAt: string | null;
}

interface ReaderGroupMember {
    id?: number;
    readerGroupId: number;
    userId: number | null;
    username: string;
    status: "active" | "removed";
    joinedAt: string | null;
    user?: ReaderAccount | null;
}

interface ReaderFeedbackItem {
    id?: number;
    channel: ReaderChannel;
    chapterNumber: number | null;
    readerUserId?: number | null;
    readerUsername: string;
    comment: string;
    status: "open" | "reviewed" | "resolved";
    createdAt?: string;
    reader?: ReaderAccount | null;
}

interface ReaderAccount {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
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

const EMPTY_BOOK: BookEditorState = {
    id: null,
    slug: "",
    title: "",
    description: "",
    status: "in_progress",
    isFeatured: false,
    chapters: [
        { title: "Chapter 1", content: "", chapterNumber: 1 }
    ],
    releases: [],
    readerGroups: [],
    feedback: [],
    chapterRevisions: []
};

const tabs = ["overview", "details", "chapters", "history", "releases", "reader-groups", "feedback"];

const readerGroups: ReaderGroup[] = [
    { key: "alpha", label: "Alpha Readers", shortLabel: "A", members: 0, tone: "purple" },
    { key: "beta", label: "Beta Readers", shortLabel: "B", members: 0, tone: "blue" },
    { key: "public", label: "Public Readers", shortLabel: "P", members: 0, tone: "green" }
];

const bookStatusLabels: Record<BookStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    on_hold: "On Hold",
    finished: "Finished",
    cancelled: "Cancelled",
};

const initialChannelMetadata: Record<ReaderChannel, ChannelMetadata> = {
    alpha: {
        description: "An early look at the story. Feedback is welcome.",
        authorNote: "This is an early working copy. Expect changes.",
        releaseLimit: 4,
        nextRelease: "Chapter 5"
    },
    beta: {
        description: "A cleaner revision for continuity and pacing feedback.",
        authorNote: "Please flag confusing chapter transitions.",
        releaseLimit: 3,
        nextRelease: "Chapter 4"
    },
    public: {
        description: "The public-facing book description shown to readers.",
        authorNote: "Final release copy for public readers.",
        releaseLimit: 2,
        nextRelease: "Chapter 3"
    }
};

export default function ManageBook() {
    const navigate = useNavigate();
    const location = useLocation();
    const { slug } = useParams();
    const isNewBook = !slug;

    const [book, setBook] = useState<BookEditorState>(EMPTY_BOOK);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
    const [activeChannel, setActiveChannel] = useState<ReaderChannel>("alpha");
    const [channelMetadata, setChannelMetadata] = useState(initialChannelMetadata);
    const [loading, setLoading] = useState(!isNewBook);
    const [saving, setSaving] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [togglingSpotlight, setTogglingSpotlight] = useState(false);
    const [deleteBookModalOpen, setDeleteBookModalOpen] = useState(false);
    const [deletingBook, setDeletingBook] = useState(false);
    const [pendingReleaseDeleteIds, setPendingReleaseDeleteIds] = useState<number[]>([]);
    const [readerAccounts, setReaderAccounts] = useState<ReaderAccount[]>([]);
    const [error, setError] = useState("");

    const currentTab = useMemo(() => {
        const hash = location.hash.substring(1).toLowerCase();
        if (hash === "versions") {
            return "history";
        }
        return tabs.includes(hash) ? hash : "overview";
    }, [location.hash]);

    const selectedChapter = book.chapters[selectedChapterIndex] ?? book.chapters[0];
    const hasPublicRelease = book.releases.some((release) => release.channel === "public" && release.status === "released");

    useEffect(() => {
        setPageTitle(isNewBook ? "New Book" : "Manage Book");
    }, [isNewBook]);

    useEffect(() => {
        let isMounted = true;

        async function fetchReaderAccounts() {
            const res = await apiFetch('/api/users', { toast: false });
            if (!res.ok) {
                return;
            }

            const data = await res.json();
            if (isMounted) {
                setReaderAccounts((data.users ?? []).filter((item: ReaderAccount) => item.role === "reader"));
            }
        }

        fetchReaderAccounts();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (isNewBook) {
            setBook(EMPTY_BOOK);
            setChannelMetadata(initialChannelMetadata);
            setSelectedChapterIndex(0);
            setPendingReleaseDeleteIds([]);
            setLoading(false);
            setError("");
            return;
        }

        let isMounted = true;

        async function fetchBook() {
            setLoading(true);
            setError("");

            try {
                const res = await apiFetch(`/api/books/${slug}?version=draft`);
                if (!res.ok) {
                    setError("Book not found.");
                    return;
                }

                const data = await res.json();
                if (!isMounted) {
                    return;
                }

                const chapters = data.version?.chapters?.length ? data.version.chapters : EMPTY_BOOK.chapters;

                setBook({
                    id: data.id,
                    slug: data.slug,
                    title: data.title ?? "",
                    description: data.description ?? "",
                    status: data.status ?? "in_progress",
                    isFeatured: Boolean(data.isFeatured),
                    chapters,
                    releases: data.releases ?? [],
                    readerGroups: normalizeReaderGroups(data.readerGroups),
                    feedback: data.feedback ?? [],
                    chapterRevisions: data.chapterRevisions ?? []
                });
                setChannelMetadata(data.channelMetadata ?? {
                    alpha: { ...initialChannelMetadata.alpha, description: data.description || initialChannelMetadata.alpha.description },
                    beta: { ...initialChannelMetadata.beta, description: data.description || initialChannelMetadata.beta.description },
                    public: { ...initialChannelMetadata.public, description: data.description || initialChannelMetadata.public.description }
                });
                setSelectedChapterIndex(0);
                setPendingReleaseDeleteIds([]);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchBook();

        return () => {
            isMounted = false;
        };
    }, [isNewBook, slug]);

    async function handleSaveDraft() {
        if (!book.title.trim()) {
            toast.error("Book title cannot be empty");
            return;
        }

        if (!book.description.trim()) {
            toast.error("Book description cannot be empty");
            return;
        }

        setSaving(true);

        try {
            const res = await apiFetch('/api/books/saveDraft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book,
                    scope: 'all',
                    channelMetadata
                })
            });

            if (!res.ok) {
                return;
            }

            const data = await res.json();
            const nextSlug = data.slug ?? book.slug;

            setBook((current) => ({
                ...current,
                id: data.id ?? current.id,
                slug: nextSlug
            }));

            if (pendingReleaseDeleteIds.length) {
                try {
                    const responses = await Promise.all(pendingReleaseDeleteIds.map((releaseId) =>
                        apiFetch(`/api/books/${data.id ?? book.id}/releases/${releaseId}`, {
                            method: 'DELETE'
                        })
                    ));

                    const failedReleaseDeleteIds = pendingReleaseDeleteIds.filter((_, index) => !responses[index].ok);

                    if (failedReleaseDeleteIds.length) {
                        setPendingReleaseDeleteIds(failedReleaseDeleteIds);
                        toast.error("Book saved, but some release cleanup failed");
                        return;
                    }

                    setPendingReleaseDeleteIds([]);
                } catch {
                    toast.error("Book saved, but release cleanup failed");
                    return;
                }
            }

            toast.success("Book saved successfully");

            if (isNewBook && nextSlug) {
                navigate(`/admin/book/${nextSlug}#overview`, { replace: true });
            }
        } finally {
            setSaving(false);
        }
    }

    function updateBookField(field: "title" | "description", value: string) {
        setBook((current) => ({ ...current, [field]: value }));
    }

    async function updateBookStatus(status: BookStatus) {
        if (status === book.status) {
            return;
        }

        const previousStatus = book.status;
        setBook((current) => ({ ...current, status }));

        if (!book.id) {
            return;
        }

        setSavingStatus(true);

        try {
            const res = await apiFetch(`/api/books/${book.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!res.ok) {
                setBook((current) => ({ ...current, status: previousStatus }));
                toast.error("Could not update book status");
                return;
            }

            toast.success("Book status updated");
        } finally {
            setSavingStatus(false);
        }
    }

    function updateChannelField(field: keyof ChannelMetadata, value: string | number) {
        setChannelMetadata((current) => ({
            ...current,
            [activeChannel]: {
                ...current[activeChannel],
                [field]: value
            }
        }));
    }

    function handleAddChapter() {
        setBook((current) => {
            const nextChapter = {
                title: `Chapter ${current.chapters.length + 1}`,
                content: "",
                chapterNumber: current.chapters.length + 1
            };

            setSelectedChapterIndex(current.chapters.length);

            return {
                ...current,
                chapters: [...current.chapters, nextChapter]
            };
        });
    }

    function updateChapter(index: number, updates: Partial<Chapter>) {
        setBook((current) => ({
            ...current,
            chapters: current.chapters.map((chapter, chapterIndex) =>
                chapterIndex === index ? { ...chapter, ...updates } : chapter
            )
        }));
    }

    async function handleDeleteChapter(index: number) {
        const chapterToDelete = book.chapters[index];

        if (!chapterToDelete) {
            return false;
        }

        const releasesToDelete = book.releases.filter((release) =>
            release.chapterNumber === chapterToDelete.chapterNumber
        );

        const persistedReleaseIds = releasesToDelete
            .map((release) => release.id)
            .filter((releaseId): releaseId is number => Boolean(releaseId));

        if (persistedReleaseIds.length) {
            setPendingReleaseDeleteIds((current) => Array.from(new Set([...current, ...persistedReleaseIds])));
        }

        setBook((current) => {
            const chapters = current.chapters
                .filter((_, chapterIndex) => chapterIndex !== index)
                .map((chapter, chapterIndex) => ({
                    ...chapter,
                    chapterNumber: chapterIndex + 1
                }));

            setSelectedChapterIndex((currentIndex) => Math.max(0, Math.min(currentIndex, chapters.length - 1)));

            return {
                ...current,
                chapters: chapters.length ? chapters : EMPTY_BOOK.chapters,
                releases: current.releases.filter((release) =>
                    release.chapterNumber !== chapterToDelete.chapterNumber
                )
            };
        });

        if (releasesToDelete.length) {
            toast.success("Releases for deleted chapter will be removed on save");
        }

        return true;
    }

    async function handleToggleSpotlight() {
        if (!book.id) {
            toast.error("Save this book before changing spotlight status");
            return;
        }

        if (!hasPublicRelease) {
            toast.error("Only books with public releases can be spotlighted");
            return;
        }

        setTogglingSpotlight(true);

        try {
            const res = await apiFetch('/api/books/toggleFeatured', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: book.id })
            });

            if (res.ok) {
                setBook((current) => ({ ...current, isFeatured: !current.isFeatured }));
                toast.success("Spotlight status updated");
            }
        } finally {
            setTogglingSpotlight(false);
        }
    }

    async function handleDeleteBook() {
        if (!book.id) {
            toast.error("Save this book before deleting it");
            return;
        }

        setDeletingBook(true);

        try {
            const res = await apiFetch(`/api/books/${book.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                return;
            }

            toast.success("Book deleted");
            navigate('/admin/all-books', { replace: true });
        } finally {
            setDeletingBook(false);
        }
    }

    async function handleScheduleRelease(input: {
        channel: ReaderChannel;
        chapterNumber: number;
        releaseAt: string | null;
        status?: ChapterRelease["status"];
    }) {
        if (!book.id) {
            toast.error("Save this book before scheduling a release");
            return;
        }

        const chapter = book.chapters.find((item) => item.chapterNumber === input.chapterNumber);

        if (!chapter) {
            toast.error("Chapter not found");
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/releases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...input,
                title: chapter.title,
                content: chapter.content,
                status: input.status ?? "scheduled"
            })
        });

        if (!res.ok) {
            return;
        }

        const release = await res.json();
        setBook((current) => ({
            ...current,
            releases: [
                ...current.releases.filter((item) => !(item.channel === release.channel && item.chapterNumber === release.chapterNumber)),
                release
            ]
        }));
        toast.success(release.status === "released" ? "Chapter released" : "Release scheduled");
    }

    async function handleDeleteRelease(releaseId: number) {
        if (!book.id) {
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/releases/${releaseId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            return;
        }

        setBook((current) => ({
            ...current,
            releases: current.releases.filter((release) => release.id !== releaseId)
        }));
        setPendingReleaseDeleteIds((current) => current.filter((id) => id !== releaseId));
        toast.success("Release removed");
    }

    async function handleCreateRevision(chapterNumber: number) {
        if (!book.id) {
            toast.error("Save this book before creating revisions");
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/chapters/${chapterNumber}/revisions`, {
            method: 'POST'
        });

        if (!res.ok) {
            return;
        }

        const revision = await res.json();
        setBook((current) => ({
            ...current,
            chapterRevisions: [
                revision,
                ...current.chapterRevisions.filter((item) => item.id !== revision.id)
            ]
        }));
        toast.success("Revision snapshot created");
    }

    async function handleRestoreRevision(revision: ChapterRevision) {
        if (!book.id || !revision.id) {
            toast.error("Save this book before restoring revisions");
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/chapters/${revision.chapterNumber}/revisions/${revision.id}/restore`, {
            method: 'POST'
        });

        if (!res.ok) {
            return;
        }

        const restoredChapter = await res.json();
        setBook((current) => ({
            ...current,
            chapters: current.chapters.some((chapter) => chapter.chapterNumber === restoredChapter.chapterNumber)
                ? current.chapters.map((chapter) =>
                    chapter.chapterNumber === restoredChapter.chapterNumber
                        ? {
                            ...chapter,
                            title: restoredChapter.title,
                            content: restoredChapter.content ?? "",
                            updatedAt: restoredChapter.updatedAt
                        }
                        : chapter
                )
                : [
                    ...current.chapters,
                    {
                        title: restoredChapter.title,
                        content: restoredChapter.content ?? "",
                        chapterNumber: restoredChapter.chapterNumber,
                        updatedAt: restoredChapter.updatedAt
                    }
                ].sort((a, b) => a.chapterNumber - b.chapterNumber)
        }));
        toast.success("Revision restored to working copy");
    }

    async function handleAddReaderGroupMember(groupId: number, userId: number) {
        if (!book.id) {
            toast.error("Save this book before adding readers");
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/reader-groups/${groupId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (!res.ok) {
            return;
        }

        const member = normalizeReaderGroupMember(await res.json());
        setBook((current) => ({
            ...current,
            readerGroups: current.readerGroups.map((group) => {
                if (group.id !== groupId) {
                    return group;
                }

                const memberList = [
                    member,
                    ...(group.memberList ?? []).filter((item) => item.id !== member.id)
                ];

                return {
                    ...group,
                    memberList,
                    members: memberList.filter((item) => item.status !== "removed").length,
                    memberCount: memberList.filter((item) => item.status !== "removed").length
                };
            })
        }));
        toast.success("Reader added");
    }

    async function handleReaderGroupMemberStatus(groupId: number, memberId: number, status: ReaderGroupMember["status"]) {
        if (!book.id) {
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/reader-groups/${groupId}/members/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!res.ok) {
            return;
        }

        const member = normalizeReaderGroupMember(await res.json());
        setBook((current) => ({
            ...current,
            readerGroups: current.readerGroups.map((group) => {
                if (group.id !== groupId) {
                    return group;
                }

                const memberList = (group.memberList ?? []).map((item) => item.id === member.id ? member : item);

                return {
                    ...group,
                    memberList,
                    members: memberList.filter((item) => item.status === "active").length,
                    memberCount: memberList.filter((item) => item.status === "active").length
                };
            })
        }));
        toast.success(status === "active" ? "Reader access restored" : "Reader access removed");
    }

    async function handleFeedbackStatus(feedbackId: number, status: ReaderFeedbackItem["status"]) {
        if (!book.id) {
            return;
        }

        const res = await apiFetch(`/api/books/${book.id}/feedback/${feedbackId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!res.ok) {
            return;
        }

        const feedback = await res.json();
        setBook((current) => ({
            ...current,
            feedback: current.feedback.map((item) => item.id === feedback.id ? feedback : item)
        }));
        toast.success(status === "open" ? "Feedback marked as unread" : "Feedback marked as read");
    }

    return (
        <div id="adminView">
            <AdminNav />
            <section id="manageBookView" className="admin-section">
                {loading ? (
                    <div className="admin-state">Loading book...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <>
                        <BookWorkspaceHeader
                            book={book}
                            isNewBook={isNewBook}
                            hasPublicRelease={hasPublicRelease}
                            saving={saving}
                            savingStatus={savingStatus}
                            togglingSpotlight={togglingSpotlight}
                            deletingBook={deletingBook}
                            onSave={handleSaveDraft}
                            onStatusChange={updateBookStatus}
                            onToggleSpotlight={handleToggleSpotlight}
                            onDeleteClick={() => setDeleteBookModalOpen(true)}
                        />

                        <Tablist activeTab={currentTab} />

                        <div id="manageBookTabContent">
                            {currentTab === "overview" && (
                                <OverviewTab
                                    book={book}
                                    groups={readerGroups}
                                    metadata={channelMetadata}
                                    selectedChapter={selectedChapter}
                                    releases={book.releases}
                                    readerGroups={book.readerGroups}
                                    feedback={book.feedback}
                                    onNavigate={(tab) => navigate(`#${tab}`)}
                                />
                            )}
                            {currentTab === "details" && (
                                <DetailsTab
                                    book={book}
                                    groups={readerGroups}
                                    activeChannel={activeChannel}
                                    metadata={channelMetadata[activeChannel]}
                                    onBookFieldChange={updateBookField}
                                    onChannelChange={setActiveChannel}
                                    onChannelFieldChange={updateChannelField}
                                />
                            )}
                            {currentTab === "chapters" && (
                                <ChaptersTab
                                    book={book}
                                    selectedChapterIndex={selectedChapterIndex}
                                    selectedChapter={selectedChapter}
                                    groups={readerGroups}
                                    metadata={channelMetadata}
                                    releases={book.releases}
                                    onAddChapter={handleAddChapter}
                                    onSelectChapter={setSelectedChapterIndex}
                                    onUpdateChapter={updateChapter}
                                    onDeleteChapter={handleDeleteChapter}
                                    onReleaseNow={(channel, chapterNumber) => handleScheduleRelease({ channel, chapterNumber, releaseAt: new Date().toISOString(), status: "released" })}
                                />
                            )}
                            {currentTab === "history" && (
                                <VersionsTab
                                    selectedChapter={selectedChapter}
                                    revisions={book.chapterRevisions}
                                    onCreateRevision={handleCreateRevision}
                                    onRestoreRevision={handleRestoreRevision}
                                />
                            )}
                            {currentTab === "releases" && (
                                <ReleasesTab
                                    groups={readerGroups}
                                    metadata={channelMetadata}
                                    releases={book.releases}
                                    selectedChapter={selectedChapter}
                                    chapters={book.chapters}
                                    onScheduleRelease={handleScheduleRelease}
                                    onDeleteRelease={handleDeleteRelease}
                                />
                            )}
                            {currentTab === "reader-groups" && (
                                <ReaderGroupsTab
                                    groups={book.readerGroups.length ? book.readerGroups : readerGroups}
                                    readerAccounts={readerAccounts}
                                    onAddMember={handleAddReaderGroupMember}
                                    onMemberStatus={handleReaderGroupMemberStatus}
                                />
                            )}
                            {currentTab === "feedback" && (
                                <FeedbackTab
                                    groups={book.readerGroups.length ? book.readerGroups : readerGroups}
                                    chapters={book.chapters}
                                    feedback={book.feedback}
                                    selectedChapter={selectedChapter}
                                    onFeedbackStatus={handleFeedbackStatus}
                                />
                            )}
                        </div>

                        {deleteBookModalOpen && (
                            <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => !deletingBook && setDeleteBookModalOpen(false)}>
                                <div
                                    className="admin-modal"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="deleteBookModalTitle"
                                    onMouseDown={(event) => event.stopPropagation()}
                                >
                                    <div className="admin-modal-header">
                                        <h2 id="deleteBookModalTitle">Delete {book.title || "this book"}?</h2>
                                        <button className="icon-btn" type="button" onClick={() => setDeleteBookModalOpen(false)} disabled={deletingBook} aria-label="Close delete book modal">x</button>
                                    </div>
                                    <div className="admin-modal-body">
                                        <p>
                                            This permanently deletes the book, draft chapters, releases, reader groups, feedback, and revision history.
                                        </p>
                                    </div>
                                    <div className="admin-modal-actions">
                                        <button className="secondary-btn" type="button" onClick={() => setDeleteBookModalOpen(false)} disabled={deletingBook}>Cancel</button>
                                        <button className="danger-btn" type="button" onClick={handleDeleteBook} disabled={deletingBook}>
                                            {deletingBook ? "Deleting..." : "Delete Book"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );

    function Tablist({ activeTab }: { activeTab: string }) {
        return (
            <div id="manageBookTablist" role="tablist">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => navigate(`#${tab}`)}
                        className={activeTab === tab ? 'tab active' : 'tab'}
                    >
                        {formatTabLabel(tab)}
                    </button>
                ))}
            </div>
        );
    }
}

function BookWorkspaceHeader({
    book,
    isNewBook,
    hasPublicRelease,
    saving,
    savingStatus,
    togglingSpotlight,
    deletingBook,
    onSave,
    onStatusChange,
    onToggleSpotlight,
    onDeleteClick
}: {
    book: BookEditorState;
    isNewBook: boolean;
    hasPublicRelease: boolean;
    saving: boolean;
    savingStatus: boolean;
    togglingSpotlight: boolean;
    deletingBook: boolean;
    onSave: () => void;
    onStatusChange: (status: BookStatus) => void;
    onToggleSpotlight: () => void;
    onDeleteClick: () => void;
}) {
    return (
        <div id="manageBookHeader">
            <div>
                <div className="admin-breadcrumbs">
                    <Link to="/admin/all-books">Books</Link>
                    <span>/</span>
                    <span>{isNewBook ? "New Book" : book.title || "Untitled Book"}</span>
                </div>
                <h1>{isNewBook ? "New Book" : book.title || "Untitled Book"}</h1>
                <div className="title-row-meta">
                    <BookStatusDropdown status={book.status} onChange={onStatusChange} disabled={savingStatus} />
                    <span>{book.chapters.length} chapters</span>
                    <span>{countBookWords(book).toLocaleString()} words</span>
                    <span>{countReleasedChapters(book.releases, "public")} public releases</span>
                </div>
            </div>

            <div className="admin-header-actions">
                {book.slug ? (
                    <Link className="secondary-btn" to={`/book/${book.slug}?version=draft`} target="_blank" rel="noreferrer">Preview Book</Link>
                ) : (
                    <button className="secondary-btn" type="button" disabled>Preview Book</button>
                )}
                <button
                    className={book.isFeatured && hasPublicRelease ? "spotlight-btn active" : "spotlight-btn"}
                    type="button"
                    onClick={onToggleSpotlight}
                    disabled={!hasPublicRelease || togglingSpotlight}
                    title={hasPublicRelease ? "Toggle homepage spotlight" : "Release at least one public chapter before spotlighting it"}
                >
                    {book.isFeatured && hasPublicRelease ? "Spotlight On" : "Spotlight Off"}
                </button>
                {!isNewBook && (
                    <button className="danger-btn" type="button" onClick={onDeleteClick} disabled={deletingBook}>
                        {deletingBook ? "Deleting..." : "Delete Book"}
                    </button>
                )}
                <button className="primary-btn" type="button" onClick={onSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}

function OverviewTab({
    book,
    groups,
    metadata,
    selectedChapter,
    releases,
    readerGroups,
    feedback,
    onNavigate
}: {
    book: BookEditorState;
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    selectedChapter?: Chapter;
    releases: ChapterRelease[];
    readerGroups: ReaderGroup[];
    feedback: ReaderFeedbackItem[];
    onNavigate: (tab: string) => void;
}) {
    const activeGroups = readerGroups.length ? readerGroups : groups;

    return (
        <div className="admin-grid overview-grid">
            <Panel step="1" title="Book Details" description="Shared metadata and channel-specific reader copy.">
                <div className="overview-detail-list">
                    <div>
                        <span>Title</span>
                        <strong>{book.title || "Untitled Book"}</strong>
                    </div>
                    <div>
                        <span>Release Availability</span>
                        <strong>{getBookReleaseAvailability(book.releases)}</strong>
                    </div>
                    <div>
                        <span>Slug</span>
                        <strong>{book.slug || "Generated after save"}</strong>
                    </div>
                </div>
                <button className="secondary-btn panel-action" onClick={() => onNavigate("details")}>Edit Details</button>
            </Panel>

            <Panel step="2" title="Chapters Overview" description="Working chapter list with release availability.">
                <ChapterMiniTable chapters={book.chapters} groups={groups} metadata={metadata} releases={releases} />
                <button className="secondary-btn panel-action" onClick={() => onNavigate("chapters")}>Open Chapters</button>
            </Panel>

            <Panel step="3" title="Chapter Editor" description="Continue drafting the selected chapter.">
                <div className="editor-preview">
                    <strong>{selectedChapter?.title ?? "Chapter 1"}</strong>
                    <p>{getExcerpt(selectedChapter?.content) || "No chapter content yet."}</p>
                    <span>{countWords(selectedChapter?.content ?? "").toLocaleString()} words</span>
                </div>
            </Panel>

            <Panel step="4" title="Release Preview" description="What each reader group can access.">
                <ReleasePreview groups={groups} metadata={metadata} releases={releases} />
            </Panel>

            <Panel step="5" title="Reader Groups" description="Access groups for staged releases.">
                <ReaderGroupCards groups={activeGroups} />
            </Panel>

            <Panel step="6" title="Feedback" description="Recent reader feedback.">
                <FeedbackList groups={activeGroups} feedback={feedback} selectedChapter={selectedChapter} compact />
            </Panel>
        </div>
    );
}

function DetailsTab({
    book,
    groups,
    activeChannel,
    metadata,
    onBookFieldChange,
    onChannelChange,
    onChannelFieldChange
}: {
    book: BookEditorState;
    groups: ReaderGroup[];
    activeChannel: ReaderChannel;
    metadata: ChannelMetadata;
    onBookFieldChange: (field: "title" | "description", value: string) => void;
    onChannelChange: (channel: ReaderChannel) => void;
    onChannelFieldChange: (field: keyof ChannelMetadata, value: string | number) => void;
}) {
    return (
        <div id="manageBookDetailsTab">
            <Panel step="1" title="Book Details (Shared & Versioned Metadata)" description="Manage core book information and how it appears to each reader group.">
                <div className="book-details-tab-sections">
                    <div className="book-details-section left">
                        <div className="section-header">
                            <div className="section-title">Shared Details</div>
                            <div className="section-description">These details are shared across all release channels.</div>
                        </div>

                        <div className="field-group">
                            <div className="field">
                                <label htmlFor="bookTitle">Title</label>
                                <input id="bookTitle" type="text" value={book.title} onChange={(e) => onBookFieldChange("title", e.target.value)} />
                            </div>
                            <div className="field">
                                <label htmlFor="bookDescription">Default Description</label>
                                <textarea id="bookDescription" value={book.description} onChange={(e) => onBookFieldChange("description", e.target.value)} />
                            </div>
                            <div className="field-row">
                                <div className="field">
                                    <label>Book Number</label>
                                    <input type="text" value="1" readOnly />
                                </div>
                                <div className="field">
                                    <label>Language</label>
                                    <input type="text" value="English" readOnly />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="book-details-section right">
                        <div className="section-header">
                            <div className="section-title">Reader Facing Metadata</div>
                            <div className="section-description">Customize copy for alpha, beta and public readers.</div>
                        </div>

                        <ChannelSwitcher groups={groups} activeChannel={activeChannel} onChange={onChannelChange} />

                        <div className="field-group">
                            <div className="field">
                                <label htmlFor="channelDescription">Book Description</label>
                                <textarea id="channelDescription" maxLength={500} value={metadata.description} onChange={(e) => onChannelFieldChange("description", e.target.value)} />
                                <small>{metadata.description.length} / 500</small>
                            </div>
                            <div className="field">
                                <label htmlFor="authorNote">Author Note</label>
                                <textarea id="authorNote" maxLength={500} value={metadata.authorNote} onChange={(e) => onChannelFieldChange("authorNote", e.target.value)} />
                                <small>{metadata.authorNote.length} / 500</small>
                            </div>
                        </div>
                    </div>
                </div>
            </Panel>
        </div>
    );
}

function ChaptersTab({
    book,
    selectedChapterIndex,
    selectedChapter,
    groups,
    metadata,
    releases,
    onAddChapter,
    onSelectChapter,
    onUpdateChapter,
    onDeleteChapter,
    onReleaseNow
}: {
    book: BookEditorState;
    selectedChapterIndex: number;
    selectedChapter?: Chapter;
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
    onAddChapter: () => void;
    onSelectChapter: (index: number) => void;
    onUpdateChapter: (index: number, updates: Partial<Chapter>) => void;
    onDeleteChapter: (index: number) => boolean | Promise<boolean>;
    onReleaseNow: (channel: ReaderChannel, chapterNumber: number) => void;
}) {
    const editorRef = useRef<HTMLTextAreaElement | null>(null);
    const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingChapter, setDeletingChapter] = useState(false);
    const selectedChapterReleases = selectedChapter
        ? releases.filter((release) => release.chapterNumber === selectedChapter.chapterNumber)
        : [];

    useEffect(() => {
        const pendingSelection = pendingSelectionRef.current;
        const editor = editorRef.current;

        if (!pendingSelection || !editor) {
            return;
        }

        editor.focus();
        editor.setSelectionRange(pendingSelection.start, pendingSelection.end);
        pendingSelectionRef.current = null;
    }, [selectedChapter?.content]);

    async function confirmDeleteChapter() {
        setDeletingChapter(true);

        try {
            const deleted = await onDeleteChapter(selectedChapterIndex);
            if (deleted) {
                setDeleteModalOpen(false);
            }
        } finally {
            setDeletingChapter(false);
        }
    }

    function getEditorSelection() {
        const content = selectedChapter?.content ?? "";
        const editor = editorRef.current;

        if (!editor) {
            return { start: content.length, end: content.length };
        }

        return {
            start: editor.selectionStart,
            end: editor.selectionEnd
        };
    }

    function updateChapterContent(content: string, selection: { start: number; end: number }) {
        pendingSelectionRef.current = selection;
        onUpdateChapter(selectedChapterIndex, { content });
    }

    function replaceContentRange(
        start: number,
        end: number,
        replacement: string,
        selection: { start: number; end: number }
    ) {
        if (!selectedChapter) {
            return;
        }

        const content = selectedChapter.content;
        updateChapterContent(
            `${content.slice(0, start)}${replacement}${content.slice(end)}`,
            selection
        );
    }

    function applyInlineFormat(prefix: string, suffix: string, placeholder: string) {
        if (!selectedChapter) {
            return;
        }

        const { start, end } = getEditorSelection();
        const selectedText = selectedChapter.content.slice(start, end);
        const innerText = selectedText || placeholder;
        const replacement = `${prefix}${innerText}${suffix}`;
        const selectionStart = start + prefix.length;

        replaceContentRange(start, end, replacement, {
            start: selectionStart,
            end: selectionStart + innerText.length
        });
    }

    function applyHeadingFormat(level: 1 | 2) {
        if (!selectedChapter) {
            return;
        }

        const content = selectedChapter.content;
        const { start, end } = getEditorSelection();
        const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const lineEndIndex = content.indexOf("\n", end);
        const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
        const headingPrefix = `${"#".repeat(level)} `;
        const selectedLines = content.slice(lineStart, lineEnd);
        const formattedLines = selectedLines
            ? selectedLines.split("\n").map((line) => {
                if (!line.trim()) {
                    return line;
                }

                return `${headingPrefix}${line.replace(/^#{1,6}\s+/, "")}`;
            }).join("\n")
            : `${headingPrefix}Heading`;
        const selectionStart = lineStart + headingPrefix.length;

        replaceContentRange(lineStart, lineEnd, formattedLines, {
            start: selectionStart,
            end: selectedLines ? lineStart + formattedLines.length : selectionStart + "Heading".length
        });
    }

    function applyAlignmentFormat(alignment: "left" | "center" | "right") {
        if (!selectedChapter) {
            return;
        }

        const content = selectedChapter.content;
        const { start, end } = getEditorSelection();
        const hasSelection = start !== end;
        const blockStart = hasSelection ? start : content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const blockEndIndex = hasSelection ? end : content.indexOf("\n", end);
        const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
        const selectedText = content.slice(blockStart, blockEnd) || "Aligned text";
        const leadingBreak = blockStart > 0 && content[blockStart - 1] !== "\n" ? "\n" : "";
        const trailingBreak = blockEnd < content.length && content[blockEnd] !== "\n" ? "\n" : "";
        const wrapperPrefix = `${leadingBreak}:::${alignment}\n`;
        const wrapperSuffix = `\n:::${trailingBreak}`;
        const replacement = `${wrapperPrefix}${selectedText}${wrapperSuffix}`;
        const selectionStart = blockStart + wrapperPrefix.length;

        replaceContentRange(blockStart, blockEnd, replacement, {
            start: selectionStart,
            end: selectionStart + selectedText.length
        });
    }

    return (
        <div className="chapter-workspace">
            <aside className="chapter-sidebar">
                <div className="chapter-sidebar-header">
                    <h2>Chapters</h2>
                    <button className="icon-btn" onClick={onAddChapter} aria-label="Add chapter">+</button>
                </div>
                <div className="chapter-list">
                    {book.chapters.map((chapter, index) => (
                        <button
                            key={chapter.id ?? chapter.chapterNumber}
                            className={selectedChapterIndex === index ? "chapter-list-item active" : "chapter-list-item"}
                            onClick={() => onSelectChapter(index)}
                        >
                            <span>{chapter.chapterNumber}</span>
                            <strong>{chapter.title}</strong>
                        </button>
                    ))}
                </div>
                <button className="secondary-btn full-width" onClick={onAddChapter}>Add New Chapter</button>
            </aside>

            <div className="chapter-editor-shell">
                <div className="chapter-editor-main">
                    <Panel title={selectedChapter ? `Chapter ${selectedChapter.chapterNumber}: ${selectedChapter.title}` : "Chapter Editor"} description="Write and edit chapter content.">
                        {selectedChapter && (
                            <>
                                <div className="field-row">
                                    <div className="field">
                                        <label htmlFor="chapterTitle">Chapter Title</label>
                                        <input id="chapterTitle" value={selectedChapter.title} onChange={(e) => onUpdateChapter(selectedChapterIndex, { title: e.target.value })} />
                                    </div>
                                    <div className="field compact">
                                        <label>Chapter Number</label>
                                        <input value={selectedChapter.chapterNumber} readOnly />
                                    </div>
                                </div>

                                <div className="editor-toolbar" onMouseDown={(event) => event.preventDefault()}>
                                    <button type="button" onClick={() => applyInlineFormat("**", "**", "bold text")} aria-label="Bold" title="Bold">
                                        <FontAwesomeIcon icon={faBold} />
                                    </button>
                                    <button type="button" onClick={() => applyInlineFormat("*", "*", "italic text")} aria-label="Italic" title="Italic">
                                        <FontAwesomeIcon icon={faItalic} />
                                    </button>
                                    <button type="button" onClick={() => applyInlineFormat("__", "__", "underlined text")} aria-label="Underline" title="Underline">
                                        <FontAwesomeIcon icon={faUnderline} />
                                    </button>
                                    <button type="button" onClick={() => applyHeadingFormat(1)} aria-label="Heading 1" title="Heading 1">H1</button>
                                    <button type="button" onClick={() => applyHeadingFormat(2)} aria-label="Heading 2" title="Heading 2">H2</button>
                                    <button type="button" onClick={() => applyAlignmentFormat("left")} aria-label="Align left" title="Align left">
                                        <FontAwesomeIcon icon={faAlignLeft} />
                                    </button>
                                    <button type="button" onClick={() => applyAlignmentFormat("center")} aria-label="Align center" title="Align center">
                                        <FontAwesomeIcon icon={faAlignCenter} />
                                    </button>
                                    <button type="button" onClick={() => applyAlignmentFormat("right")} aria-label="Align right" title="Align right">
                                        <FontAwesomeIcon icon={faAlignRight} />
                                    </button>
                                </div>

                                <textarea
                                    ref={editorRef}
                                    className="chapter-body-editor"
                                    value={selectedChapter.content}
                                    onChange={(e) => onUpdateChapter(selectedChapterIndex, { content: e.target.value })}
                                    placeholder="Start writing this chapter..."
                                />

                                <div className="editor-footer">
                                    <span>{countWords(selectedChapter.content).toLocaleString()} words</span>
                                    <button className="danger-btn" onClick={() => setDeleteModalOpen(true)} disabled={book.chapters.length === 1}>Delete Chapter</button>
                                </div>
                            </>
                        )}
                    </Panel>
                </div>

                <aside className="release-sidebar">
                    <Panel title="Release Overview" description="Reader access by channel.">
                        <ReleasePreview groups={groups} metadata={metadata} releases={releases} />
                    </Panel>
                    <Panel title="Quick Actions">
                        {groups.map((group) => (
                            <button key={group.key} className="quick-action" onClick={() => selectedChapter && onReleaseNow(group.key, selectedChapter.chapterNumber)} disabled={!selectedChapter}>
                                Release to {group.label}
                                <span>{">"}</span>
                            </button>
                        ))}
                    </Panel>
                </aside>
            </div>

            {deleteModalOpen && selectedChapter && (
                <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => !deletingChapter && setDeleteModalOpen(false)}>
                    <div
                        className="admin-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deleteChapterModalTitle"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <h2 id="deleteChapterModalTitle">Delete Chapter {selectedChapter.chapterNumber}?</h2>
                            <button className="icon-btn" type="button" onClick={() => setDeleteModalOpen(false)} disabled={deletingChapter} aria-label="Close delete chapter modal">x</button>
                        </div>
                        <div className="admin-modal-body">
                            <p>
                                This will delete "{selectedChapter.title}" from the working copy. All associated releases for this chapter will be removed when you save changes.
                            </p>
                            <div className="delete-release-warning">
                                <strong>{selectedChapterReleases.length}</strong>
                                <span>{selectedChapterReleases.length === 1 ? "release queued for removal" : "releases queued for removal"}</span>
                            </div>
                        </div>
                        <div className="admin-modal-actions">
                            <button className="secondary-btn" type="button" onClick={() => setDeleteModalOpen(false)} disabled={deletingChapter}>Cancel</button>
                            <button className="danger-btn" type="button" onClick={confirmDeleteChapter} disabled={deletingChapter}>
                                {deletingChapter ? "Deleting..." : "Delete Chapter"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function VersionsTab({
    selectedChapter,
    revisions,
    onCreateRevision,
    onRestoreRevision
}: {
    selectedChapter?: Chapter;
    revisions: ChapterRevision[];
    onCreateRevision: (chapterNumber: number) => void;
    onRestoreRevision: (revision: ChapterRevision) => void;
}) {
    const chapterRevisions = revisions.filter((revision) => revision.chapterNumber === selectedChapter?.chapterNumber);
    const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(chapterRevisions[0]?.id ?? null);
    const selectedRevision = chapterRevisions.find((revision) => revision.id === selectedRevisionId) ?? chapterRevisions[0] ?? null;

    useEffect(() => {
        setSelectedRevisionId(chapterRevisions[0]?.id ?? null);
    }, [selectedChapter?.chapterNumber, revisions.length]);

    return (
        <Panel step="4" title="Chapter History" description="Preview previous snapshots and restore one into the current working copy.">
            <div className="history-layout">
                <div className="revision-list">
                    {chapterRevisions.length === 0 ? (
                        <div className="admin-empty-state">No revisions yet. Create a snapshot from the current working copy.</div>
                    ) : chapterRevisions.map((revision, index) => (
                        <button
                            type="button"
                            className={selectedRevision?.id === revision.id ? "revision-card active" : "revision-card"}
                            key={revision.id ?? revision.revisionNumber}
                            onClick={() => setSelectedRevisionId(revision.id ?? null)}
                        >
                            <div>
                                <strong>Revision {revision.revisionNumber}{index === 0 ? " (Latest)" : ""}</strong>
                                <span>{revision.title}</span>
                                <span>{revision.createdAt ? new Date(revision.createdAt).toLocaleString('en-GB') : "No timestamp"}</span>
                            </div>
                            <div>
                                <StatusPill label={index === 0 ? "Latest" : "Snapshot"} />
                                <span>{countWords(revision.content ?? "").toLocaleString()} words</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="revision-preview">
                    {selectedRevision ? (
                        <>
                            <div className="revision-preview-header">
                                <div>
                                    <h3>{selectedRevision.title}</h3>
                                    <p>Revision {selectedRevision.revisionNumber} by {selectedRevision.createdByLabel}</p>
                                </div>
                                <button className="primary-btn" onClick={() => onRestoreRevision(selectedRevision)}>
                                    Restore to Working Copy
                                </button>
                            </div>
                            <div className="revision-preview-content">
                                {(selectedRevision.content || "This revision has no content.").split(/\n{2,}/).map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="admin-empty-state">Select a revision to preview it.</div>
                    )}
                </div>
            </div>
            <button
                className="secondary-btn centered-action"
                onClick={() => selectedChapter && onCreateRevision(selectedChapter.chapterNumber)}
                disabled={!selectedChapter}
            >
                Create Snapshot
            </button>
        </Panel>
    );
}

function ReleasesTab({
    groups,
    metadata,
    releases,
    selectedChapter,
    chapters,
    onScheduleRelease,
    onDeleteRelease
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
    selectedChapter?: Chapter;
    chapters: Chapter[];
    onScheduleRelease: (input: {
        channel: ReaderChannel;
        chapterNumber: number;
        releaseAt: string | null;
        status?: ChapterRelease["status"];
    }) => void;
    onDeleteRelease: (releaseId: number) => void;
}) {
    const [scheduleChannel, setScheduleChannel] = useState<ReaderChannel>("beta");
    const [scheduleChapterNumber, setScheduleChapterNumber] = useState(selectedChapter?.chapterNumber ?? chapters[0]?.chapterNumber ?? 1);
    const [releaseDate, setReleaseDate] = useState("");
    const [releaseTime, setReleaseTime] = useState("10:00");

    function submitSchedule() {
        const releaseAt = releaseDate ? `${releaseDate}T${releaseTime || "10:00"}:00` : null;

        onScheduleRelease({
            channel: scheduleChannel,
            chapterNumber: scheduleChapterNumber,
            releaseAt
        });
    }

    function releaseNow() {
        onScheduleRelease({
            channel: scheduleChannel,
            chapterNumber: scheduleChapterNumber,
            releaseAt: new Date().toISOString(),
            status: "released"
        });
    }

    return (
        <div className="release-grid">
            <Panel step="5" title="Release Preview" description="See how this chapter is released to each reader group.">
                <ReleasePreview groups={groups} metadata={metadata} releases={releases} />
            </Panel>

            <Panel step="6" title="Schedule Release" description="Plan when chapters go live for each reader group.">
                <div className="schedule-form">
                    <label>
                        Reader Group
                        <select value={scheduleChannel} onChange={(e) => setScheduleChannel(e.target.value as ReaderChannel)}>
                            {groups.map((group) => (
                                <option value={group.key} key={group.key}>{group.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Release Chapter
                        <select value={scheduleChapterNumber} onChange={(e) => setScheduleChapterNumber(Number(e.target.value))}>
                            {chapters.map((chapter) => (
                                <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                                    Chapter {chapter.chapterNumber}: {chapter.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Release Date
                        <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
                    </label>
                    <label>
                        Release Time
                        <input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)} />
                    </label>
                    <button className="primary-btn" onClick={submitSchedule}>Schedule Release</button>
                    <button className="secondary-btn" onClick={releaseNow}>Release Now</button>
                </div>
            </Panel>

            <Panel title="Schedule">
                <div className="schedule-list">
                    {releases.length === 0 ? (
                        <div className="admin-empty-state">No releases scheduled yet.</div>
                    ) : (
                        releases.map((release) => {
                            const group = groups.find((item) => item.key === release.channel);
                            const chapter = chapters.find((item) => item.chapterNumber === release.chapterNumber);
                            const date = release.releaseAt ? new Date(release.releaseAt) : null;

                            return (
                                <div className="schedule-item" key={release.id ?? `${release.channel}-${release.chapterNumber}`}>
                                    <div className="schedule-date">
                                        <span>{date ? date.toLocaleString('en-GB', { month: 'short' }).toUpperCase() : "TBD"}</span>
                                        <strong>{date ? date.getDate() : "-"}</strong>
                                    </div>
                                    <div>
                                        <strong>{chapter?.title ?? `Chapter ${release.chapterNumber}`}</strong>
                                        <span>{group?.label ?? release.channel} {date ? `at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ""}</span>
                                    </div>
                                    <StatusPill label={release.status} />
                                    {release.id && (
                                        <button className="danger-btn" onClick={() => onDeleteRelease(release.id!)}>
                                            {release.status === "scheduled" ? "Cancel" : "Revert"}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Panel>
        </div>
    );
}

function ReaderGroupsTab({
    groups,
    readerAccounts,
    onAddMember,
    onMemberStatus
}: {
    groups: ReaderGroup[];
        readerAccounts: ReaderAccount[];
    onAddMember: (groupId: number, userId: number) => void;
    onMemberStatus: (groupId: number, memberId: number, status: ReaderGroupMember["status"]) => void;
}) {
    const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? 0);
    const [selectedUserId, setSelectedUserId] = useState<number | "">("");
    const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
    const activeMemberUserIds = new Set((activeGroup?.memberList ?? [])
        .filter((member) => member.status === "active")
        .map((member) => member.userId));
    const availableReaders = readerAccounts.filter((reader) =>
        reader.active && !activeMemberUserIds.has(reader.id)
    );

    useEffect(() => {
        if (!activeGroupId && groups[0]?.id) {
            setActiveGroupId(groups[0].id);
        }
    }, [activeGroupId, groups]);

    function submitMember() {
        if (!activeGroup?.id) {
            toast.error("Save this book before adding readers");
            return;
        }

        if (!selectedUserId) {
            toast.error("Choose a reader account");
            return;
        }

        onAddMember(activeGroup.id, selectedUserId);
        setSelectedUserId("");
    }

    return (
        <Panel step="7" title="Reader Groups" description="Manage who can access each reader group.">
            <ReaderGroupCards groups={groups} activeGroupId={activeGroup?.id} onSelect={setActiveGroupId} />

            <div className="reader-member-form">
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Choose reader account</option>
                    {availableReaders.map((reader) => (
                        <option key={reader.id} value={reader.id}>{reader.username}</option>
                    ))}
                </select>
                <button className="primary-btn" onClick={submitMember}>Add Member</button>
            </div>

            <table className="admin-data-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Access</th>
                    </tr>
                </thead>
                <tbody>
                    {(activeGroup?.memberList ?? []).length === 0 ? (
                        <tr>
                            <td colSpan={4}>No members in this group yet.</td>
                        </tr>
                    ) : (activeGroup?.memberList ?? []).map((member) => (
                        <tr key={member.id ?? member.username}>
                            <td>{member.user?.username ?? member.username}</td>
                            <td>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-GB') : "-"}</td>
                            <td><StatusPill label={member.status} /></td>
                            <td>
                                {member.id && activeGroup?.id && (
                                    <button
                                        className="secondary-btn"
                                        onClick={() => onMemberStatus(activeGroup.id!, member.id!, member.status === "active" ? "removed" : "active")}
                                    >
                                        {member.status === "active" ? "Remove" : "Restore"}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Panel>
    );
}

function feedbackReaderKey(readerUserId: number | null | undefined, readerUsername: string) {
    return readerUserId ? `id:${readerUserId}` : `name:${readerUsername.toLowerCase()}`;
}

function FeedbackTab({
    groups,
    chapters,
    feedback,
    selectedChapter,
    onFeedbackStatus
}: {
    groups: ReaderGroup[];
    chapters: Chapter[];
    feedback: ReaderFeedbackItem[];
    selectedChapter?: Chapter;
    onFeedbackStatus: (feedbackId: number, status: ReaderFeedbackItem["status"]) => void;
}) {
    const [channel, setChannel] = useState<"all" | ReaderChannel>("all");
    const [chapterNumber, setChapterNumber] = useState<"all" | "book" | number>(
        selectedChapter?.chapterNumber ?? "all"
    );
    const [readerFilter, setReaderFilter] = useState("all");
    const visibleGroups = useMemo(
        () => channel === "all" ? groups : groups.filter((group) => group.key === channel),
        [channel, groups]
    );
    const readerOptions = useMemo(() => {
        const options = new Map<string, string>();

        visibleGroups
            .flatMap((group) => group.memberList ?? [])
            .filter((member) => member.status === "active")
            .forEach((member) => {
                const key = feedbackReaderKey(member.userId, member.user?.username ?? member.username);
                options.set(key, member.user?.username ?? member.username);
            });

        feedback
            .filter((item) => channel === "all" || item.channel === channel)
            .forEach((item) => {
                options.set(feedbackReaderKey(item.readerUserId ?? null, item.reader?.username ?? item.readerUsername), item.reader?.username ?? item.readerUsername);
            });

        return Array.from(options, ([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [channel, feedback, visibleGroups]);

    const filteredFeedback = useMemo(() => {
        return feedback.filter((item) => {
            if (channel !== "all" && item.channel !== channel) {
                return false;
            }

            if (chapterNumber === "book" && item.chapterNumber !== null) {
                return false;
            }

            if (typeof chapterNumber === "number" && item.chapterNumber !== chapterNumber) {
                return false;
            }

            if (readerFilter !== "all" && feedbackReaderKey(item.readerUserId ?? null, item.reader?.username ?? item.readerUsername) !== readerFilter) {
                return false;
            }

            return true;
        });
    }, [channel, chapterNumber, feedback, readerFilter]);

    useEffect(() => {
        setReaderFilter("all");
    }, [channel]);

    return (
        <Panel step="8" title="Feedback" description="See reader feedback by chapter and reader group.">
            <div className="feedback-form">
                <select value={channel} onChange={(e) => setChannel(e.target.value as "all" | ReaderChannel)}>
                    <option value="all">All reader groups</option>
                    {groups.map((group) => (
                        <option key={group.key} value={group.key}>{group.label}</option>
                    ))}
                </select>
                <select
                    value={chapterNumber}
                    onChange={(e) => {
                        const value = e.target.value;
                        setChapterNumber(value === "all" || value === "book" ? value : Number(value));
                    }}
                >
                    <option value="all">All chapters</option>
                    {chapters.map((chapter) => (
                        <option key={chapter.chapterNumber} value={chapter.chapterNumber}>Chapter {chapter.chapterNumber}: {chapter.title}</option>
                    ))}
                </select>
                <select value={readerFilter} onChange={(e) => setReaderFilter(e.target.value)}>
                    <option value="all">All readers</option>
                    {readerOptions.map((reader) => (
                        <option key={reader.value} value={reader.value}>{reader.label}</option>
                    ))}
                </select>
            </div>

            <FeedbackList
                groups={groups}
                feedback={filteredFeedback}
                selectedChapter={selectedChapter}
                onFeedbackStatus={onFeedbackStatus}
            />
        </Panel>
    );
}

function Panel({
    step,
    title,
    description,
    children
}: {
    step?: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="admin-panel">
            <div className="admin-panel-header">
                {step && <span className="step-badge">{step}</span>}
                <div>
                    <h2>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
            </div>
            <div className="admin-panel-body">{children}</div>
        </section>
    );
}

function ChannelSwitcher({
    groups,
    activeChannel,
    onChange
}: {
    groups: ReaderGroup[];
    activeChannel: ReaderChannel;
    onChange: (channel: ReaderChannel) => void;
}) {
    return (
        <div className="channel-switcher">
            {groups.map((group) => (
                <button key={group.key} className={activeChannel === group.key ? "active" : ""} onClick={() => onChange(group.key)}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    {group.label}
                </button>
            ))}
        </div>
    );
}

function ChapterMiniTable({
    chapters,
    groups,
    metadata,
    releases
}: {
    chapters: Chapter[];
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
}) {
    return (
        <table className="admin-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Words</th>
                    <th>Releases</th>
                </tr>
            </thead>
            <tbody>
                {chapters.map((chapter) => (
                    <tr key={chapter.id ?? chapter.chapterNumber}>
                        <td>{chapter.chapterNumber}</td>
                        <td>{chapter.title}</td>
                        <td>{countWords(chapter.content).toLocaleString()}</td>
                        <td>
                            <ReleaseDots groups={groups} metadata={metadata} releases={releases} chapterNumber={chapter.chapterNumber} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ReleasePreview({
    groups,
    metadata,
    releases
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
}) {
    return (
        <div className="release-preview-list">
            {groups.map((group) => (
                <div className="release-preview-item" key={group.key}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>{countReleasedChapters(releases, group.key)} released chapters</span>
                        <span>{countScheduledChapters(releases, group.key)} scheduled releases</span>
                    </div>
                    <StatusPill label={getChannelReleaseStatus(group.key, metadata, releases)} />
                </div>
            ))}
        </div>
    );
}

function ReaderGroupCards({
    groups,
    activeGroupId,
    onSelect
}: {
    groups: ReaderGroup[];
    activeGroupId?: number;
    onSelect?: (groupId: number) => void;
}) {
    return (
        <div className="reader-group-cards">
            {groups.map((group) => (
                <button
                    type="button"
                    className={activeGroupId === group.id ? "reader-group-card active" : "reader-group-card"}
                    key={group.key}
                    onClick={() => group.id && onSelect?.(group.id)}
                >
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>{group.members ? `${group.members} members` : group.key === "public" ? "All readers" : "No members"}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}

function FeedbackList({
    groups,
    feedback,
    selectedChapter,
    compact = false,
    onFeedbackStatus
}: {
    groups: ReaderGroup[];
    feedback: ReaderFeedbackItem[];
    selectedChapter?: Chapter;
    compact?: boolean;
    onFeedbackStatus?: (feedbackId: number, status: ReaderFeedbackItem["status"]) => void;
}) {
    const visibleFeedback = compact ? feedback.slice(0, 2) : feedback;

    return (
        <div className={compact ? "feedback-list compact" : "feedback-list"}>
            {visibleFeedback.length === 0 ? (
                <div className="admin-empty-state">No feedback yet.</div>
            ) : visibleFeedback.map((item) => {
                const group = groups.find((candidate) => candidate.key === item.channel) ?? groups[0];

                return (
                    <article className="feedback-card" key={item.id ?? `${item.channel}-${item.chapterNumber}-${item.readerUsername}`}>
                        <div className="feedback-card-header">
                            <strong>{item.readerUsername}</strong>
                            <StatusPill label={group.label} />
                            <span>{item.chapterNumber ? `Chapter ${item.chapterNumber}` : selectedChapter?.title}</span>
                            <StatusPill label={feedbackReadLabel(item.status)} />
                        </div>
                        <p>{item.comment}</p>
                        {!compact && item.id && (
                            <div className="feedback-actions">
                                <button
                                    className="secondary-btn"
                                    onClick={() => onFeedbackStatus?.(item.id!, isFeedbackRead(item.status) ? "open" : "reviewed")}
                                >
                                    {isFeedbackRead(item.status) ? "Mark unread" : "Mark as read"}
                                </button>
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

function ReleaseDots({
    groups,
    metadata,
    releases,
    chapterNumber
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    releases: ChapterRelease[];
    chapterNumber: number;
}) {
    return (
        <div className="release-dots">
            {groups.map((group) => (
                <span
                    key={group.key}
                    className={isChapterReleasedToChannel(chapterNumber, group.key, metadata, releases) ? `channel-dot ${group.tone}` : "release-missing"}
                >
                    {isChapterReleasedToChannel(chapterNumber, group.key, metadata, releases) ? group.shortLabel : "-"}
                </span>
            ))}
        </div>
    );
}

function BookStatusDropdown({
    status,
    onChange,
    disabled = false
}: {
    status: BookStatus;
    onChange: (status: BookStatus) => void;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="status-dropdown"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                type="button"
                className="status-dropdown-trigger"
                onClick={() => setIsOpen((current) => !current)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Change book status"
            >
                <StatusPill label={formatBookStatus(status)} />
            </button>

            {isOpen && (
                <div className="status-dropdown-menu" role="listbox" aria-label="Book status options">
                    {Object.entries(bookStatusLabels).map(([value, label]) => {
                        const optionStatus = value as BookStatus;

                        return (
                            <button
                                key={value}
                                type="button"
                                className={`status-dropdown-option ${status === optionStatus ? "active" : ""}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setIsOpen(false);
                                    onChange(optionStatus);
                                }}
                                role="option"
                                aria-selected={status === optionStatus}
                            >
                                <StatusPill label={label} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatusPill({ label }: { label: string }) {
    const normalized = label.toLowerCase().replace(/\s+/g, "-");
    return <span className={`status-pill ${normalized}`}>{label}</span>;
}

function isFeedbackRead(status: ReaderFeedbackItem["status"]) {
    return status === "reviewed" || status === "resolved";
}

function feedbackReadLabel(status: ReaderFeedbackItem["status"]) {
    return isFeedbackRead(status) ? "Read" : "Unread";
}

function formatTabLabel(tab: string) {
    if (tab === "history") {
        return "Chapter History";
    }

    return tab.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatBookStatus(status: BookStatus) {
    return bookStatusLabels[status] ?? "In Progress";
}

function isChapterReleasedToChannel(
    chapterNumber: number,
    channel: ReaderChannel,
    _metadata: Record<ReaderChannel, ChannelMetadata>,
    releases: ChapterRelease[]
) {
    return releases.some((release) =>
        release.channel === channel
        && release.chapterNumber === chapterNumber
        && release.status === "released"
    );
}

function getBookReleaseAvailability(releases: ChapterRelease[]) {
    if (releases.some((release) => release.channel === "public" && release.status === "released")) {
        return "Public";
    }

    if (releases.some((release) => release.channel === "beta" && release.status === "released")) {
        return "Beta Released";
    }

    if (releases.some((release) => release.channel === "alpha" && release.status === "released")) {
        return "Alpha Released";
    }

    if (releases.some((release) => release.status === "scheduled")) {
        return "Scheduled";
    }

    return "Unreleased";
}

function countReleasedChapters(releases: ChapterRelease[], channel: ReaderChannel) {
    return releases.filter((release) => release.channel === channel && release.status === "released").length;
}

function countScheduledChapters(releases: ChapterRelease[], channel: ReaderChannel) {
    return releases.filter((release) => release.channel === channel && release.status === "scheduled").length;
}

function getChannelReleaseStatus(
    channel: ReaderChannel,
    _metadata: Record<ReaderChannel, ChannelMetadata>,
    releases: ChapterRelease[]
) {
    const channelReleases = releases.filter((release) => release.channel === channel);

    if (channelReleases.some((release) => release.status === "released")) {
        return "Released";
    }

    if (channelReleases.some((release) => release.status === "scheduled")) {
        return "Scheduled";
    }

    return "Unreleased";
}

function normalizeReaderGroups(groups: any[] = []): ReaderGroup[] {
    if (!groups.length) {
        return readerGroups;
    }

    return groups.map((group) => {
        const channel = group.channel as ReaderChannel;
        const fallback = readerGroups.find((item) => item.key === channel) ?? readerGroups[0];
        const memberList = (group.members ?? []).map(normalizeReaderGroupMember);

        return {
            id: group.id,
            key: channel,
            channel,
            label: group.name ?? fallback.label,
            name: group.name,
            shortLabel: fallback.shortLabel,
            members: group.memberCount ?? memberList.length,
            memberCount: group.memberCount ?? memberList.length,
            tone: fallback.tone,
            description: group.description ?? "",
            memberList,
        };
    });
}

function normalizeReaderGroupMember(member: any): ReaderGroupMember {
    return {
        ...member,
        status: member.status === "removed" ? "removed" : "active",
    };
}

function countBookWords(book: BookEditorState) {
    return book.chapters.reduce((total, chapter) => total + countWords(chapter.content), 0);
}

function countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length;
}

function getExcerpt(value?: string) {
    if (!value) {
        return "";
    }

    return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}
