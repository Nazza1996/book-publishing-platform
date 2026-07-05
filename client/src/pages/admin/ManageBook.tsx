import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, setPageTitle, toast } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import '../../styles/admin/manage-book.scss';
import AdminNav from "./AdminNav";
import { BookWorkspaceHeader } from "./manageBook/components/BookWorkspaceHeader";
import { ChaptersTab } from "./manageBook/chaptersTab";
import { DetailsTab } from "./manageBook/detailsTab";
import { FeedbackTab } from "./manageBook/feedbackTab";
import { ReleasesTab } from "./manageBook/releasesTab";
import { ReaderGroupsTab } from "./manageBook/readerGroupsTab";
import { OverviewTab } from "./manageBook/overviewTab";
import { VersionsTab } from "./manageBook/versionsTab";
import { EMPTY_BOOK, initialChannelMetadata, readerGroups, tabs } from "./manageBook/constants";
import { formatTabLabel, normalizeGenres, normalizeReaderGroupMember, normalizeReaderGroups } from "./manageBook/helpers";
import type { BookEditorState, BookStatus, Chapter, ChapterRelease, ChannelMetadata, ReaderAccount, ReaderChannel, ReaderFeedbackItem, ReaderGroupMember, ChapterRevision } from "./manageBook/types";

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
                    genres: normalizeGenres(data.genres),
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

    function updateBookGenres(genres: string[]) {
        setBook((current) => ({ ...current, genres }));
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
                                    onBookGenresChange={updateBookGenres}
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
