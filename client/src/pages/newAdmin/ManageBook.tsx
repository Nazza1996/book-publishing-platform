import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, setPageTitle, toast } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import '../../styles/admin/manage-book.scss';
import AdminNav from "./AdminNav";

type ReaderChannel = "alpha" | "beta" | "public";

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
    publishedVersionId: number | null;
    versionStatus: string;
    chapters: Chapter[];
}

interface ChannelMetadata {
    description: string;
    authorNote: string;
    releaseLimit: number;
    nextRelease: string;
}

interface ReaderGroup {
    key: ReaderChannel;
    label: string;
    shortLabel: string;
    members: number;
    tone: string;
}

const EMPTY_BOOK: BookEditorState = {
    id: null,
    slug: "",
    title: "",
    description: "",
    publishedVersionId: null,
    versionStatus: "draft",
    chapters: [
        { title: "Chapter 1", content: "", chapterNumber: 1 }
    ]
};

const tabs = ["overview", "details", "chapters", "versions", "releases", "reader-groups", "feedback", "settings"];

const readerGroups: ReaderGroup[] = [
    { key: "alpha", label: "Alpha Readers", shortLabel: "A", members: 12, tone: "purple" },
    { key: "beta", label: "Beta Readers", shortLabel: "B", members: 45, tone: "blue" },
    { key: "public", label: "Public Readers", shortLabel: "P", members: 0, tone: "green" }
];

