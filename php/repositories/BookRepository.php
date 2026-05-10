<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/Book.php';

class BookRepository {
    private static function baseDir(): string {
        return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'content' . DIRECTORY_SEPARATOR . 'books';
    }

    private static function draftsDir(): string {
        return self::baseDir() . DIRECTORY_SEPARATOR . 'drafts';
    }

    private static function publishedDir(): string {
        return self::baseDir() . DIRECTORY_SEPARATOR . 'published';
    }

    public static function ensureStorage(): void {
        foreach ([self::baseDir(), self::draftsDir(), self::publishedDir()] as $directory) {
            if (!is_dir($directory)) {
                mkdir($directory, 0775, true);
            }
        }
    }

    public static function normalizeSlug(string $value): string {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug !== '' ? $slug : 'untitled-book';
    }

    public static function prettyTitle(string $slug): string {
        $title = str_replace(['-', '_'], ' ', $slug);
        $title = trim(preg_replace('/\s+/', ' ', $title) ?? $slug);

        return $title !== '' ? ucwords($title) : 'Untitled Book';
    }

    private static function draftPath(string $slug): string {
        return self::draftsDir() . DIRECTORY_SEPARATOR . $slug . '.md';
    }

    private static function publishedPath(string $slug): string {
        return self::publishedDir() . DIRECTORY_SEPARATOR . $slug . '.md';
    }

    private static function metadataPath(): string {
        return self::baseDir() . DIRECTORY_SEPARATOR . 'metadata.json';
    }

    private static function loadMetadata(): array {
        $path = self::metadataPath();
        if (!is_file($path)) {
            return [];
        }

        $json = file_get_contents($path);
        if ($json === false) {
            return [];
        }

        $data = json_decode($json, true);
        return is_array($data) ? $data : [];
    }

