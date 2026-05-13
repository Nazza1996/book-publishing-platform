import { useEffect, useState } from "react";
import Select from 'react-select';
import '../styles/books.css';
import '../styles/book-view.css';
import '../styles/custom-select.css'

export default function Book() {
    const bookSlug = window.location.pathname.split('/').pop();
    const [bookLoading, setBookLoading] = useState(true);
    const [book, setBook] = useState<any>(null);
    const [currentChapter, setCurrentChapter] = useState<number>(1);

    useEffect(() => {
        async function fetchBook() {
            await fetch(`/api/books/${bookSlug}`)
                .then(res => res.json())
                .then(data => {
                    setBook(data);
                })
                .catch(err => console.error('Error fetching book data:', err));
        }

        fetchBook();
        setBookLoading(false);
    }, [bookSlug]);

    const selectChapter = (num: number, scrollIntoView: boolean = false) => {
        setCurrentChapter(num);
        if (scrollIntoView) {
            document.querySelector('.book-viewer')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    return (
        <main className="books-site-page">
            {!bookLoading && !book ? (
                <header className="books-site-hero book-not-found">
                    <h1>Book not found</h1>
                    <p>The book you requested does not exist or has not been published yet.</p>
                    <p><a href="/library">← Back to Library</a></p>
                </header>
            ) : (

                <header className="books-site-hero">
                    <div>
                        <h1>{book?.title}</h1>
                    </div>
                    <div className="book-controls">
                        <p><a href="/library">← Back to Library</a></p>
                        <div style={{ width: 200 }}>
                            <ChapterSelector
                                chapters={book?.chapters || []}
                                currentChapter={currentChapter}
                                onSelect={(num) => selectChapter(num)}
                            />
                        </div>
                    </div>
                </header>

            )}
            
            <ChapterContent book={book} isLoading={bookLoading} currentChapter={currentChapter} />

            <div className="books-site-footer">
                <div className="book-controls">
                    <p><a href="/library">← Back to Library</a></p>
                    <ChapterSelector
                        chapters={book?.chapters || []}
                        currentChapter={currentChapter}
                        onSelect={(num) => selectChapter(num, true)}
                    />
                </div>
            </div>
        </main>
    )
}

const ChapterSelector = ({ chapters, currentChapter, onSelect }: { chapters: any[], currentChapter: number, onSelect: (num: number) => void }) => {
    return (
        <div style={{ width: 200 }}>
            <Select
                options={chapters.map(chapter => ({ value: chapter.num, label: chapter.title }))}
                onChange={(selectedOption) => onSelect(selectedOption?.value!)}
                value={chapters.find(ch => ch.num === currentChapter) ? { value: currentChapter, label: chapters.find(chapter => chapter.num === currentChapter)?.title } : null}
                menuPlacement="auto"
                theme={(theme) => ({
                    ...theme,
                    colors: {
                        ...theme.colors,
                        primary: '#003366',
                    }
                })}
            />
        </div>
    );
}

const ChapterContent = ({ isLoading, book, currentChapter }: { book: any, isLoading: boolean, currentChapter: number }) => {
    return (
        <article className="book-viewer">
            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <div>
                    <h1 style={{ textAlign: "center" }}>{book?.chapters?.find((ch: any) => ch.num === currentChapter)?.title}</h1>
                    <div className="chapter-content">
                        <p>{book?.chapters?.find((ch: any) => ch.num === currentChapter)?.content}</p>
                    </div>
                </div>
            )}
        </article>
    );
}