const initialChannelMetadata: Record<ReaderChannel, ChannelMetadata> = {
    alpha: {
        description: "An early look at the story. Feedback is welcome.",
        authorNote: "This is an early draft. Expect changes.",
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
    const [error, setError] = useState("");

    const currentTab = useMemo(() => {
        const hash = location.hash.substring(1).toLowerCase();
        return tabs.includes(hash) ? hash : "overview";
    }, [location.hash]);

    const selectedChapter = book.chapters[selectedChapterIndex] ?? book.chapters[0];
    const isPublished = Boolean(book.publishedVersionId);

    useEffect(() => {
        setPageTitle(isNewBook ? "New Book" : "Manage Book");
    }, [isNewBook]);

    useEffect(() => {
        if (isNewBook) {
            setBook(EMPTY_BOOK);
            setSelectedChapterIndex(0);
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
                    publishedVersionId: data.publishedVersionId ?? null,
                    versionStatus: data.versionStatus ?? "draft",
                    chapters
                });
                setChannelMetadata((current) => ({
                    alpha: { ...current.alpha, description: data.description || current.alpha.description },
                    beta: { ...current.beta, description: data.description || current.beta.description },
                    public: { ...current.public, description: data.description || current.public.description }
                }));
                setSelectedChapterIndex(0);
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
                    scope: 'all'
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

    function handleDeleteChapter(index: number) {
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
                chapters: chapters.length ? chapters : EMPTY_BOOK.chapters
            };
        });
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
                            isPublished={isPublished}
                            saving={saving}
                            onSave={handleSaveDraft}
                        />

                        <Tablist activeTab={currentTab} />

                        <div id="manageBookTabContent">
                            {currentTab === "overview" && (
                                <OverviewTab
                                    book={book}
                                    groups={readerGroups}
                                    metadata={channelMetadata}
                                    selectedChapter={selectedChapter}
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
                                    onAddChapter={handleAddChapter}
                                    onSelectChapter={setSelectedChapterIndex}
                                    onUpdateChapter={updateChapter}
                                    onDeleteChapter={handleDeleteChapter}
                                />
                            )}
                            {currentTab === "versions" && (
                                <VersionsTab selectedChapter={selectedChapter} />
                            )}
                            {currentTab === "releases" && (
                                <ReleasesTab
                                    groups={readerGroups}
                                    metadata={channelMetadata}
                                    selectedChapter={selectedChapter}
                                />
                            )}
                            {currentTab === "reader-groups" && (
                                <ReaderGroupsTab groups={readerGroups} />
                            )}
                            {currentTab === "feedback" && (
                                <FeedbackTab groups={readerGroups} selectedChapter={selectedChapter} />
                            )}
                            {currentTab === "settings" && (
                                <SettingsTab book={book} />
                            )}
                        </div>
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
    isPublished,
    saving,
    onSave
}: {
    book: BookEditorState;
    isNewBook: boolean;
    isPublished: boolean;
    saving: boolean;
    onSave: () => void;
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
                    <span className={`status-pill ${isPublished ? "published" : "draft"}`}>
                        {isPublished ? "Published" : "Draft"}
                    </span>
                    <span>{book.chapters.length} chapters</span>
                    <span>{countBookWords(book).toLocaleString()} words</span>
                </div>
            </div>

            <div className="admin-header-actions">
                <button className="secondary-btn" type="button">Preview Book</button>
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
    onNavigate
}: {
    book: BookEditorState;
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    selectedChapter?: Chapter;
    onNavigate: (tab: string) => void;
}) {
    return (
        <div className="admin-grid overview-grid">
            <Panel step="1" title="Book Details" description="Shared metadata and channel-specific reader copy.">
                <div className="overview-detail-list">
                    <div>
                        <span>Title</span>
                        <strong>{book.title || "Untitled Book"}</strong>
                    </div>
                    <div>
                        <span>Status</span>
                        <strong>{book.publishedVersionId ? "Published" : "Draft"}</strong>
                    </div>
                    <div>
                        <span>Slug</span>
                        <strong>{book.slug || "Generated after save"}</strong>
                    </div>
                </div>
                <button className="secondary-btn panel-action" onClick={() => onNavigate("details")}>Edit Details</button>
            </Panel>

            <Panel step="2" title="Chapters Overview" description="Draft chapter list with release availability.">
                <ChapterMiniTable chapters={book.chapters} groups={groups} metadata={metadata} />
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
                <ReleasePreview groups={groups} metadata={metadata} />
            </Panel>

            <Panel step="5" title="Reader Groups" description="Access groups for staged releases.">
                <ReaderGroupCards groups={groups} />
            </Panel>

            <Panel step="6" title="Feedback" description="Recent reader feedback.">
                <FeedbackList groups={groups} selectedChapter={selectedChapter} compact />
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
                            <div className="field">
                                <label htmlFor="releaseLimit">Current Release Limit</label>
                                <input id="releaseLimit" type="number" min="0" value={metadata.releaseLimit} onChange={(e) => onChannelFieldChange("releaseLimit", Number(e.target.value))} />
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
    onAddChapter,
    onSelectChapter,
    onUpdateChapter,
    onDeleteChapter
}: {
    book: BookEditorState;
    selectedChapterIndex: number;
    selectedChapter?: Chapter;
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    onAddChapter: () => void;
    onSelectChapter: (index: number) => void;
    onUpdateChapter: (index: number, updates: Partial<Chapter>) => void;
    onDeleteChapter: (index: number) => void;
}) {
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
                            <StatusPill label={getChapterStatus(chapter, book.publishedVersionId)} />
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

                                <div className="editor-toolbar">
                                    <select aria-label="Text style" defaultValue="paragraph">
                                        <option value="paragraph">Paragraph</option>
                                        <option value="heading">Heading</option>
                                    </select>
                                    <button type="button">B</button>
                                    <button type="button">I</button>
                                    <button type="button">U</button>
                                    <button type="button">List</button>
                                    <button type="button">Link</button>
                                </div>

                                <textarea
                                    className="chapter-body-editor"
                                    value={selectedChapter.content}
                                    onChange={(e) => onUpdateChapter(selectedChapterIndex, { content: e.target.value })}
                                    placeholder="Start writing this chapter..."
                                />

                                <div className="editor-footer">
                                    <span>{countWords(selectedChapter.content).toLocaleString()} words</span>
                                    <button className="danger-btn" onClick={() => onDeleteChapter(selectedChapterIndex)} disabled={book.chapters.length === 1}>Delete Chapter</button>
                                </div>
                            </>
                        )}
                    </Panel>
                </div>

                <aside className="release-sidebar">
                    <Panel title="Release Overview" description="Reader access by channel.">
                        <ReleasePreview groups={groups} metadata={metadata} />
                    </Panel>
                    <Panel title="Quick Actions">
                        {groups.map((group) => (
                            <button key={group.key} className="quick-action">
                                Release to {group.label}
                                <span>{">"}</span>
                            </button>
                        ))}
                    </Panel>
                </aside>
            </div>
        </div>
    );
}

