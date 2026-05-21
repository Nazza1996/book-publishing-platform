export default function BookSidebar({ books, selectedBook }: { books: any[]; selectedBook: any }) {
    const selectedIdentifier = selectedBook.slug ?? selectedBook.id;

    return (
        <aside className="books-sidebar">
            <div className="sidebar-head">
                <h2>Book Library</h2>
                <p>{books.length ?? 0} total</p>
            </div>

            {!books || !Array.isArray(books) || books.length === 0  ? (
                <p className="no-books">No books found.</p>
            ) : (
                <div className="book-list" aria-label="Books">
                    {books.map((book) => {
                        const isPublished = book.publishedVersionId !== null && book.publishedVersionId !== undefined;
                        const statusClass = isPublished ? 'status-published' : 'status-draft';
                        const statusText = isPublished ? 'Published' : 'Draft';
                        const bookIdentifier = book.slug ?? book.id;

                        return (
                            <a className={`book-list-item ${bookIdentifier === selectedIdentifier ? 'is-active' : ''}`} href={`/admin/manage_books#${encodeURIComponent(bookIdentifier)}`} key={book.id}>
                                <span className="book-list-title">{book.title}</span>
                                <span className="book-list-meta">
                                    <span className={`status-pill ${statusClass}`}>{statusText}</span>
                                    {book.hasUnpublishedDrafts && (
                                        <span className="status-pill status-unsaved" title="Has unpublished draft changes">● Draft Changes</span>
                                    )}
                                    {book.isFeatured && (
                                        <span className="status-pill status-featured">Spotlight</span>
                                    )}
                                </span>
                            </a>
                        );
                    })}
                </div>
            )}
        </aside>
    )
}