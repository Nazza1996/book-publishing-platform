import { useEffect, useState } from 'react';
import '../styles/library.css';
import { setPageTitle } from '../helpers';

export default function Library() {
    const [books, setBooks] = useState<any[]>([]);

    setPageTitle("Library");

    useEffect(() => {
        async function fetchBooks() {
            const response = await fetch('/api/books/published');
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
                    <p>A complete collection of my published stories, ranging from short tales to longer narratives. Find your next favorite story here.</p>
                </div>
            </section>

            <main className="library-container">
                {books.length === 0 ? (
                    <div className="empty-state">
                        <p>No published stories yet. Check back soon!</p>
                    </div>
                ) : (
                    <div className="books-grid">
                        {books.map((book, index) => (
                            <article key={index} className="book-card">
                                <div className="book-card-content">
                                    <h3 className="book-card-title">{book.title}</h3>
                                    <p className="book-card-excerpt">
                                        {book.description}
                                    </p>
                                </div>
                                <a href={`/book/${book.id}`} className="book-card-link">Read Story</a>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}