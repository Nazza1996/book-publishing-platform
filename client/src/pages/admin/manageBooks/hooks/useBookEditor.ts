import { useCallback, useEffect, useState } from 'react';

const EMPTY_BOOK = {
    title: '',
    description: '',
    status: 'draft',
    isFeatured: false,
    chapters: [
        { title: 'Chapter 1', content: '', chapterNumber: 1 }
    ],
    publishedExists: false,
    draftExists: false
};


export function useBookEditor(location: any) {
    const [books, setBooks] = useState<any[]>([]);
    const [selectedBook, setSelectedBook] = useState<any>(EMPTY_BOOK);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);

    async function fetchBooks() {
        const response = await fetch('/api/books');
        const data = await response.json();
        setBooks(data);
    }

    // Fetch books
    useEffect(() => {
        fetchBooks();
    }, []);

    // Load book from URL hash
    useEffect(() => {
        const hash = decodeURIComponent(location.hash.substring(1));
        if (!hash) {
            setSelectedBook(EMPTY_BOOK);
            setSelectedChapterIndex(0);
            return;
        }

        (async () => {
            const res = await fetch(`/api/books/${hash}`);
            if (!res.ok) return;

            const book = await res.json();
            setSelectedBook(book);
            setSelectedChapterIndex(0);
        })();
    }, [location.hash]);

    // ------------- Book field updates --------------
    const handleBookTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        setSelectedBook((prev: any) => ({ ...prev, title }));
    }, []);

    const handleBookDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const description = e.target.value;
        setSelectedBook((prev: any) => ({ ...prev, description }));
    }, []);

    // ------------- Book actions --------------

    const handleNewChapter = useCallback(() => {
        setSelectedBook((prev: any) => {
            const nextIndex = prev.chapters.length;

            return {
                ...prev,
                chapters: [
                    ...prev.chapters,
                    {
                        title: `Chapter ${nextIndex + 1}`,
                        content: '',
                        chapterNumber: nextIndex + 1
                    }
                ]
            };
        });

        const nextIndex = selectedBook.chapters.length;
        setSelectedChapterIndex(nextIndex);
    }, []);

    const handleDeleteChapter = useCallback((index: number) => {
        setSelectedBook((prev: any) => {
            const updated = prev.chapters.filter((_: any, i: number) => i !== index);

            const chapters =
                updated.length > 0
                    ? updated.map((c: any, i: number) => ({
                          ...c,
                          title: `Chapter ${i + 1}`,
                          chapterNumber: i + 1
                      }))
                    : [{ title: 'Chapter 1', content: '', chapterNumber: 1 }];

            setSelectedChapterIndex(prevIndex => {
                const newLength = updated.length;
                return Math.min(prevIndex, newLength - 1);
            });

            return { ...prev, chapters };
        });
    }, []);

    // ------------- API actions --------------
    const handleDeleteBook = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
            return;
        }

        const res = await fetch(`/api/books/${selectedBook.id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
            setSelectedBook(EMPTY_BOOK);
            setSelectedChapterIndex(0);
            window.location.hash = '';
        }
    }, [selectedBook.id]);

    const handleSaveBook = useCallback(async () => {
        const res = await fetch('/api/books/saveDraft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book: selectedBook })
        });

        if (res.ok) {
            const data = await res.json();
            const bookId = data.id;
            await fetchBooks();
            window.location.hash = `#${encodeURIComponent(bookId)}`;
        }
    }, [selectedBook]);

    const handleConvertToDraft = useCallback(async () => {
        const id = selectedBook.id;

        const res = await fetch('/api/books/convertToDraft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            setSelectedBook((prev: any) => ({ ...prev, status: 'draft', isFeatured: false }));
            setBooks((prev: any) =>
                prev.map((b: any) => b.id === id ? { ...b, status: 'draft', isFeatured: false } : b)
            );
        }
    }, [selectedBook.id]);

    const handleToggleSpotlight = useCallback(async () => {
        const id = selectedBook.id;

        const res = await fetch('/api/books/toggleFeatured', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            setSelectedBook((prev: any) => ({
                ...prev,
                isFeatured: !prev.isFeatured
            }));

            setBooks((prev: any) =>
                prev.map((b: any) => b.id === id ? { ...b, isFeatured: !b.isFeatured } : b)
            );
        }
    }, [selectedBook.id]);

    const handlePublishBook = useCallback(async () => {
        const res = await fetch('/api/books/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book: selectedBook })
        });

        if (res.ok) {
            const data = await res.json();
            const bookId = data.id;
            await fetchBooks();
            window.location.hash = `#${encodeURIComponent(bookId)}`;
        }
    }, [selectedBook]);

    return {
        books,
        setBooks,

        selectedBook,
        setSelectedBook,

        selectedChapterIndex,
        setSelectedChapterIndex,

        handleBookTitleChange,
        handleBookDescriptionChange,

        handleNewChapter,
        handleDeleteChapter,

        handleDeleteBook,
        handleSaveBook,
        handleConvertToDraft,
        handleToggleSpotlight,
        handlePublishBook
    };
}