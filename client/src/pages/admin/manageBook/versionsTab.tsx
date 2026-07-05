import { useEffect, useState } from "react";
import { countWords } from "./helpers";
import type { Chapter, ChapterRevision } from "./types";
import { Panel } from "./components/Panel";
import { StatusPill } from "./components/StatusPill";

export function VersionsTab({
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
