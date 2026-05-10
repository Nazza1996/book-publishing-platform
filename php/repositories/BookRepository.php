<?php

declare(strict_types=1);

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

    public static function deleteBook(string $slug): void {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        @unlink(self::draftPath($slug));
        @unlink(self::publishedPath($slug));

        $metadata = self::loadMetadata();
        if (isset($metadata[$slug])) {
            unset($metadata[$slug]);
            self::saveMetadata($metadata);
        }
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

    private static function saveMetadata(array $metadata): void {
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
                    $books[$slug] = [
                        'slug' => $slug,
                        'title' => self::extractTitle($contents, $slug),
                        'content' => $contents,
                        'status' => $status,
                        'draftExists' => false,
                        'publishedExists' => false,
                        'featured' => $metadata[$slug]['featured'] ?? false,
                    ];
                }

                if ($status === 'draft') {
                    $books[$slug]['draftExists'] = true;
                }

                if ($status === 'published') {
                    $books[$slug]['publishedExists'] = true;
                    $books[$slug]['status'] = 'published';
                }

                if ($books[$slug]['title'] === self::prettyTitle($slug)) {
                    $books[$slug]['title'] = self::extractTitle($contents, $slug);
                }
            }
        }

        usort($books, static function (array $left, array $right): int {
            return strcasecmp($left['title'], $right['title']);
        });

        return $books;
    }

    public static function getBook(string $slug): ?array {
        self::ensureStorage();
        $slug = self::normalizeSlug($slug);

        $draft = self::readFile(self::draftPath($slug));
        $published = self::readFile(self::publishedPath($slug));

        $contents = $draft ?? $published;

        if ($contents === null) {
            return null;
        }

        $metadata = self::loadMetadata();

        return [
            'slug' => $slug,
            'title' => self::extractTitle($contents, $slug),
            'content' => $contents,
            'status' => $published !== null ? 'published' : 'draft',
            'draftExists' => $draft !== null,
            'publishedExists' => $published !== null,
            'featured' => $metadata[$slug]['featured'] ?? false,
        ];
    }

    public static function saveDraft(string $existingSlug, string $title, string $contents): string {
        self::ensureStorage();

        $newSlug = self::normalizeSlug($title);
        $existingSlug = self::normalizeSlug($existingSlug);

        if ($existingSlug !== '' && $existingSlug !== $newSlug) {
            self::moveIfExists(self::draftPath($existingSlug), self::draftPath($newSlug));
            self::moveIfExists(self::publishedPath($existingSlug), self::publishedPath($newSlug));
        }

        self::writeFile(self::draftPath($newSlug), $contents);

        return $newSlug;
    }

    public static function publishBook(string $existingSlug, string $title, string $contents): string {
        $slug = self::saveDraft($existingSlug, $title, $contents);
        copy(self::draftPath($slug), self::publishedPath($slug));

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

        if (!$book['publishedExists']) {
            throw new InvalidArgumentException('Only published books can be featured.');
        }

        $metadata = self::loadMetadata();
        if (!isset($metadata[$slug])) {
            $metadata[$slug] = [];
        }

        if ($featured === null) {
            $metadata[$slug]['featured'] = !($metadata[$slug]['featured'] ?? false);
        } else {
            $metadata[$slug]['featured'] = $featured;
        }

        self::saveMetadata($metadata);

        self::ensureStorage();

        $published = self::getPublishedBooks();
        $metadata = self::loadMetadata();

        $featured = array_filter($published, static function (array $book) use ($metadata): bool {
            return $metadata[$book['slug']]['featured'] ?? false;
        });

        $featured = array_values($featured);

        // Ensure exactly 3 items (fill with placeholders if needed)
        while (count($featured) < 3) {
            $featured[] = [
                'slug' => '',
                'title' => 'Coming Soon',
                'content' => '',
                'featured' => false,
                'is_placeholder' => true,
            ];
        }

        return array_slice($featured, 0, 3);
    }

    public static function countFeaturedBooks(): int {
        self::ensureStorage();
        $published = self::getPublishedBooks();
        $metadata = self::loadMetadata();

        $featured = array_filter($published, static function (array $book) use ($metadata): bool {
            return $metadata[$book['slug']]['featured'] ?? false;
        });

        return count($featured);
    }

    public static function getPublishedBooks(): array {
        $published = array_filter(self::listBooks(), static function (array $book): bool {
            return $book['publishedExists'];
        });

        $result = [];
        foreach ($published as $book) {
            $bookData = self::getPublishedBook($book['slug']);
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

        $featured = array_filter($published, static function (array $book) use ($metadata): bool {
            return $metadata[$book['slug']]['featured'] ?? false;
        });

        $featured = array_values($featured);

        // Ensure exactly 3 items (fill with placeholders if needed)
        while (count($featured) < 3) {
            $featured[] = [
                'slug' => '',
                'title' => 'Coming Soon',
                'content' => '',
                'featured' => false,
                'is_placeholder' => true,
            ];
        }

        return array_slice($featured, 0, 3);
    }

    public static function getPublishedBook(string $slug): ?array {
        $slug = self::normalizeSlug($slug);
        $contents = self::readFile(self::publishedPath($slug));

        if ($contents === null) {
            return null;
        }

        $metadata = self::loadMetadata();

        return [
            'slug' => $slug,
            'title' => self::extractTitle($contents, $slug),
            'content' => $contents,
            'featured' => $metadata[$slug]['featured'] ?? false,
        ];
    }

    public static function extractTitle(string $markdown, string $fallbackSlug): string {
        if (preg_match('/^#\s+(.+)$/m', $markdown, $matches)) {
            return trim($matches[1]);
        }

        return self::prettyTitle($fallbackSlug);
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

            $text = implode(' ', $paragraph);
            $html[] = '<p>' . self::formatInline($text) . '</p>';
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

            $paragraph[] = trim($line);
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
}