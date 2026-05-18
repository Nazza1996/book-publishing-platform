export default function BookDetails({ selectedBook, handleBookTitleChange, handleBookDescriptionChange, unsavedChanges, isPublished }: any) {
    const statusText = isPublished ? 'Published' : 'Draft';
    const statusClass = isPublished ? 'status-published' : 'status-draft';

    return (
        <section className="books-editor-card">
            <div className="editor-topbar">
                <div>
                    <p className="eyebrow">Details</p>
                    <h2>Book Details</h2>
                </div>

                <div className="editor-topbar-meta">
                    <span className={`status-pill ${statusClass}`}>{statusText}</span>
                    {unsavedChanges && (
                        <span className="status-pill status-unsaved" title="You have unsaved changes">● Unsaved Changes</span>
                    )}
                    {selectedBook.isFeatured && (
                        <span className="status-pill status-featured">Spotlight</span>
                    )}
                    {selectedBook.id && (
                        <a className="view-book-link" href={`/book/${selectedBook.id}`} target="_blank" rel="noopener noreferrer">
                            View {isPublished ? "Published" : "Draft"}
                        </a>
                    )}
                </div>
            </div>

            <div className="editor-grid">
                <label className="field">
                    <span>Book Title</span>
                    <input type="text" name="book_title" id="bookTitle" value={selectedBook.title} onChange={handleBookTitleChange} placeholder="Enter a title" required />
                </label>
            </div>

            <label className="field">
                <span>Book Description</span>
                <input type="text" name="book_description" id="bookDescription" value={selectedBook.description} onChange={handleBookDescriptionChange} placeholder="Enter a description" required />
            </label>
        </section>
    )
}