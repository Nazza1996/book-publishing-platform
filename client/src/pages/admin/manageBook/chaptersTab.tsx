import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignCenter, faAlignLeft, faAlignRight, faBold, faCompress, faExpand, faGripVertical, faItalic, faUnderline } from "@fortawesome/free-solid-svg-icons";
import { countWords } from "./helpers";
import type { BookEditorState, Chapter, ChapterRelease, ChannelMetadata, ReaderChannel, ReaderGroup } from "./types";
import { Panel } from "./components/Panel";
import { ReleasePreview } from "./components/ReleasePreview";
import { DragDropProvider } from "@dnd-kit/react";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";

function chapterSortableId(chapter: Chapter) {
    return chapter.clientKey ?? (chapter.id ? `chapter-id-${chapter.id}` : `chapter-number-${chapter.chapterNumber}`);
}

function SortableChapterRow({
    chapter,
    index,
    selected,
    onSelect
}: {
    chapter: Chapter;
    index: number;
    selected: boolean;
    onSelect: () => void;
}) {
    const { handleRef, isDragSource, isDropTarget, ref } = useSortable({
        id: chapterSortableId(chapter),
        index,
        group: "chapters"
    });

    function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        onSelect();
    }

    return (
        <div
            ref={ref}
            className={[
                "chapter-list-item",
                selected ? "active" : "",
                isDragSource ? "dragging" : "",
                isDropTarget ? "drop-target" : ""
            ].filter(Boolean).join(" ")}
        >
            <button
                className="chapter-select-button"
                type="button"
                onPointerDown={handlePointerDown}
                onClick={onSelect}
            >
                <span
                    ref={handleRef}
                    title="Drag to reorder"
                    style={{ cursor: "grab" }}
                >
                    {chapter.chapterNumber}
                </span>
                <strong title={chapter.title}>
                    {chapter.title}
                </strong>
            </button>
        </div>
    );
}

export function ChaptersTab({
    book,
    selectedChapterIndex,
    selectedChapter,
    groups,
    metadata,
    releases,
    onAddChapter,
    onSelectChapter,
    onUpdateChapter,
    onMoveChapter,
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
    onMoveChapter: (from: number, to: number) => void;
    onDeleteChapter: (index: number) => boolean | Promise<boolean>;
    onReleaseNow: (channel: ReaderChannel, chapterNumber: number) => void;
}) {
    const editorRef = useRef<HTMLTextAreaElement | null>(null);
    const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingChapter, setDeletingChapter] = useState(false);
    const [editorFullscreen, setEditorFullscreen] = useState(false);
    const selectedChapterReleases = selectedChapter
        ? releases.filter((release) => release.chapterNumber === selectedChapter.chapterNumber)
        : [];

    function handleChapterDragEnd(event: DragEndEvent) {
        if (event.canceled || !isSortableOperation(event.operation)) {
            return;
        }

        const from = event.operation.source!.initialIndex;
        const to = event.operation.source!.index;

        if (from !== to) {
            onMoveChapter(from, to);
        }
    }

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

    useEffect(() => {
        if (!editorFullscreen) {
            return;
        }

        const previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setEditorFullscreen(false);
            }
        }

        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.documentElement.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [editorFullscreen]);

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

    function toggleFullscreenEditor() {
        setEditorFullscreen((isFullscreen) => !isFullscreen);
        window.requestAnimationFrame(() => editorRef.current?.focus());
    }

    return (
        <div className="chapter-workspace">
            <aside className="chapter-sidebar">
                <div className="chapter-sidebar-header">
                    <h2>Chapters</h2>
                    <button className="icon-btn" onClick={onAddChapter} aria-label="Add chapter">+</button>
                </div>
                <DragDropProvider onDragEnd={handleChapterDragEnd}>
                    <div className="chapter-list">
                        {book.chapters.map((chapter, index) => (
                            <SortableChapterRow
                                key={chapterSortableId(chapter)}
                                chapter={chapter}
                                index={index}
                                selected={selectedChapterIndex === index}
                                onSelect={() => onSelectChapter(index)}
                            />
                        ))}
                    </div>
                </DragDropProvider>
                <button className="secondary-btn full-width" onClick={onAddChapter}>Add New Chapter</button>
            </aside>

            <div className="chapter-editor-shell">
                <div className={editorFullscreen ? "chapter-editor-main fullscreen" : "chapter-editor-main"}>
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
                                    <button type="button" onClick={toggleFullscreenEditor} aria-label="Fullscreen editor" title={`${editorFullscreen ? "Exit" : "Enter"} fullscreen editor`}>
                                        <FontAwesomeIcon icon={editorFullscreen ? faCompress : faExpand} />
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