    private static function saveMetadata(Book $book): void {
        $metadata = self::loadMetadata();

        $bookData = get_object_vars($book);
        unset($bookData['content']);
        $metadata[$book->slug] = $bookData;

        file_put_contents(self::metadataPath(), json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private static function deleteMetadata(string $slug): void {
        $metadata = self::loadMetadata();

        unset($metadata[$slug]);
        file_put_contents(self::metadataPath(), json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private static function readFile(string $path): ?string {
        if (!is_file($path)) {
            return null;
        }

        $contents = file_get_contents($path);

        return $contents === false ? null : $contents;
    }

    private static function writeFile(string $path, string $contents): void {
        file_put_contents($path, rtrim($contents) . PHP_EOL);
    }

    private static function moveIfExists(string $from, string $to): void {
        if (is_file($from)) {
            rename($from, $to);
        }
    }

    public static function listBooks(): array {
        self::ensureStorage();

        $books = [];
        $metadata = self::loadMetadata();

        foreach ([
            'draft' => self::draftsDir(),
            'published' => self::publishedDir(),
        ] as $status => $directory) {
            foreach (glob($directory . DIRECTORY_SEPARATOR . '*.md') ?: [] as $path) {
                $slug = basename($path, '.md');
                $contents = self::readFile($path) ?? '';

                if (!isset($books[$slug])) {
                    $books[$slug] = new Book(
                        $slug,
                        $metadata[$slug]['title'] ?? '',
                        $contents,
                        $status,
                        false,
                        false,
                        (bool)($metadata[$slug]['featured'] ?? false),
                        (string)($metadata[$slug]['description'] ?? '')
                    );
                }

                $books[$slug]->content = $contents;
                $books[$slug]->title = $metadata[$slug]['title'] ?? '';

                if ($status === 'draft') {
                    $books[$slug]->draftExists = true;
                }

                if ($status === 'published') {
                    $books[$slug]->publishedExists = true;
                    $books[$slug]->status = 'published';
                }
            }
        }

        usort($books, static function (Book $left, Book $right): int {
            return strcasecmp($left->title, $right->title);
        });

        return $books;
    }

    public static function getBook(string $slug): ?Book {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        $draft = self::readFile(self::draftPath($slug));
        $published = self::readFile(self::publishedPath($slug));

        $contents = $draft ?? $published;

        if ($contents === null) {
            return null;
        }

        $metadata = self::loadMetadata();

        return new Book(
            $slug,
            $metadata[$slug]['title'],
            $contents,
            $published !== null ? 'published' : 'draft',
            $draft !== null,
            $published !== null,
            (bool)($metadata[$slug]['featured'] ?? false),
            (string)($metadata[$slug]['description'] ?? '')
        );
    }

    public static function saveDraft(string $existingSlug, Book $book): string {
        self::ensureStorage();

        $newSlug = self::normalizeSlug($book->title);
        $existingSlug = self::normalizeSlug($existingSlug);

        if ($existingSlug !== '' && $existingSlug !== $newSlug) {
            self::moveIfExists(self::draftPath($existingSlug), self::draftPath($newSlug));
            self::moveIfExists(self::publishedPath($existingSlug), self::publishedPath($newSlug));
        }

        self::writeFile(self::draftPath($newSlug), $book->content);

        // persist metadata (whole book minus contents)
        $book->slug = $newSlug;
        self::saveMetadata($book);

        // remove old metadata key when renaming
        if ($existingSlug !== '' && $existingSlug !== $newSlug) {
            self::deleteMetadata($existingSlug);
        }

        return $newSlug;
    }

    public static function publishBook(string $existingSlug, Book $book): string {
        $slug = self::saveDraft($existingSlug, $book);
        copy(self::draftPath($slug), self::publishedPath($slug));

        // ensure metadata saved for published state as well
        $book->slug = $slug;
        $book->status = 'published';
        self::saveMetadata($book);

        if ($existingSlug !== '' && $existingSlug !== $slug) {
            self::deleteMetadata($existingSlug);
        }

        return $slug;
    }

    public static function convertToDraft(string $slug): string {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        $publishedContents = self::readFile(self::publishedPath($slug));

        if ($publishedContents === null) {
            throw new InvalidArgumentException('This book is not published yet.');
        }

        self::toggleFeatured($slug, false);
        self::writeFile(self::draftPath($slug), $publishedContents);
        @unlink(self::publishedPath($slug));

        return $slug;
    }

    public static function toggleFeatured(string $slug, bool $featured = null): array {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        $book = self::getBook($slug);
        if ($book === null) {
            throw new InvalidArgumentException('Book not found.');
        }

        if (!$book->publishedExists) {
            throw new InvalidArgumentException('Only published books can be featured.');
        }

        $book->featured = $featured ?? !$book->featured;

        self::saveMetadata($book);

        self::ensureStorage();

        $published = self::getPublishedBooks();
        $metadata = self::loadMetadata();

        $featured = array_filter($published, static function (Book $book) use ($metadata): bool {
            return $metadata[$book->slug]['featured'] ?? false;
        });

        $featured = array_values($featured);

        // Ensure exactly 3 items (fill with placeholders if needed)
        while (count($featured) < 3) {
            $featured[] = Book::placeholder();
        }

        return array_slice($featured, 0, 3);
    }

    public static function countFeaturedBooks(): int {
        self::ensureStorage();
        $published = self::getPublishedBooks();
        $metadata = self::loadMetadata();

        $featured = array_filter($published, static function (Book $book) use ($metadata): bool {
            return $metadata[$book->slug]['featured'] ?? false;
        });

        return count($featured);
    }

    public static function getPublishedBooks(): array {
        $published = array_filter(self::listBooks(), static function (Book $book): bool {
            return $book->publishedExists;
        });

        $result = [];
        foreach ($published as $book) {
            $bookData = self::getPublishedBook($book->slug);
            if ($bookData !== null) {
                $result[] = $bookData;
            }
        }

        return array_values($result);
    }

    public static function getFeaturedBooks(): array {
        self::ensureStorage();

        $published = self::getPublishedBooks();
        $metadata = self::loadMetadata();

        $featured = array_filter($published, static function (Book $book) use ($metadata): bool {
            return $metadata[$book->slug]['featured'] ?? false;
        });

        $featured = array_values($featured);

        // Ensure exactly 3 items (fill with placeholders if needed)
        while (count($featured) < 3) {
            $featured[] = Book::placeholder();
        }

        return array_slice($featured, 0, 3);
    }

    public static function getPublishedBook(string $slug): ?Book {
        $slug = self::normalizeSlug($slug);
        $contents = self::readFile(self::publishedPath($slug));

        if ($contents === null) {
            return null;
        }

        $metadata = self::loadMetadata();

        return new Book(
            $slug,
            $metadata[$slug]['title'] ?? '',
            $contents,
            'published',
            false,
            true,
            (bool)($metadata[$slug]['featured'] ?? false),
            (string)($metadata[$slug]['description'] ?? '')
        );
    }

    public static function markdownToHtml(string $markdown): string {
        $markdown = self::normalizeFormattingMarkup($markdown);
        $markdown = str_replace(["\r\n", "\r"], "\n", $markdown);
        $lines = explode("\n", $markdown);
        return self::renderMarkdownLines($lines);
    }

    private static function normalizeFormattingMarkup(string $markdown): string {
        $replacements = [
            '/<div\s+class=("|\')text-center\1\s*>/i' => ":::center",
            '/<div\s+class=("|\')text-right\1\s*>/i' => ":::right",
            '/<div\s+class=("|\')text-left\1\s*>/i' => ":::left",
            '/<\/div>/i' => ":::",
        ];

        return preg_replace(array_keys($replacements), array_values($replacements), $markdown) ?? $markdown;
    }

    private static function renderMarkdownLines(array $lines): string {
        $html = [];
        $paragraph = [];
        $inList = false;
        $inCode = false;
        $codeLines = [];
        $inAlignBlock = false;
        $alignClass = '';
        $alignLines = [];

        $renderBlock = static function (array $blockLines): string {
            return self::renderMarkdownLines($blockLines);
        };

        $flushParagraph = static function () use (&$html, &$paragraph): void {
            if ($paragraph === []) {
                return;
            }

            $raw = implode("\n", $paragraph);
            $formatted = self::formatInline($raw);
            $formatted = preg_replace_callback('/(^|\\n)( +)/', function($m) {
                return $m[1] . str_repeat('&nbsp;', strlen($m[2]));
            }, $formatted);
            $formatted = str_replace("\n", "<br />", $formatted);

            $html[] = '<p>' . $formatted . '</p>';
            $paragraph = [];
        };

        $closeList = static function () use (&$html, &$inList): void {
            if ($inList) {
                $html[] = '</ul>';
                $inList = false;
            }
        };

        $closeAlignBlock = static function () use (&$html, &$inAlignBlock, &$alignClass, &$alignLines, $renderBlock): void {
            if (!$inAlignBlock) {
                return;
            }

            $html[] = '<div class="' . $alignClass . '">' . $renderBlock($alignLines) . '</div>';
            $inAlignBlock = false;
            $alignClass = '';
            $alignLines = [];
        };

        foreach ($lines as $line) {
            if (!$inAlignBlock && preg_match('/^:::(center|right|left)\s*$/i', trim($line), $matches)) {
                $flushParagraph();
                $closeList();
                $inAlignBlock = true;
                $alignClass = 'text-' . strtolower($matches[1]);
                $alignLines = [];
                continue;
            }

            if ($inAlignBlock) {
                if (trim($line) === ':::') {
                    $closeAlignBlock();
                } else {
                    $alignLines[] = $line;
                }

                continue;
            }

            if (trim($line) === '```') {
                if ($inCode) {
                    $html[] = '<pre><code>' . htmlspecialchars(implode("\n", $codeLines), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</code></pre>';
                    $codeLines = [];
                    $inCode = false;
                } else {
                    $flushParagraph();
                    $closeList();
                    $inCode = true;
                }

                continue;
            }

            if ($inCode) {
                $codeLines[] = $line;
                continue;
            }

            if (preg_match('/^(#{1,6})\s+(.+)$/', $line, $matches)) {
                $flushParagraph();
                $closeList();
                $level = strlen($matches[1]);
                $html[] = sprintf('<h%d>%s</h%d>', $level, self::formatInline(trim($matches[2])), $level);
                continue;
            }

            if (preg_match('/^[-*]\s+(.+)$/', $line, $matches)) {
                $flushParagraph();
                if (!$inList) {
                    $html[] = '<ul>';
                    $inList = true;
                }

                $html[] = '<li>' . self::formatInline(trim($matches[1])) . '</li>';
                continue;
            }

            if (trim($line) === '') {
                $flushParagraph();
                $closeList();
                continue;
            }

            $paragraph[] = $line;
        }

        if ($inAlignBlock) {
            $closeAlignBlock();
        }

        if ($inCode) {
            $html[] = '<pre><code>' . htmlspecialchars(implode("\n", $codeLines), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</code></pre>';
        }

        $flushParagraph();
        $closeList();

        return implode("\n", $html);
    }

    private static function formatInline(string $text): string {
        $text = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $text = preg_replace('/`([^`]+)`/', '<code>$1</code>', $text) ?? $text;
        $text = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $text) ?? $text;
        $text = preg_replace('/(?<!\*)\*([^*]+)\*(?!\*)/', '<em>$1</em>', $text) ?? $text;
        $text = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $text) ?? $text;

        return $text;
    }

    public static function deleteBook(string $slug): void {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        @unlink(self::draftPath($slug));
        @unlink(self::publishedPath($slug));

        self::deleteMetadata($slug);
    }
}