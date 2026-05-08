<?php
    require_once __DIR__ . '/../php/repositories/BookRepository.php';

    BookRepository::ensureStorage();

    $slug = trim((string)($_GET['slug'] ?? ''));
    $book = $slug !== '' ? BookRepository::getPublishedBook($slug) : null;

    if ($book === null) {
        http_response_code(404);
    }
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
        <script type="module" src="../js/index.js?v=1.0"></script>
    </head>

    <body>
        <div id="navbar"></div>

        <main class="books-site-page">
            <?php if ($book === null): ?>
                <header class="books-site-hero">
                    <h1>Book not found</h1>
                    <p>The book you requested does not exist or has not been published yet.</p>
                    <p><a href="/library">← Back to Library</a></p>
                </header>
            <?php else: ?>
                <header class="books-site-hero">
                    <h1><?php echo htmlspecialchars($book['title']); ?></h1>
                    <p><a href="/library">← Back to Library</a></p>
                </header>

                <article class="book-viewer">
                    <?php echo BookRepository::markdownToHtml((string)($book['content'] ?? '')); ?>
                </article>
            <?php endif; ?>
        </main>

        <div id="footer"></div>
    </body>
</html>