function VersionsTab({ selectedChapter }: { selectedChapter?: Chapter }) {
    const revisions = [5, 4, 3, 2, 1];

    return (
        <Panel step="4" title="Versions & Revisions" description="Track and manage revisions for this chapter.">
            <div className="revision-list">
                {revisions.map((revision, index) => (
                    <div className={index === 0 ? "revision-card active" : "revision-card"} key={revision}>
                        <div>
                            <strong>Revision {revision}{index === 0 ? " (Current)" : ""}</strong>
                            <span>{selectedChapter?.title ?? "Selected Chapter"}</span>
                        </div>
                        <div>
                            <StatusPill label={index === 0 ? "Current" : "Archived"} />
                            <span>{Math.max(250, countWords(selectedChapter?.content ?? "") - index * 110).toLocaleString()} words</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="secondary-btn centered-action">Create New Revision</button>
        </Panel>
    );
}

function ReleasesTab({
    groups,
    metadata,
    selectedChapter
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    selectedChapter?: Chapter;
}) {
    return (
        <div className="release-grid">
            <Panel step="5" title="Release Preview" description="See how this chapter is released to each reader group.">
                <ReleasePreview groups={groups} metadata={metadata} />
            </Panel>

            <Panel step="6" title="Schedule Release" description="Plan when chapters go live for each reader group.">
                <div className="schedule-form">
                    <label>
                        Reader Group
                        <select defaultValue="beta">
                            {groups.map((group) => (
                                <option value={group.key} key={group.key}>{group.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Release Chapter
                        <select defaultValue={selectedChapter?.chapterNumber ?? 1}>
                            <option value={selectedChapter?.chapterNumber ?? 1}>{selectedChapter?.title ?? "Current Chapter"}</option>
                        </select>
                    </label>
                    <label>
                        Release Date
                        <input type="date" defaultValue="2026-06-10" />
                    </label>
                    <label>
                        Release Time
                        <input type="time" defaultValue="10:00" />
                    </label>
                    <label className="checkbox-row">
                        <input type="checkbox" defaultChecked />
                        Notify readers when released
                    </label>
                    <button className="primary-btn">Schedule Release</button>
                </div>
            </Panel>

            <Panel title="Schedule">
                <div className="schedule-list">
                    {groups.map((group, index) => (
                        <div className="schedule-item" key={group.key}>
                            <div className="schedule-date">
                                <span>JUN</span>
                                <strong>{10 + index * 7}</strong>
                            </div>
                            <div>
                                <strong>{selectedChapter?.title ?? "Next Chapter"}</strong>
                                <span>{group.label} at 10:00 AM</span>
                            </div>
                            <StatusPill label="Scheduled" />
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}

function ReaderGroupsTab({ groups }: { groups: ReaderGroup[] }) {
    return (
        <Panel step="7" title="Reader Groups" description="Manage who can access each reader group.">
            <ReaderGroupCards groups={groups} />
            <table className="admin-data-table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Joined</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {["lira.reader@example.com", "kael.fan@example.com", "storm.chaser@example.com"].map((email, index) => (
                        <tr key={email}>
                            <td>{email.split("@")[0]}</td>
                            <td>{email}</td>
                            <td>{new Date(2026, 4, index + 1).toLocaleDateString('en-GB')}</td>
                            <td><StatusPill label="Active" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Panel>
    );
}

function FeedbackTab({ groups, selectedChapter }: { groups: ReaderGroup[]; selectedChapter?: Chapter }) {
    return (
        <Panel step="8" title="Feedback" description="See reader feedback by chapter and reader group.">
            <div className="feedback-toolbar">
                <button className="tab active">All Feedback</button>
                <button className="tab">By Chapter</button>
                <button className="tab">By Reader Group</button>
                <input placeholder="Search feedback..." />
                <button className="secondary-btn">Filter</button>
            </div>
            <FeedbackList groups={groups} selectedChapter={selectedChapter} />
        </Panel>
    );
}

function SettingsTab({ book }: { book: BookEditorState }) {
    return (
        <Panel title="Settings" description="Book-level controls for this workspace.">
            <div className="settings-grid">
                <div>
                    <strong>Book ID</strong>
                    <span>{book.id ?? "Unsaved"}</span>
                </div>
                <div>
                    <strong>Slug</strong>
                    <span>{book.slug || "Generated after save"}</span>
                </div>
                <div>
                    <strong>Version Status</strong>
                    <span>{book.versionStatus}</span>
                </div>
            </div>
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
    metadata
}: {
    chapters: Chapter[];
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
}) {
    return (
        <table className="admin-data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Words</th>
                    <th>Releases</th>
                </tr>
            </thead>
            <tbody>
                {chapters.map((chapter) => (
                    <tr key={chapter.id ?? chapter.chapterNumber}>
                        <td>{chapter.chapterNumber}</td>
                        <td>{chapter.title}</td>
                        <td><StatusPill label={getChapterStatus(chapter, null)} /></td>
                        <td>{countWords(chapter.content).toLocaleString()}</td>
                        <td>
                            <ReleaseDots groups={groups} metadata={metadata} chapterNumber={chapter.chapterNumber} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ReleasePreview({
    groups,
    metadata
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
}) {
    return (
        <div className="release-preview-list">
            {groups.map((group) => (
                <div className="release-preview-item" key={group.key}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>Up to Chapter {metadata[group.key].releaseLimit}</span>
                    </div>
                    <StatusPill label={group.key === "alpha" ? "Released" : "Scheduled"} />
                </div>
            ))}
        </div>
    );
}

function ReaderGroupCards({ groups }: { groups: ReaderGroup[] }) {
    return (
        <div className="reader-group-cards">
            {groups.map((group) => (
                <div className="reader-group-card" key={group.key}>
                    <span className={`channel-dot ${group.tone}`}>{group.shortLabel}</span>
                    <div>
                        <strong>{group.label}</strong>
                        <span>{group.members ? `${group.members} members` : "All readers"}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FeedbackList({
    groups,
    selectedChapter,
    compact = false
}: {
    groups: ReaderGroup[];
    selectedChapter?: Chapter;
    compact?: boolean;
}) {
    const group = groups[0];

    return (
        <div className={compact ? "feedback-list compact" : "feedback-list"}>
            <article className="feedback-card">
                <div className="feedback-card-header">
                    <strong>lira.reader</strong>
                    <StatusPill label={group.label} />
                    <span>{selectedChapter?.title ?? "Chapter 1"}</span>
                </div>
                <p>Love the opening. The atmosphere is clear, but I wanted a little more description around what the character is feeling.</p>
            </article>
        </div>
    );
}

function ReleaseDots({
    groups,
    metadata,
    chapterNumber
}: {
    groups: ReaderGroup[];
    metadata: Record<ReaderChannel, ChannelMetadata>;
    chapterNumber: number;
}) {
    return (
        <div className="release-dots">
            {groups.map((group) => (
                <span
                    key={group.key}
                    className={chapterNumber <= metadata[group.key].releaseLimit ? `channel-dot ${group.tone}` : "release-missing"}
                >
                    {chapterNumber <= metadata[group.key].releaseLimit ? group.shortLabel : "-"}
                </span>
            ))}
        </div>
    );
}

function StatusPill({ label }: { label: string }) {
    const normalized = label.toLowerCase().replace(/\s+/g, "-");
    return <span className={`status-pill ${normalized}`}>{label}</span>;
}

function formatTabLabel(tab: string) {
    return tab.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function getChapterStatus(chapter: Chapter, publishedVersionId: number | null) {
    if (publishedVersionId && chapter.content.trim()) {
        return "Published";
    }

    if (chapter.content.trim()) {
        return "Draft";
    }

    return "Empty";
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
