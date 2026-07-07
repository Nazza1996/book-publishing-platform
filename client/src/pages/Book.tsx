import { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import { Link, useNavigate, useParams } from "react-router-dom";
import '../styles/books.scss';
import '../styles/book-view.scss';
import { apiFetch, markdownToHtml, setPageTitle } from "../helpers";
import AccessibilityMenu from "../components/AccessibilityMenu";
import { useAuth } from "../contexts/AuthContext";

export default function Book() {
    const { slug } = useParams();
    const [bookLoading, setBookLoading] = useState(true);
    const [book, setBook] = useState<any>(null);
    const [currentChapter, setCurrentChapter] = useState<number>(1);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [feedbackSending, setFeedbackSending] = useState(false);

    const navigate = useNavigate();
    const { user } = useAuth();
    const searchParams = new URLSearchParams(document.location.search);
    const requestedVersion = searchParams.get('version') ?? 'public';
    const readerChannel = requestedVersion === 'alpha' || requestedVersion === 'beta' ? requestedVersion : null;

    useEffect(() => {
        async function fetchBook() {
            if (!slug) {
                navigate('/notFound');
                return;
            }

            try {
                const version = requestedVersion;
                const res = await apiFetch(`/api/books/${slug}?version=${version}`, {
                    credentials: 'include',
                    toast: false,
                });

                if (!res.ok) {
                    if (res.status === 401 && readerChannel) {
                        navigate(`/login?redirect=${encodeURIComponent(`${document.location.pathname}${document.location.search}`)}`);
                        return;
                    }

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
    }, [navigate, readerChannel, requestedVersion, slug]);

    useEffect(() => {
        setPageTitle(book ? book.title : "Book");
    }, [book]);

    useEffect(() => {
        const firstChapter = book?.chapters?.[0];

        if (firstChapter && !book.chapters.some((chapter: any) => chapter.chapterNumber === currentChapter)) {
            setCurrentChapter(firstChapter.chapterNumber);
        }
    }, [book, currentChapter]);

    const selectChapter = (num: number, scrollIntoView: boolean = false) => {
        setCurrentChapter(num);
        if (scrollIntoView) {
            document.querySelector('.book-viewer')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    const submitFeedback = async () => {
        if (!book?.id || !readerChannel || !feedbackComment.trim()) {
            return;
        }

        setFeedbackSending(true);

        try {
            const res = await apiFetch(`/api/books/${book.id}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    channel: readerChannel,
                    chapterNumber: currentChapter,
                    comment: feedbackComment,
                }),
            });

            if (res.ok) {
                setFeedbackComment("");
            }
        } finally {
            setFeedbackSending(false);
        }
    }

    return (
        <main className="books-site-page">
                <header className="books-site-hero">
                    <div>
                        <h1>{book?.title}</h1>
                        {requestedVersion !== 'public' && (
                            <div className="book-badges">
                                {requestedVersion === 'draft' && <span className="status-badge draft-badge">DRAFT</span>}
                                {requestedVersion === 'alpha' && <span className="status-badge alpha-badge">ALPHA</span>}
                                {requestedVersion === 'beta' && <span className="status-badge beta-badge">BETA</span>}
                            </div>
                        )}
                    </div>
                    <div className="book-controls">
                        <div className="back-to-library">
                            <Link to="/library">← Back to Library</Link>
                            <AccessibilityMenu isMobile={true} />
                        </div>
                        <AccessibilityMenu />
                        <ChapterSelector
                            chapters={book?.chapters || []}
                            currentChapter={currentChapter}
                            onSelect={(num) => selectChapter(num)}
                        />
                    </div>
                </header>
            
            <ChapterContent book={book} isLoading={bookLoading} currentChapter={currentChapter} />

            {readerChannel && user?.role === "reader" && (
                <section className="reader-feedback-panel">
                    <h2>Feedback</h2>
                    <textarea
                        value={feedbackComment}
                        onChange={(event) => setFeedbackComment(event.target.value)}
                        placeholder={`Share feedback on chapter ${currentChapter}`}
                    />
                    <button type="button" onClick={submitFeedback} disabled={feedbackSending || !feedbackComment.trim()}>
                        {feedbackSending ? "Sending..." : "Send Feedback"}
                    </button>
                </section>
            )}

            <div className="books-site-footer">
                <div className="book-controls">
                    <div className="back-to-library">
                        <Link to="/library">← Back to Library</Link>
                    </div>
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
        <div className="chapter-selector">
            <Select
                options={chapters.map(chapter => ({ value: chapter.chapterNumber, label: chapter.title }))}
                onChange={(selectedOption) => onSelect(selectedOption?.value!)}
                value={chapters.find(ch => ch.chapterNumber === currentChapter) ? { value: currentChapter, label: chapters.find(chapter => chapter.chapterNumber === currentChapter)?.title } : null}
                menuPlacement="auto"
                classNamePrefix="chapter-select"
                theme={(theme) => ({
                    ...theme,
                    colors: {
                        ...theme.colors,
                        primary: 'var(--primary-text-color)',
                    }
                })}
                isSearchable={false}
            />
        </div>
    );
}

function selectionTouchesElement(selection: Selection, element: HTMLElement) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
        const range = selection.getRangeAt(index);

        if (
            element.contains(range.commonAncestorContainer)
            || element.contains(range.startContainer)
            || element.contains(range.endContainer)
            || range.intersectsNode(element)
        ) {
            return true;
        }
    }

    return false;
}

const ChapterContent = ({ isLoading, book, currentChapter }: { book: any, isLoading: boolean, currentChapter: number }) => {
    const chapterContentRef = useRef<HTMLDivElement>(null);
    const currentChapterData = book?.chapters?.find((ch: any) => ch.chapterNumber === currentChapter);

    useEffect(() => {
        const chapterContent = chapterContentRef.current;

        if (!chapterContent) {
            return;
        }

        const preventSelectionAction = (event: Event) => {
            event.preventDefault();
        };

        const preventPrimaryButtonSelection = (event: MouseEvent) => {
            if (event.button === 0) {
                event.preventDefault();
            }
        };

        const selectionIncludesChapterContent = () => {
            const selection = window.getSelection();
            return Boolean(selection && selectionTouchesElement(selection, chapterContent));
        };

        const clearChapterSelection = () => {
            if (selectionIncludesChapterContent()) {
                window.getSelection()?.removeAllRanges();
            }
        };

        const blockChapterClipboard = (event: ClipboardEvent) => {
            const target = event.target instanceof Node ? event.target : null;
            const startedInChapterContent = Boolean(target && chapterContent.contains(target));

            if (!startedInChapterContent && !selectionIncludesChapterContent()) {
                return;
            }

            event.preventDefault();
            event.clipboardData?.clearData();
        };

        chapterContent.addEventListener("dragstart", preventSelectionAction);
        chapterContent.addEventListener("mousedown", preventPrimaryButtonSelection);
        chapterContent.addEventListener("selectstart", preventSelectionAction);
        document.addEventListener("copy", blockChapterClipboard);
        document.addEventListener("cut", blockChapterClipboard);
        document.addEventListener("selectionchange", clearChapterSelection);

        return () => {
            chapterContent.removeEventListener("dragstart", preventSelectionAction);
            chapterContent.removeEventListener("mousedown", preventPrimaryButtonSelection);
            chapterContent.removeEventListener("selectstart", preventSelectionAction);
            document.removeEventListener("copy", blockChapterClipboard);
            document.removeEventListener("cut", blockChapterClipboard);
            document.removeEventListener("selectionchange", clearChapterSelection);
        };
    }, [currentChapter, currentChapterData]);

    return (
        <article className="book-viewer">
            {isLoading ? (
                <p>Loading...</p>
            ) : (
                <div>
                    <h1 style={{ textAlign: "center" }}>{currentChapterData?.title}</h1>
                    <div
                        ref={chapterContentRef}
                        className="chapter-content"
                        aria-label="Chapter content"
                    >
                        <span dangerouslySetInnerHTML={{ __html: markdownToHtml(currentChapterData?.content) }} />
                    </div>
                </div>
            )}
        </article>
    );
}
