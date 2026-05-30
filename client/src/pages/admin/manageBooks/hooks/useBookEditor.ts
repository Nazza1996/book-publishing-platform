import { useCallback, useEffect, useState } from 'react';
import { apiFetch, toast } from '../../../../helpers';
import { slugifyTitle } from '../utils/slugify';

type ActionScope = 'all' | 'current';

function cloneBook<T>(book: T): T {
    return JSON.parse(JSON.stringify(book));
}

function buildBookActionPayload(book: any, selectedChapterIndex: number, scope: ActionScope) {
    const currentChapter = book.chapters?.[selectedChapterIndex] ?? null;

    return {
        book: cloneBook(book),
        scope,
        currentChapter: currentChapter ? cloneBook(currentChapter) : null,
        currentChapterNumber: currentChapter?.chapterNumber ?? null
    };
}

function mergeSavedBookChapter(baseBook: any, selectedBook: any, selectedChapterIndex: number) {
    const currentChapter = selectedBook.chapters?.[selectedChapterIndex];

    if (!currentChapter) {
        return cloneBook(baseBook ?? selectedBook);
    }

    if (!baseBook) {
        const nextBook = cloneBook(selectedBook);
        nextBook.chapters = [cloneBook(currentChapter)];
        return nextBook;
    }

    const mergedBook = cloneBook(baseBook);
    const mergedChapters = Array.isArray(mergedBook.chapters) ? [...mergedBook.chapters] : [];

    mergedChapters[selectedChapterIndex] = cloneBook(currentChapter);

    return {
        ...mergedBook,
        title: selectedBook.title,
        description: selectedBook.description,
        slug: selectedBook.slug,
        isFeatured: selectedBook.isFeatured,
        publishedVersionId: selectedBook.publishedVersionId,
        versionStatus: selectedBook.versionStatus,
        chapters: mergedChapters
    };
}

function upsertPublishedChapter(publishedVersion: any, chapter: any) {
    const nextVersion = cloneBook(publishedVersion ?? { chapters: [] });
    const chapters = Array.isArray(nextVersion.chapters) ? [...nextVersion.chapters] : [];
    const chapterIndex = chapters.findIndex((item: any) => item.chapterNumber === chapter.chapterNumber);

    if (chapterIndex >= 0) {
        chapters[chapterIndex] = cloneBook(chapter);
    } else {
        chapters.push(cloneBook(chapter));
    }

    nextVersion.chapters = chapters;
    return nextVersion;
}

function removePublishedChapter(publishedVersion: any, chapterNumber: number) {
    if (!publishedVersion) {
        return null;
    }

    const nextVersion = cloneBook(publishedVersion);
    const chapters = Array.isArray(nextVersion.chapters)
        ? nextVersion.chapters.filter((chapter: any) => chapter.chapterNumber !== chapterNumber)
        : [];

    if (chapters.length === 0) {
        return null;
    }

    nextVersion.chapters = chapters;
    return nextVersion;
}

const EMPTY_BOOK = {
    title: '',
    description: '',
    id: null,
    slug: null,
    isFeatured: false,
    publishedVersionId: null,
    chapters: [
        { title: 'Chapter 1', content: '', chapterNumber: 1 }
    ],
    versionStatus: 'draft', // 'draft' or 'published'
    version: null
};

function hasUnsavedChanges(book: any, lastSaved: any): boolean {
    if (!lastSaved || !book.id) return false;
    
    // Check if metadata changed
    if (book.title !== lastSaved.title || book.description !== lastSaved.description) {
        return true;
    }
    
    // Check if chapter count changed
    if (book.chapters.length !== lastSaved.chapters.length) {
        return true;
    }
    
    // Check if any chapter content changed
    for (let i = 0; i < book.chapters.length; i++) {
        const current = book.chapters[i];
        const saved = lastSaved.chapters[i];
        
        if (current.title !== saved.title || current.content !== saved.content) {
            return true;
        }
    }
    
    return false;
}

