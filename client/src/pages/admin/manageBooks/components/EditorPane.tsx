import { useEffect, useRef } from "react";
import { useEasyMDE } from "../hooks/useEasyMDE"

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
                {selectedBook.id && (
                    <button type="button" className="toolbar-button secondary" onClick={handleDeleteBook}>
                        Delete Book
                    </button>
                )}
                <button type="submit" name="action" value="save_book" className={`toolbar-button secondary ${unsavedChanges ? 'has-changes' : ''}`} onClick={handleSaveBook}>
                    {unsavedChanges ? '💾 Save Draft' : 'Save Draft'}
                </button>
                {isPublished && (
                    <>
                        <button type="submit" name="action" value="convert_to_draft" className="toolbar-button secondary" onClick={handleConvertToDraft}>Unpublish</button>
                        <button type="submit" name="action" value="toggle_featured" className="toolbar-button secondary featured-toggle" onClick={handleToggleSpotlight}>{selectedBook.isFeatured ? '★ Remove from Spotlight' : '☆ Add to Spotlight'}</button>
                    </>
                )}
                <button type="submit" name="action" value="publish_book" className="toolbar-button primary" onClick={handlePublishBook}>
                    {isPublished ? 'Republish Book' : 'Publish Book'}
                </button>
            </div>
        </section>
    )
}