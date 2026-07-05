import { Link } from "react-router-dom";
import { countBookWords, countReleasedChapters } from "../helpers";
import type { BookEditorState, BookStatus } from "../types";
import { BookStatusDropdown } from "./BookStatusDropdown";

export function BookWorkspaceHeader({
    book,
    isNewBook,
    hasPublicRelease,
    saving,
    savingStatus,
    togglingSpotlight,
    deletingBook,
    onSave,
    onStatusChange,
    onToggleSpotlight,
    onDeleteClick
}: {
    book: BookEditorState;
    isNewBook: boolean;
    hasPublicRelease: boolean;
    saving: boolean;
    savingStatus: boolean;
    togglingSpotlight: boolean;
    deletingBook: boolean;
    onSave: () => void;
    onStatusChange: (status: BookStatus) => void;
    onToggleSpotlight: () => void;
    onDeleteClick: () => void;
}) {
    return (
        <div id="manageBookHeader">
            <div>
                <div className="admin-breadcrumbs">
                    <Link to="/admin/all-books">Books</Link>
                    <span>/</span>
                    <span>{isNewBook ? "New Book" : book.title || "Untitled Book"}</span>
                </div>
                <h1>{isNewBook ? "New Book" : book.title || "Untitled Book"}</h1>
                <div className="title-row-meta">
                    <BookStatusDropdown status={book.status} onChange={onStatusChange} disabled={savingStatus} />
                    <span>{book.chapters.length} chapters</span>
                    <span>{countBookWords(book).toLocaleString()} words</span>
                    <span>{countReleasedChapters(book.releases, "public")} public releases</span>
                </div>
            </div>

            <div className="admin-header-actions">
                {book.slug ? (
                    <Link className="secondary-btn" to={`/book/${book.slug}?version=draft`} target="_blank" rel="noreferrer">Preview Book</Link>
                ) : (
                    <button className="secondary-btn" type="button" disabled>Preview Book</button>
                )}
                <button
                    className={book.isFeatured && hasPublicRelease ? "spotlight-btn active" : "spotlight-btn"}
                    type="button"
                    onClick={onToggleSpotlight}
                    disabled={!hasPublicRelease || togglingSpotlight}
                    title={hasPublicRelease ? "Toggle homepage spotlight" : "Release at least one public chapter before spotlighting it"}
                >
                    {book.isFeatured && hasPublicRelease ? "Spotlight On" : "Spotlight Off"}
                </button>
                {!isNewBook && (
                    <button className="danger-btn" type="button" onClick={onDeleteClick} disabled={deletingBook}>
                        {deletingBook ? "Deleting..." : "Delete Book"}
                    </button>
                )}
                <button className="primary-btn" type="button" onClick={onSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
