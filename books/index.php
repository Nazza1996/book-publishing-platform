<?php
    require_once __DIR__ . '/../php/repositories/BookRepository.php';

    BookRepository::ensureStorage();
    $books = BookRepository::getPublishedBooks();
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Books</title>
        <link rel="stylesheet" href="/styles/index.css">
        <link rel="stylesheet" href="/styles/books.css">
    </head>

    <body>
        <main class="books-site-page">
            <header class="books-site-hero">
                <p class="eyebrow">Published Books</p>
                <h1>Books on the site</h1>
                <p>Browse the books that have been published from the admin markdown editor.</p>
            </header>

            <?php if (empty($books)): ?>
                <p class="empty-state">No books have been published yet.</p>
            <?php else: ?>
                <section class="books-grid">
                    <?php foreach ($books as $book): ?>
                        <a class="book-card" href="/books/view.php?slug=<?php echo urlencode($book['slug']); ?>">
                            <span class="status-pill status-published">Published</span>
                            <h2><?php echo htmlspecialchars($book['title']); ?></h2>
                            <p><?php echo htmlspecialchars($book['slug']); ?></p>
                        </a>
                    <?php endforeach; ?>
                </section>
            <?php endif; ?>
        </main>
    </body>
</html>
