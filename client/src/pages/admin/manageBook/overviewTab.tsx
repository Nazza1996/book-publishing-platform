import { countWords, getBookReleaseAvailability, getExcerpt } from "./helpers";
import type { BookEditorState, Chapter, ChapterRelease, ChannelMetadata, ReaderChannel, ReaderFeedbackItem, ReaderGroup } from "./types";
import { ChapterMiniTable } from "./components/ChapterMiniTable";
import { FeedbackList } from "./components/FeedbackList";
import { Panel } from "./components/Panel";
import { ReaderGroupCards } from "./components/ReaderGroupCards";
import { ReleasePreview } from "./components/ReleasePreview";

export function OverviewTab({
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
                        <span>Genres</span>
                        <strong>{book.genres.length ? book.genres.join(", ") : "Not set"}</strong>
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
