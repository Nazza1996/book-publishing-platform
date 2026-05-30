import { useEffect, useRef, useState } from "react";
import { useEasyMDE } from "../hooks/useEasyMDE"

type ActionScope = "all" | "current";

const ACTION_SCOPE_OPTIONS: Array<{ value: ActionScope; label: string }> = [
    { value: "all", label: "All chapters" },
    { value: "current", label: "Current chapter" }
];

function SplitActionButton({
    baseLabel,
    scope,
    onScopeChange,
    onPrimaryClick,
    buttonClassName,
    ariaLabel,
    primaryLabelOverride
}: {
    baseLabel: string;
    scope: ActionScope;
    onScopeChange: (scope: ActionScope) => void;
    onPrimaryClick: (scope: ActionScope) => void;
    buttonClassName: string;
    ariaLabel: string;
    primaryLabelOverride?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const groupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleDocumentClick);

        return () => document.removeEventListener("mousedown", handleDocumentClick);
    }, []);

    const selectedLabel = ACTION_SCOPE_OPTIONS.find(option => option.value === scope)?.label ?? ACTION_SCOPE_OPTIONS[0].label;
    const primaryLabel = primaryLabelOverride ?? `${baseLabel} ${selectedLabel.toLowerCase()}`;

    return (
        <div className="split-action" ref={groupRef}>
            <button
                type="button"
                className={`toolbar-button ${buttonClassName} split-action-main`}
                onClick={() => {
                    onPrimaryClick(scope);
                    setIsOpen(false);
                }}
            >
                {primaryLabel}
            </button>

            <button
                type="button"
                className={`toolbar-button ${buttonClassName} split-action-toggle`}
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={isOpen}
            >
                ▾
            </button>

            {isOpen && (
                <div className="split-action-menu" role="menu" aria-label={`${baseLabel} options`}>
                    {ACTION_SCOPE_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            className={`split-action-option ${scope === option.value ? "is-selected" : ""}`}
                            onClick={() => {
                                onScopeChange(option.value);
                                setIsOpen(false);
                            }}
                            role="menuitemradio"
                            aria-checked={scope === option.value}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function EditorPane({
    selectedBook,
    handleSaveBook,
    handlePublishBook,
    handleConvertToDraft,
    handleToggleSpotlight,
    handleDeleteBook,
    selectedChapterIndex,
    setSelectedBook,
    unsavedChanges,
    isPublished
}: any) {
    const currentChapterIndexRef = useRef(selectedChapterIndex);
    const [saveScope, setSaveScope] = useState<ActionScope>("all");
    const [publishScope, setPublishScope] = useState<ActionScope>("current");
    const [unpublishScope, setUnpublishScope] = useState<ActionScope>("all");

    useEffect(() => {
        currentChapterIndexRef.current = selectedChapterIndex;
    }, [selectedChapterIndex]);

    const { textareaRef, setValue } = useEasyMDE((value: string) => {
        setSelectedBook((prev: any) => {
            const updated = [...prev.chapters];

            updated[currentChapterIndexRef.current] = {
                ...updated[currentChapterIndexRef.current],
                content: value
            };

            return {
                ...prev,
                chapters: updated
            };
        });
    });

    useEffect(() => {
        const content = selectedBook.chapters?.[currentChapterIndexRef.current]?.content ?? '';

        setValue(content);
    }, [selectedBook.id, selectedChapterIndex]);

    const activeChapterNumber = selectedBook.chapters?.[selectedChapterIndex]?.chapterNumber ?? (selectedChapterIndex + 1);
    const isCurrentChapterPublished = Boolean(
        selectedBook.publishedVersion?.chapters?.some((chapter: any) => chapter.chapterNumber === activeChapterNumber)
    );
    const publishPrimaryLabel = publishScope === "current"
        ? `${isCurrentChapterPublished ? "Republish" : "Publish"} current chapter`
        : `${isPublished ? "Republish" : "Publish"} all chapters`;

    return (
        <section className="books-editor-card">
            <div className="editor-topbar">
                <div>
                    <p className="eyebrow">Editor</p>
                    <h2>
                        {selectedBook.title ? `Editing ${selectedBook.title}` : 'New Book'}
                        {unsavedChanges && <span className="unsaved-indicator" title="Unsaved changes"> ●</span>}
                    </h2>
                </div>                                
            </div>

            <label className="field editor-field">
                <span>Markdown Content</span>
                <textarea ref={textareaRef} name="markdown_content" id="markdownContent" rows={22} placeholder="Write your book here..." />
            </label>

            <div className="editor-actions">

                {isPublished && (
                    <>
                        <SplitActionButton
                            baseLabel="Unpublish"
                            scope={unpublishScope}
                            onScopeChange={setUnpublishScope}
                            onPrimaryClick={handleConvertToDraft}
                            buttonClassName="secondary"
                            ariaLabel="Choose unpublish option"
                        />
                        <button type="submit" name="action" value="toggle_featured" className="toolbar-button secondary featured-toggle" onClick={handleToggleSpotlight}>{selectedBook.isFeatured ? '★ Remove from Spotlight' : '☆ Add to Spotlight'}</button>
                    </>
                )}
            </div>
            <div className="editor-actions">
                {selectedBook.id && (
                    <button type="button" className="toolbar-button secondary" onClick={handleDeleteBook}>
                        Delete Book
                    </button>
                )}
                
                <SplitActionButton
                    baseLabel="Save"
                    scope={saveScope}
                    onScopeChange={setSaveScope}
                    onPrimaryClick={handleSaveBook}
                    buttonClassName={`secondary ${unsavedChanges ? 'has-changes' : ''}`}
                    ariaLabel="Choose save draft option"
                />

                <SplitActionButton
                    baseLabel={isPublished ? "Republish" : "Publish"}
                    scope={publishScope}
                    onScopeChange={setPublishScope}
                    onPrimaryClick={handlePublishBook}
                    buttonClassName="primary"
                    ariaLabel="Choose publish option"
                    primaryLabelOverride={publishPrimaryLabel}
                />
            </div>
        </section>
    )
}