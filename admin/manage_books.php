<?php
    require_once __DIR__ . '/../php/auth.php';
    require_once __DIR__ . '/../php/repositories/BookRepository.php';

    BookRepository::ensureStorage();

    $message = $_SESSION['books_flash_message'] ?? null;
    $messageType = $_SESSION['books_flash_type'] ?? 'success';
    unset($_SESSION['books_flash_message'], $_SESSION['books_flash_type']);

    $redirectToBook = static function (string $slug, string $messageText, string $type = 'success'): void {
        $_SESSION['books_flash_message'] = $messageText;
        $_SESSION['books_flash_type'] = $type;
        header('Location: /admin/manage_books?book=' . urlencode($slug));
        exit;
    };

    $selectedSlug = trim((string)($_GET['book'] ?? ''));
    $newBookRequested = isset($_GET['new']);

    $selectedBook = $newBookRequested || $selectedSlug === ''
        ? [
            'slug' => '',
            'title' => '',
            'content' => '',
            'status' => 'draft',
            'draftExists' => false,
            'publishedExists' => false,
            'featured' => false,
            'description' => '',
        ]
        : (BookRepository::getBook($selectedSlug) ?? [
            'slug' => $selectedSlug,
            'title' => BookRepository::prettyTitle($selectedSlug),
            'content' => '',
            'status' => 'draft',
            'draftExists' => false,
            'publishedExists' => false,
            'featured' => false,
            'description' => '',
        ]);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = (string)($_POST['action'] ?? '');
        $currentSlug = trim((string)($_POST['current_slug'] ?? ''));
        $title = trim((string)($_POST['book_title'] ?? ''));
        $contents = (string)($_POST['markdown_content'] ?? '');
        $description = trim((string)($_POST['book_description'] ?? ''));

        try {
            if ($action !== 'convert_to_draft' && $action !== 'toggle_featured' && $action !== 'delete_book' && $title === '') {
                throw new InvalidArgumentException('Please provide a book title.');
            }

            if ($action === 'save_book') {
                $slug = BookRepository::saveDraft($currentSlug, $title, $contents);
                if ($description !== '') {
                    BookRepository::setDescription($slug, $description);
                }
                $redirectToBook($slug, 'Draft saved successfully.');
            }

            if ($action === 'publish_book') {
                $slug = BookRepository::publishBook($currentSlug, $title, $contents);
                if ($description !== '') {
                    BookRepository::setDescription($slug, $description);
                }
                $redirectToBook($slug, 'Book published successfully.');
            }

            if ($action === 'convert_to_draft') {
                if ($currentSlug === '') {
                    throw new InvalidArgumentException('Please select a published book to convert.');
                }

                $slug = BookRepository::convertToDraft($currentSlug);
                $redirectToBook($slug, 'Book converted to draft.');
            }

            if ($action === 'delete_book') {
                if ($currentSlug === '') {
                    throw new InvalidArgumentException('Please select a book to delete.');
                }

                BookRepository::deleteBook($currentSlug);
                header('Location: /admin/manage_books');
                exit;
            }

            if ($action === 'toggle_featured') {
                if ($currentSlug === '') {
                    throw new InvalidArgumentException('Please select a book to toggle featured status.');
                }

                // Check if trying to add to featured and already at limit
                $isCurrentlyFeatured = $selectedBook['featured'] ?? false;
                $featuredCount = BookRepository::countFeaturedBooks();

                if (!$isCurrentlyFeatured && $featuredCount >= 3) {
                    throw new InvalidArgumentException('You can only feature up to 3 books. Remove one first to add another.');
                }

                BookRepository::toggleFeatured($currentSlug);
                $redirectToBook($currentSlug, 'Featured status updated.');
            }
        } catch (Throwable $e) {
            $message = $e instanceof InvalidArgumentException ? $e->getMessage() : 'Unable to save the book.';
            $messageType = 'error';
            $selectedSlug = $currentSlug;
            $newBookRequested = $selectedSlug === '';
        }
    }

    $books = BookRepository::listBooks();

    if ($selectedSlug === '' && !$newBookRequested && !empty($books)) {
        $selectedSlug = $books[0]['slug'];
    }

    $slugPreview = BookRepository::normalizeSlug($selectedBook['title'] !== '' ? $selectedBook['title'] : 'untitled-book');
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Manage Books - Admin</title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="stylesheet" href="/styles/admin-manage-books.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
        <script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
        <script type="module" src="/js/index.js"></script>
        <script defer src="/admin/manage_books.js"></script>
    </head>

    <body>
        <div id="navbar"></div>

        <main class="manage-books-page">
            <section class="manage-books-hero">
                <div>
                    <h1>Manage Books</h1>
                </div>

                <div class="manage-books-actions">
                    <a class="toolbar-button secondary" href="/admin/manage_books?new=1">New Book</a>
                    <a class="toolbar-button secondary" href="/admin">Dashboard</a>
                </div>
            </section>

            <?php if ($message): ?>
                <p class="message <?php echo htmlspecialchars($messageType); ?>"><?php echo htmlspecialchars($message); ?></p>
            <?php endif; ?>

            <section class="books-layout">
                <aside class="books-sidebar">
                    <div class="sidebar-head">
                        <h2>Book Library</h2>
                        <p><?php echo count($books); ?> total</p>
                    </div>

                    <?php if (empty($books)): ?>
                        <div class="empty-state">No books yet. Create your first one with the button above.</div>
                    <?php else: ?>
                        <div class="book-list" aria-label="Books">
                            <?php foreach ($books as $book): ?>
                                <a class="book-list-item <?php echo $book['slug'] === $selectedBook['slug'] ? 'is-active' : ''; ?>" href="/admin/manage_books?book=<?php echo urlencode($book['slug']); ?>">
                                    <span class="book-list-title"><?php echo htmlspecialchars($book['title']); ?></span>
                                    <span class="book-list-meta">
                                        <span class="status-pill status-<?php echo htmlspecialchars($book['status']); ?>"><?php echo htmlspecialchars(ucfirst($book['status'])); ?></span>
                                        <?php if ($book['featured']): ?>
                                            <span class="status-pill status-featured">Spotlight</span>
                                        <?php endif; ?>
                                        <span><?php echo htmlspecialchars($book['slug']); ?></span>
                                    </span>
                                </a>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </aside>

                <section class="books-editor-panel">
                    <form method="post" id="bookForm" class="books-editor-card">
                        <input type="hidden" name="current_slug" id="currentSlug" value="<?php echo htmlspecialchars($selectedBook['slug']); ?>">

                        <div class="editor-topbar">
                            <div>
                                <p class="eyebrow">Editor</p>
                                <h2><?php echo $selectedBook['slug'] !== '' ? 'Editing ' . htmlspecialchars($selectedBook['slug']) : 'New Book'; ?></h2>
                            </div>

                            <div class="editor-topbar-meta">
                                <span class="status-pill status-<?php echo htmlspecialchars($selectedBook['status']); ?>"><?php echo htmlspecialchars(ucfirst($selectedBook['status'])); ?></span>
                                <a class="view-book-link <?php echo $selectedBook['publishedExists'] ? '' : 'is-disabled'; ?>" href="<?php echo $selectedBook['publishedExists'] ? '/books/view.php?slug=' . urlencode($selectedBook['slug']) : '#'; ?>" <?php echo $selectedBook['publishedExists'] ? '' : 'aria-disabled="true" tabindex="-1"'; ?>>View Published</a>
                            </div>
                        </div>

                        <div class="editor-grid">
                            <label class="field">
                                <span>Book Title</span>
                                <input type="text" name="book_title" id="bookTitle" value="<?php echo htmlspecialchars($selectedBook['title']); ?>" placeholder="Enter a title" required>
                            </label>

                            <div class="field">
                                <span>File Slug</span>
                                <div class="slug-preview" id="slugPreview"><?php echo htmlspecialchars($slugPreview); ?></div>
                            </div>
                        </div>

                        <div class="editor-grid">
                            <label class="field">
                                <span>Book Description</span>
                                <input type="text" name="book_description" id="bookDescription" value="<?php echo htmlspecialchars($selectedBook['description']); ?>" placeholder="Enter a description" required>
                            </label>
                        </div>

                        <div class="upload-row">
                            <label class="upload-button" for="markdownUpload">Upload Markdown File</label>
                            <input type="file" id="markdownUpload" accept=".md,.markdown,text/markdown">
                            <p class="upload-hint">Choose a markdown file to load its contents into the editor.</p>
                        </div>

                        <label class="field editor-field">
                            <span>Markdown Content</span>
                            <textarea name="markdown_content" id="markdownContent" rows="22" placeholder="Write your book here..."><?php echo htmlspecialchars($selectedBook['content']); ?></textarea>
                        </label>

                        <div class="editor-actions">
                            <?php 
                                $isCurrentlyFeatured = $selectedBook['featured'] ?? false;
                                $featuredCount = BookRepository::countFeaturedBooks();
                                $canToggle = $isCurrentlyFeatured || $featuredCount < 3;
                                $isDraft = $selectedBook['status'] === 'draft';
                                $isExisting = $selectedBook['slug'] !== '';
                            ?>

                            <?php if ($isExisting): ?>
                                <button
                                    type="button"
                                    id="openDeleteBookModal"
                                    class="toolbar-button secondary"
                                    data-book-slug="<?php echo htmlspecialchars($selectedBook['slug']); ?>"
                                    data-book-title="<?php echo htmlspecialchars($selectedBook['title']); ?>"
                                    >Delete Book</button>
                            <?php endif; ?>

                            <button type="submit" name="action" value="save_book" class="toolbar-button secondary">Save Draft</button>
                            <?php if (!$isDraft): ?>
                                <button type="submit" name="action" value="convert_to_draft" class="toolbar-button secondary">Convert to Draft</button>
                                <button type="submit" name="action" value="toggle_featured" class="toolbar-button secondary featured-toggle <?php echo $selectedBook['featured'] ? 'is-featured' : ''; ?>" <?php echo $canToggle ? '' : 'disabled title="Spotlight limit reached (3/3). Remove a featured book first."'; ?>>
                                    <?php echo $selectedBook['featured'] ? '★ Remove from Spotlight' : '☆ Add to Spotlight'; ?>
                                </button>
                                <?php if ($featuredCount >= 3 && !$isCurrentlyFeatured): ?>
                                    <p class="featured-limit-message">Spotlight is full</p>
                                <?php endif; ?>
                            <?php endif; ?>
                            <button type="submit" name="action" value="publish_book" class="toolbar-button primary"><?php echo $selectedBook['publishedExists'] ? 'Republish Book' : 'Publish Book'; ?></button>
                        </div>
                    </form>
                </section>
            </section>
        </main>

        <div class="modal-backdrop" id="deleteBookModal" aria-hidden="true">
            <div class="edit-modal" role="dialog" aria-modal="true" aria-labelledby="deleteBookTitle">
                <h2 id="deleteBookTitle">Delete Book</h2>
                <div class="modal-content">
                    <p class="modal-meta" id="deleteBookMessage">Are you sure you want to delete this book?</p>
                    <p class="modal-meta">This action cannot be undone.</p>
                </div>

                <form method="post" id="deleteBookForm">
                    <input type="hidden" name="action" value="delete_book">
                    <input type="hidden" name="current_slug" id="deleteBookSlug" value="<?php echo htmlspecialchars($selectedBook['slug']); ?>">

                    <div class="modal-actions">
                        <button type="button" class="modal-button secondary" id="closeDeleteBookModal">Cancel</button>
                        <button type="submit" class="modal-button primary">Delete Book</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="footer"></div>
    </body>
</html>
