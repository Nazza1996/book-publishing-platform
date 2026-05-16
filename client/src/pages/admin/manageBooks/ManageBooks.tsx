import { useState } from 'react';
import '../../../styles/admin-manage-books.css';
import { useLocation } from 'react-router-dom';
import BookSidebar from './components/BookSidebar';
import BookDetails from './components/BookDetails';
import EditorPane from './components/EditorPane';
import { useBookEditor } from './hooks/useBookEditor';
import { setPageTitle } from '../../../helpers';


interface Chapter {
    title: string;
    content: string;
    chapterNumber: number;
}

interface ChapterEditingState {
    index: number;
    title: string;
}

export default function ManageBooks() {    
    const [editingChapter, setEditingChapter] = useState<ChapterEditingState | null>(null);

    const location = useLocation();
    const editor = useBookEditor(location);

    const { selectedBook, selectedChapterIndex } = editor;
    const { setSelectedBook, setSelectedChapterIndex, handleNewChapter, handleDeleteChapter } = editor;

    setPageTitle("Manage Books");

    const handleSelectChapter = (index: number) => {
        setSelectedChapterIndex(index);
    }

    const startEditingChapterTitle = (index: number) => {
        setEditingChapter({ index, title: selectedBook.chapters[index].title });
    }

    const saveChapterTitle = () => {
        if (!editingChapter) return;
        const updatedChapters = [...selectedBook.chapters];
        updatedChapters[editingChapter.index!].title = editingChapter.title;
        setSelectedBook({ ...selectedBook, chapters: updatedChapters });
        setEditingChapter(null);
    }

    const cancelEditingChapter = () => setEditingChapter(null);

    const ChapterItem = ({ chapter, index }: { chapter: Chapter, index: number }) => {
        const isEditing = editingChapter?.index === index;

        return (
            <li className={`chapter-item ${selectedChapterIndex === index ? 'is-active' : ''}`} onClick={() => { handleSelectChapter(index) }}>
                <div className='chapter-item-content'>
                    <div className='chapter-number'>Chapter {index + 1}</div>
                    {isEditing ? (
                        <input
                            type="text"
                            className='chapter-title-input'
                            value={editingChapter!.title}
                            onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveChapterTitle();
                                if (e.key === 'Escape') cancelEditingChapter();
                            }}
                            autoFocus
                        />
                    ) : (
                        <div className='chapter-title-text'>{chapter.title}</div>
                    )}
                </div>
                <div className='chapter-item-actions'>
                    {isEditing ? (
                        <>
                            <button type='button' className='chapter-btn save' onClick={saveChapterTitle}>Save</button>
                            <button type='button' className='chapter-btn cancel' onClick={cancelEditingChapter}>Cancel</button>
                        </>
                    ) : (
                        <>
                            <button type='button' className='chapter-btn edit' onClick={() => startEditingChapterTitle(index)}>Edit</button>
                            <button type='button' className='chapter-btn delete' onClick={() => handleDeleteChapter(index)} disabled={selectedBook.chapters.length === 1}>
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </li>
        )
    }

    return (
        <main className="manage-books-page">
            <section className="manage-books-hero">
                <div>
                    <h1>Manage Books</h1>
                </div>

                <div className="manage-books-actions">
                    <a className="toolbar-button secondary" href="#">
                        New Book
                    </a>
                    <a className="toolbar-button secondary" href="/admin">Dashboard</a>
                </div>
            </section>

            <section className="books-layout">
                <BookSidebar {...editor} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <BookDetails {...editor} />

                    <section className="books-editor-card">
                        <div className="editor-topbar">
                            <div>
                                <p className="eyebrow">Chapters</p>
                                <h2 id="chaptersTitle">Chapters</h2>
                            </div>

                            <button type="button" id="addChapterButton" className="toolbar-button secondary" onClick={handleNewChapter}>
                                + New Chapter
                            </button>
                        </div>

                        <div className="chapters-list" id="chaptersList">
                            {selectedBook.chapters && selectedBook.chapters.length > 0 ? (
                                <ul className='chapters-list'>
                                    {selectedBook.chapters.map((chapter: any, index: number) => (
                                        <ChapterItem key={index} chapter={chapter} index={index} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="empty-state">No chapters yet. Click the button above to create one.</p>
                            )}
                        </div>
                    </section>
                    
                    <EditorPane {...editor} />

                </div>
            </section>

        </main>
    )
}