export function useBookEditor(location: any) {
    const [books, setBooks] = useState<any[]>([]);
    const [selectedBook, setSelectedBook] = useState<any>(EMPTY_BOOK);
    const [lastSavedBook, setLastSavedBook] = useState<any>(null);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);

    async function fetchBooks() {
        const response = await apiFetch('/api/books');
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
            setLastSavedBook(null);
            setSelectedChapterIndex(0);
            return;
        }

        (async () => {
            // Load draft version for editing
            const res = await apiFetch(`/api/books/${hash}?version=draft`, { toast: false });
            if (!res.ok) {
                // Try loading published version if no draft
                const pubRes = await apiFetch(`/api/books/${hash}?version=published`);
                if (!pubRes.ok) return;
                const book = await pubRes.json();
                const bookData = {
                    ...book,
                    publishedVersion: book.versionStatus === 'published' ? book.version : null,
                    chapters: book.version?.chapters || []
                };
                setSelectedBook(bookData);
                setLastSavedBook(JSON.parse(JSON.stringify(bookData))); // Deep copy
            } else {
                const book = await res.json();
                const bookData = {
                    ...book,
                    publishedVersion: book.publishedVersion ?? (book.versionStatus === 'published' ? book.version : null),
                    chapters: book.version?.chapters || []
                };
                setSelectedBook(bookData);
                setLastSavedBook(JSON.parse(JSON.stringify(bookData))); // Deep copy
            }
            setSelectedChapterIndex(0);
        })();
    }, [location.hash]);

    // ------------- Book field updates --------------
    const handleBookTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        setSelectedBook((prev: any) => ({ ...prev, title, slug: slugifyTitle(title) }));
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
    }, [selectedBook.chapters.length]);

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

        const res = await apiFetch(`/api/books/${selectedBook.id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            setBooks(prev => prev.filter(b => b.id !== selectedBook.id));
            setSelectedBook(EMPTY_BOOK);
            setLastSavedBook(null);
            setSelectedChapterIndex(0);
            window.location.hash = '';
            toast.success('Book deleted successfully');
        }
    }, [selectedBook.id]);

    const handleSaveBook = useCallback(async (scope: ActionScope = 'all') => {
        const payload = buildBookActionPayload(selectedBook, selectedChapterIndex, scope);

        const res = await apiFetch('/api/books/saveDraft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const bookIdentifier = data.slug ?? data.id;
            setLastSavedBook(
                scope === 'all'
                    ? cloneBook(selectedBook)
                    : mergeSavedBookChapter(lastSavedBook, selectedBook, selectedChapterIndex)
            );
            await fetchBooks();
            window.location.hash = `#${encodeURIComponent(bookIdentifier)}`;
            toast.success('Book saved successfully');
        }
    }, [selectedBook, lastSavedBook, selectedChapterIndex]);

    const handleConvertToDraft = useCallback(async (scope: ActionScope = 'all') => {
        const payload = buildBookActionPayload(selectedBook, selectedChapterIndex, scope);

        const res = await apiFetch('/api/books/convertToDraft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const currentChapter = selectedBook.chapters?.[selectedChapterIndex];
            const currentChapterNumber = currentChapter?.chapterNumber ?? selectedChapterIndex + 1;

            if (scope === 'current') {
                const nextPublishedVersionId = data.versionId ?? null;

                setSelectedBook((prev: any) => ({
                    ...prev,
                    publishedVersionId: nextPublishedVersionId,
                    publishedVersion: removePublishedChapter(prev.publishedVersion, currentChapterNumber),
                    isFeatured: nextPublishedVersionId ? prev.isFeatured : false
                }));

                setBooks((prev: any) =>
                    prev.map((b: any) => b.id === selectedBook.id ? { ...b, publishedVersionId: nextPublishedVersionId, isFeatured: nextPublishedVersionId ? b.isFeatured : false } : b)
                );
                toast.success('Chapter unpublished successfully');
            } else {
                const id = selectedBook.id;

                setSelectedBook((prev: any) => ({ ...prev, publishedVersionId: null, isFeatured: false }));
                setBooks((prev: any) =>
                    prev.map((b: any) => b.id === id ? { ...b, publishedVersionId: null, isFeatured: false } : b)
                );
                toast.success('Book unpublished successfully');
            }
        }
    }, [selectedBook, selectedChapterIndex]);

    const handleToggleSpotlight = useCallback(async () => {
        const id = selectedBook.id;

        const res = await apiFetch('/api/books/toggleFeatured', {
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
            toast.success('Book spotlight status updated successfully');
        }
    }, [selectedBook.id]);

    const handlePublishBook = useCallback(async (scope: ActionScope = 'all') => {
        const payload = buildBookActionPayload(selectedBook, selectedChapterIndex, scope);

        const res = await apiFetch('/api/books/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            const bookIdentifier = data.slug ?? data.id;
            const currentChapter = selectedBook.chapters?.[selectedChapterIndex];
            setLastSavedBook(
                scope === 'all'
                    ? cloneBook(selectedBook)
                    : mergeSavedBookChapter(lastSavedBook, selectedBook, selectedChapterIndex)
            );
            setSelectedBook((prev: any) => ({
                ...prev,
                publishedVersionId: data.versionId,
                publishedVersion: scope === 'current' && currentChapter
                    ? upsertPublishedChapter(prev.publishedVersion, currentChapter)
                    : prev.publishedVersion
            }));
            await fetchBooks();
            window.location.hash = `#${encodeURIComponent(bookIdentifier)}`;
            toast.success('Book published successfully');
        }
    }, [selectedBook, lastSavedBook, selectedChapterIndex]);

    const unsavedChanges = hasUnsavedChanges(selectedBook, lastSavedBook);
    const isPublished = selectedBook.publishedVersionId !== null && selectedBook.publishedVersionId !== undefined;

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
        handlePublishBook,
        
        unsavedChanges,
        isPublished
    };
}