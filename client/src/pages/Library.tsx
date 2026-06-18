import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/library.scss';
import { apiFetch, setPageTitle } from '../helpers';

type LibraryChannel = "alpha" | "beta" | "public";

interface LibraryBook {
    id: number;
    slug?: string;
    title: string;
    description: string;
    libraryChannel?: LibraryChannel;
    availableChannels?: LibraryChannel[];
}

const channelLabels: Record<LibraryChannel, string> = {
    alpha: "Alpha",
    beta: "Beta",
    public: "Public",
};

export default function Library() {
    const [books, setBooks] = useState<LibraryBook[]>([]);

    setPageTitle("Library");

    useEffect(() => {
        async function fetchBooks() {
            const response = await apiFetch('/api/books/released');
            const data = await response.json();
            setBooks(data);
        }

        fetchBooks();
    }, []);

    return (
        <>
            <section className="library-hero">
                <div>
                    <h1>Story Library</h1>
                    <p>A complete collection of stories with public releases, ranging from short tales to longer narratives. Find your next favorite story here.</p>
                </div>
            </section>

            <main className="library-container">
                {!Array.isArray(books) || books.length === 0 ? (
                    <div className="empty-state">
                        <p>No released stories yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="books-grid">
                        {books.map((book, index) => (
                            book.availableChannels?.map((channel) => (
                                <article key={index} className="book-card">
                                    <div className="book-card-content">
                                        {channel && channel !== "public" && (
                                            <span className={`book-access-badge ${channel}`}>
                                                {channelLabels[channel]} Reader
                                            </span>
                                        )}
                                        <h3 className="book-card-title">{book.title}</h3>
                                        <p className="book-card-excerpt">
                                            {book.description}
                                        </p>
                                    </div>
                                    <Link to={getBookLink(book, channel)} className="book-card-link">Read Story</Link>
                                </article>
                            ))
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}

function getBookLink(book: LibraryBook, channel?: LibraryChannel) {
    const identifier = book.slug ?? book.id;

    if (!channel || channel === "public") {
        return `/book/${identifier}`;
    }

    return `/book/${identifier}?version=${channel}`;
}
