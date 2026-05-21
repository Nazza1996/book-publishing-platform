import { useEffect, useState } from "react";
import Select from 'react-select';
import { Link, useNavigate, useParams } from "react-router-dom";
import '../styles/books.css';
import '../styles/book-view.css';
import '../styles/custom-select.css'
import { apiFetch, markdownToHtml, setPageTitle } from "../helpers";

export default function Book() {
    const { slug } = useParams();
    const [bookLoading, setBookLoading] = useState(true);
    const [book, setBook] = useState<any>(null);
    const [currentChapter, setCurrentChapter] = useState<number>(1);

    const navigate = useNavigate();
    const isDraft = document.location.search.includes('version=draft');

    useEffect(() => {
        async function fetchBook() {
            if (!slug) {
                navigate('/notFound');
                return;
            }

            try {
                const version = isDraft ? 'draft' : 'published';
                const res = await apiFetch(`/api/books/${slug}?version=${version}`, {
                    credentials: 'include',
                    toast: false,
                });

                if (res.status === 404) {
                    navigate('/notFound');
                    return;
                }

                const data = await res.json();
                // Extract chapters from version object
                setBook({
                    ...data,
                    chapters: data.version?.chapters || []
                });
            } catch (err) {
                console.error("Error fetching book:", err);
                navigate('/notFound');
            } finally {
                setBookLoading(false);
            }
        }
        
        fetchBook();
    }, [slug]);

    useEffect(() => {
        setPageTitle(book ? book.title : "Book");
    }, [book]);

    const selectChapter = (num: number, scrollIntoView: boolean = false) => {
        setCurrentChapter(num);
        if (scrollIntoView) {
            document.querySelector('.book-viewer')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    return (
        <main className="books-site-page">
                <header className="books-site-hero">
                    <div>
                        <h1>{book?.title}</h1>
                        {isDraft && <div className="book-badges"><span className="book-draft-badge">DRAFT</span></div>}
                    </div>
                    <div className="book-controls">
                        <p><Link to="/library">← Back to Library</Link></p>
                        <ChapterSelector
                            chapters={book?.chapters || []}
                            currentChapter={currentChapter}
                            onSelect={(num) => selectChapter(num)}
                        />
                    </div>
                </header>
            
            <ChapterContent book={book} isLoading={bookLoading} currentChapter={currentChapter} />

            <div className="books-site-footer">
                <div className="book-controls">
                    <p><Link to="/library">← Back to Library</Link></p>
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
        <Select
            options={chapters.map(chapter => ({ value: chapter.chapterNumber, label: chapter.title }))}
            onChange={(selectedOption) => onSelect(selectedOption?.value!)}
            value={chapters.find(ch => ch.chapterNumber === currentChapter) ? { value: currentChapter, label: chapters.find(chapter => chapter.chapterNumber === currentChapter)?.title } : null}
            menuPlacement="auto"
            theme={(theme) => ({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: '#003366',
                }
            })}
            isSearchable={false}
        />
    );
}

const ChapterContent = ({ isLoading, book, currentChapter }: { book: any, isLoading: boolean, currentChapter: number }) => {
    return (
        <article className="book-viewer">
            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <div>
                    <h1 style={{ textAlign: "center" }}>{book?.chapters?.find((ch: any) => ch.chapterNumber === currentChapter)?.title}</h1>
                    <div className="chapter-content">
                        <span dangerouslySetInnerHTML={{ __html: markdownToHtml(book?.chapters?.find((ch: any) => ch.chapterNumber === currentChapter)?.content) }} />
                    </div>
                </div>
            )}
        </article>
    );
}