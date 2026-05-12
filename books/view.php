<?php
    require_once __DIR__ . '/../php/repositories/BookRepository.php';

    BookRepository::ensureStorage();

    $slug = trim((string)($_GET['slug'] ?? ''));
    $book = $slug !== '' ? BookRepository::getPublishedBook($slug) : null;

    if ($book === null) {
        http_response_code(404);
    }

    $chapters = $book !== null ? BookRepository::listChapters($slug, true) : [];
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title><?php echo $book ? htmlspecialchars($book['title']) : 'Book Not Found'; ?></title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="stylesheet" href="/styles/books.css">
        <link rel="stylesheet" href="/styles/book-view.css">
        <link rel="stylesheet" href="/styles/custom-select.css">
        <link rel="stylesheet" href="/styles/admin-manage-books.css">
        <script type="module" src="../js/index.js?v=1.0"></script>
        <script type="module" src="/books/book_viewer.js"></script>
    </head>

    <body>
        <div id="navbar"></div>

        <main class="books-site-page">
            <?php if ($book === null): ?>
                <header class="books-site-hero book-not-found">
                    <h1>Book not found</h1>
                    <p>The book you requested does not exist or has not been published yet.</p>
                    <p><a href="/library">← Back to Library</a></p>
                </header>
            <?php else: ?>
                <header class="books-site-hero">
                    <div>
                        <h1><?php echo htmlspecialchars($book['title']); ?></h1>
                    </div>
                    <div class="book-controls">
                        <p><a href="/library">← Back to Library</a></p>
                        <div class="custom-select-wrapper" id="chapter-selector-wrapper">
                            <button class="custom-select-button" id="chapter-selector-button">
                                <span id="chapter-selector-display">Select Chapter</span>
                                <svg class="custom-select-arrow" viewBox="0 0 12 8" width="12" height="8">
                                    <path fill="currentColor" d="M1 1l5 5 5-5"/>
                                </svg>
                            </button>
                            <ul class="custom-select-menu" id="chapter-selector-menu">
                                <?php foreach ($chapters as $chapter): ?>
                                    <li class="custom-select-option" data-value="<?php echo (int)$chapter['num']; ?>">
                                        <?php echo htmlspecialchars($chapter['title']); ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </header>
                
                <article class="book-viewer">
                    <p>Loading chapter...</p>
                </article>

                <div class="books-site-footer">
                    <div class="book-controls">
                        <p><a href="/library">← Back to Library</a></p>
                        <div class="custom-select-wrapper" id="chapter-selector-bottom-wrapper">
                            <button class="custom-select-button" id="chapter-selector-bottom-button">
                                <span id="chapter-selector-bottom-display">Select Chapter</span>
                                <svg class="custom-select-arrow" viewBox="0 0 12 8" width="12" height="8">
                                    <path fill="currentColor" d="M1 1l5 5 5-5"/>
                                </svg>
                            </button>
                            <ul class="custom-select-menu" id="chapter-selector-bottom-menu">
                                <?php foreach ($chapters as $chapter): ?>
                                    <li class="custom-select-option" data-value="<?php echo (int)$chapter['num']; ?>">
                                        <?php echo htmlspecialchars($chapter['title']); ?>
                                    </li>
                                <?php endforeach; ?>
                            </ul>
                        </div>
                    </div>
                </div>

            <?php endif; ?>
        </main>

        <div id="footer"></div>

        <script>
            window.initialChapters = <?php echo json_encode($chapters); ?>;
        </script>
    </body>
</html>
