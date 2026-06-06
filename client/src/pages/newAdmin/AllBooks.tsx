import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setPageTitle } from "../../helpers";
import '../../styles/admin/shared-admin.scss';
import '../../styles/admin/all-books.scss';
import AdminNav from "./AdminNav";

interface BookSummary {
    id: number;
    slug: string;
    title: string;
    updatedAt: string;
    publishedVersionId?: number | null;
    hasUnpublishedDrafts?: boolean;
}

export default function AllBooks() {
    const navigate = useNavigate();
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setPageTitle("All Books");
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchBooks() {
            setLoading(true);
            setError("");

            try {
                const res = await apiFetch('/api/books');
                if (!res.ok) {
                    setError("Could not load books.");
                    return;
                }

                const data = await res.json();
                if (isMounted) {
                    setBooks(data);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchBooks();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredBooks = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return books;
        }

        return books.filter(book =>
            book.title.toLowerCase().includes(normalizedSearch)
        );
    }, [books, searchTerm]);

    useEffect(() => {
        setPageTitle("All Books");
    }, []);

    return (
        <div id="adminView">
            <AdminNav />
            <section id="allBooksView" className="admin-section">
                <div id="allBooksHeader">
                    <div id="booksHeaderLeft">
                        <div>Books</div>
                        <div>Create, manage and publish your books.</div>
                    </div>
                    <div id="booksHeaderRight">
                        <input
                            id="searchBooksInput"
                            type="text"
                            placeholder="Search books..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button id="newBookButton" onClick={() => navigate('/admin/new-book')}>New Book</button>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-state">Loading books...</div>
                ) : error ? (
                    <div className="admin-state error">{error}</div>
                ) : (
                    <BooksTable books={filteredBooks} />
                )}
            </section>
        </div>
    )
}

function BooksTable({ books }: { books: BookSummary[] }) {
    function formatDate(dateString: string) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        }).format(date);
    }

    function formatDateTitle(dateString: string) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            month: 'long',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function getStatus(book: BookSummary) {
        if (!book.publishedVersionId) {
            return "Draft";
        }

        if (book.hasUnpublishedDrafts) {
            return "Published with drafts";
        }

        return "Published";
    }

    return (
        <div id="books-table-wrapper">
            <div id="books-table-header">
                <div id="books-table-title">All Books</div>
            </div>

            {books.length === 0 ? (
                <div className="admin-empty-state">No books found.</div>
            ) : (
                <table id="books-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map((book) => (
                            <tr key={book.id}>
                                <td><Link to={`/admin/book/${book.slug}`} className="book-link">{book.title}</Link></td>
                                <td>{getStatus(book)}</td>
                                <td title={formatDateTitle(book.updatedAt)}>{formatDate(book.updatedAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
