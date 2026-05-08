<?php
    require_once __DIR__ . '/php/repositories/BookRepository.php';

    BookRepository::ensureStorage();
    $books = BookRepository::getPublishedBooks();
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Story Library - NateThePlot</title>
        <link rel="stylesheet" href="./styles/index.css?v=1.0">
        <link rel="stylesheet" href="./styles/library.css?v=1.0">
        <link rel="icon" href="./favicon.ico" type="image/x-icon">
        <script type="module" src="./js/index.js?v=1.0"></script>
    </head>

    <style>
        @font-face {
            font-family: 'Recoleta';
            src: url('/fonts/Recoleta.otf') format('opentype');
            font-display: swap;
        }

        @font-face {
            font-family: 'Instrumental-Sans';
            src: url('/fonts/InstrumentalSans.ttf') format('woff2');
            font-display: swap;
        }
    </style>

    <body>
        <div id="navbar"></div>

        <section class="library-hero">
            <div>
                <h1>Story Library</h1>
                <p>A complete collection of my published stories, ranging from short tales to longer narratives. Find your next favorite story here.</p>
            </div>
        </section>

        <main class="library-container">
            <?php if (empty($books)): ?>
                <div class="empty-state">
                    <p>No published stories yet. Check back soon!</p>
                </div>
            <?php else: ?>
                <div class="books-grid">
                    <?php foreach ($books as $book): ?>
                        <article class="book-card">
                            <div class="book-card-content">
                                <h3 class="book-card-title"><?php echo htmlspecialchars($book['title']); ?></h3>
                                <p class="book-card-excerpt">
                                    <?php
                                        $content = (string)($book['content'] ?? '');
                                        $excerpt = substr(strip_tags(BookRepository::markdownToHtml($content)), 0, 150);
                                        echo htmlspecialchars($excerpt) . '...';
                                    ?>
                                </p>
                            </div>
                            <a href="/books/view.php?slug=<?php echo urlencode($book['slug']); ?>" class="book-card-link">Read Story</a>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </main>

        <div id="footer"></div>
    </body>
</html>
