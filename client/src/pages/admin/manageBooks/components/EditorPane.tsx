import { useEffect, useRef, useState } from "react";
import { useEasyMDE } from "../hooks/useEasyMDE"
import BookDeleteModal from "../../modals/BookDelete";

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
    primaryLabelOverride,
    isLoading = false,
    loadingLabel,
    disabled = false
}: {
    baseLabel: string;
    scope: ActionScope;
    onScopeChange: (scope: ActionScope) => void;
    onPrimaryClick: (scope: ActionScope) => void;
    buttonClassName: string;
    ariaLabel: string;
    primaryLabelOverride?: string;
    isLoading?: boolean;
    loadingLabel?: string;
    disabled?: boolean;
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
                className={`toolbar-button ${buttonClassName} split-action-main ${isLoading ? "is-loading" : ""}`}
                onClick={() => {
                    onPrimaryClick(scope);
                    setIsOpen(false);
                }}
                disabled={isLoading || disabled}
                aria-busy={isLoading}
            >
                {isLoading ? (loadingLabel ?? `${baseLabel}...`) : primaryLabel}
            </button>

            <button
                type="button"
                className={`toolbar-button ${buttonClassName} split-action-toggle`}
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                disabled={isLoading || disabled}
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
    isPublished,
    pendingActions
}: any) {
    const currentChapterIndexRef = useRef(selectedChapterIndex);
    const [saveScope, setSaveScope] = useState<ActionScope>("all");
    const [publishScope, setPublishScope] = useState<ActionScope>("current");
    const [unpublishScope, setUnpublishScope] = useState<ActionScope>("all");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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
        <>
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
                                isLoading={pendingActions.convertToDraft}
                                loadingLabel="Unpublishing..."
                            />
                            <button
                                type="submit"
                                name="action"
                                value="toggle_featured"
                                className={`toolbar-button secondary featured-toggle ${pendingActions.toggleSpotlight ? 'is-loading' : ''}`}
                                onClick={handleToggleSpotlight}
                                disabled={pendingActions.toggleSpotlight}
                                aria-busy={pendingActions.toggleSpotlight}
                            >
                                {pendingActions.toggleSpotlight
                                    ? 'Updating spotlight...'
                                    : (selectedBook.isFeatured ? '★ Remove from Spotlight' : '☆ Add to Spotlight')}
                            </button>
                        </>
                    )}
                </div>
                <div className="editor-actions">
                    {selectedBook.id && (
                        <button
                            type="button"
                            className={`toolbar-button secondary ${pendingActions.deleteBook ? 'is-loading' : ''}`}
                            onClick={() => setDeleteModalOpen(true)}
                            disabled={pendingActions.deleteBook}
                            aria-busy={pendingActions.deleteBook}
                        >
                            {pendingActions.deleteBook ? 'Deleting book...' : 'Delete Book'}
                        </button>
                    )}
                    
                    <SplitActionButton
                        baseLabel="Save"
                        scope={saveScope}
                        onScopeChange={setSaveScope}
                        onPrimaryClick={handleSaveBook}
                        buttonClassName={`secondary ${unsavedChanges ? 'has-changes' : ''}`}
                        ariaLabel="Choose save draft option"
                        isLoading={pendingActions.saveBook}
                        loadingLabel="Saving..."
                    />

                    <SplitActionButton
                        baseLabel={isPublished ? "Republish" : "Publish"}
                        scope={publishScope}
                        onScopeChange={setPublishScope}
                        onPrimaryClick={handlePublishBook}
                        buttonClassName="primary"
                        ariaLabel="Choose publish option"
                        primaryLabelOverride={publishPrimaryLabel}
                        isLoading={pendingActions.publishBook}
                        loadingLabel="Publishing..."
                    />
                </div>
            </section>

            {deleteModalOpen && (
                <BookDeleteModal
                    closeFunction={() => setDeleteModalOpen(false)}
                    submitFunction={() => handleDeleteBook(setDeleteModalOpen)}
                    bookName={selectedBook.title}
                />
            )}
        </>
    )
}