export default function BookSidebar({ books, selectedBook }: { books: any[]; selectedBook: any }) {
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
                    {books.map((book) => (
                        <a className={`book-list-item ${book.id === selectedBook.id ? 'is-active' : ''}`} href={`/admin/manage_books#${encodeURIComponent(book.id)}`} key={book.id}>
                            <span className="book-list-title">{book.title}</span>
                            <span className="book-list-meta">
                                <span className={`status-pill status-${book.status}`}>{book.status.charAt(0).toUpperCase() + book.status.slice(1)}</span>
                                {book.isFeatured && (
                                    <span className="status-pill status-featured">Spotlight</span>
                                )}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </aside>
    )
}