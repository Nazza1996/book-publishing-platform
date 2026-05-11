<?php
    require_once __DIR__ . '/php/repositories/BookRepository.php';

    BookRepository::ensureStorage();
    $featuredBooks = BookRepository::getFeaturedBooks();
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>NateThePlot</title>
        <link rel="stylesheet" href="./styles/index.css?v=1.0">
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

        <section class="hero-section">
            <div class="bio-container">
                <div class="bio-content">
                    <h1 class="name">Hi,<br>I am<br>NateThePlot</h1>
                    <h3>I'm Nate — NateThePlot across all Socials. The plot in question has not yet been located.</h3>
                    <h3>I love writing in many different genres of story; typically Sci-fi and Fantasy. I go where the story takes me, no real plan in sight.</h3>
                    <h3>I have dozens of ongoing projects scattered across many docs. Short stories, novellas, and one or two novels lurking in the shadows.</h3>
                    <h3>If any of that sounds like your kind of chaos, you're in the right place.</h3>
                </div>
                <img src="/images/Pfp.jpg" alt="Profile Picture" class="profile-pic">
            </div>
        </section>

            <section id="stories">
                <h2>Featured Stories</h2>
                <p>Step into the worlds I build, one chapter at a time. A collection of sci-fi and fantasy shorts for the curious traveller.</p>
                <ul class="story-list">
                    <?php foreach ($featuredBooks as $book): ?>
                        <li>
                            <?php if ($book['is_placeholder'] ?? false): ?>
                                <div>
                                    <span class="story-title"><?php echo htmlspecialchars($book['title']); ?></span>
                                    <p class="story-description">Check back soon for more stories!</p>
                                    <span class="read-story">Coming Soon</span>
                                </div>
                            <?php else: ?>
                                <a href="/books/view.php?slug=<?php echo urlencode($book['slug']); ?>">
                                    <span class="story-title"><?php echo htmlspecialchars($book['title']); ?></span>
                                    <p class="story-description">
                                        <?php
                                            $description = (string)($book['description'] ?? '');
                                            $excerpt = strip_tags(BookRepository::markdownToHtml($description));
                                            $excerpt = substr($excerpt, 0, 150);
                                            echo htmlspecialchars($excerpt) . (strlen(strip_tags(BookRepository::markdownToHtml($description))) > 150 ? '...' : '');
                                        ?>
                                    </p>
                                    <span class="read-story">Read Story</span>
                                </a>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </section>

        <section id="stories" style="justify-items: center;text-align: center;display: grid;">
            <h2>All Stories</h2>
            <p>Explore the complete collection of my published works or start reading from the featured selection above.</p>
            <a href="/library" class="library-link">Browse Full Library</a>
        </section>

        <div id="footer"></div>
    </body>

</html>
