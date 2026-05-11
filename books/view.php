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
                    <h1><?php echo htmlspecialchars($book['title']); ?></h1>
                    <p><a href="/library">← Back to Library</a></p>
                </header>

                <section class="books-layout">
                    <aside class="book-chapters">
                        <h2>Chapters</h2>
                        <ul>
                            <?php foreach ($chapters as $chapter): ?>
                                <li><a href="#<?php echo (int)$chapter['num']; ?>"><?php echo htmlspecialchars($chapter['title']); ?></a></li>
                            <?php endforeach; ?>
                        </ul>
                    </aside>
    
                    <article class="book-viewer">
                        <p>Loading chapter...</p>
                    </article>
                </section>

            <?php endif; ?>
        </main>

        <div id="footer"></div>

        <script>
            window.initialChapters = <?php echo json_encode($chapters); ?>;
        </script>
    </body>
</html>
