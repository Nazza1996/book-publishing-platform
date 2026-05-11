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

    public static function slugExists(string $slug): bool {
        self::ensureStorage();
        $metadata = self::loadMetadata();
        return isset($metadata[$slug]);
    }

    public static function generateUniqueSlug(string $baseSlug): string {
        self::ensureStorage();
        
        if (!self::slugExists($baseSlug)) {
            return $baseSlug;
        }

        // If slug exists, append -2, -3, -4, etc.
        for ($i = 2; $i <= 999; $i++) {
            $newSlug = $baseSlug . '-' . $i;
            if (!self::slugExists($newSlug)) {
                return $newSlug;
            }
        }

        // Fallback (should rarely happen)
        return $baseSlug . '-' . time();
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

        $baseSlug = self::normalizeSlug($book->title);
        $existingSlug = self::normalizeSlug($existingSlug);

        // If creating a new book (no existing slug), generate a unique slug
        if ($existingSlug === '') {
            $newSlug = self::generateUniqueSlug($baseSlug);
        } else {
            $newSlug = $baseSlug;
        }

        if ($existingSlug !== '' && $existingSlug !== $newSlug) {
            // Check if the new slug already exists for a different book (prevent overwrite)
            if (self::slugExists($newSlug)) {
                throw new InvalidArgumentException("A book with the title '" . self::prettyTitle($newSlug) . "' already exists. Please choose a different title.");
            }
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
        $text = preg_replace('/==([^=]+)==/', '<span class="text-underline">$1</span>', $text) ?? $text;
        $text = preg_replace('/\+\+([^+]+)\+\+/', '<span class="text-underline">$1</span>', $text) ?? $text;
        $text = preg_replace('/__([^_]+)__/', '<span class="text-underline">$1</span>', $text) ?? $text;
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

    private static function chaptersMetadataPath(string $bookSlug, bool $published): string {
        $dir = self::chaptersDir($bookSlug, $published);
        return $dir . DIRECTORY_SEPARATOR . 'metadata.json';
    }

    private static function loadChaptersMetadata(string $bookSlug, bool $published): array {
        $path = self::chaptersMetadataPath($bookSlug, $published);
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

    public static function saveChaptersMetadata(string $bookSlug, bool $published, array $metadata): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $path = self::chaptersMetadataPath($bookSlug, $published);

        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        file_put_contents($path, json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private static function chaptersDir(string $bookSlug, bool $published): string {
        $base = $published ? self::publishedDir() : self::draftsDir();
        return $base . DIRECTORY_SEPARATOR . $bookSlug . DIRECTORY_SEPARATOR . 'chapters';
    }

    private static function chapterPath(string $bookSlug, int $chapterNum, bool $published): string {
        $dir = self::chaptersDir($bookSlug, $published);
        $filename = str_pad((string)$chapterNum, 3, '0', STR_PAD_LEFT) . '.md';
        return $dir . DIRECTORY_SEPARATOR . $filename;
    }

    public static function listChapters(string $bookSlug, bool $published): array {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $dir = self::chaptersDir($bookSlug, $published);

        if (!is_dir($dir)) {
            return [];
        }

        $chapters = [];
        $metadata = self::loadChaptersMetadata($bookSlug, $published);

        foreach (glob($dir . DIRECTORY_SEPARATOR . '*.md') ?: [] as $path) {
            $filename = basename($path);
            $chapterNum = (int)pathinfo($filename, PATHINFO_FILENAME);
            $content = self::readFile($path) ?? '';
            
            // Get title from metadata or extract from content
            $title = $metadata[$chapterNum] ?? self::extractChapterTitle($content);

            $chapters[] = [
                'num' => $chapterNum,
                'title' => $title,
                'content' => $content,
            ];
        }

        usort($chapters, static function (array $a, array $b): int {
            return $a['num'] <=> $b['num'];
        });

        return $chapters;
    }

    public static function getChapter(string $bookSlug, int $chapterNum, bool $published): ?array {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $path = self::chapterPath($bookSlug, $chapterNum, $published);

        $content = self::readFile($path);
        if ($content === null) {
            return null;
        }

        $metadata = self::loadChaptersMetadata($bookSlug, $published);
        $title = $metadata[$chapterNum] ?? self::extractChapterTitle($content);

        return [
            'num' => $chapterNum,
            'title' => $title,
            'content' => $content,
        ];
    }

    public static function saveChapter(string $bookSlug, int $chapterNum, string $content): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $path = self::chapterPath($bookSlug, $chapterNum, false);

        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        self::writeFile($path, $content);
    }

    public static function deleteChapter(string $bookSlug, int $chapterNum): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $path = self::chapterPath($bookSlug, $chapterNum, false);

        if (is_file($path)) {
            @unlink($path);
        }
    }

    public static function reorderChapters(string $bookSlug, array $newOrder): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $chapters = self::listChapters($bookSlug, false);

        // Renumber chapters based on new order
        foreach ($newOrder as $newNum => $oldNum) {
            $oldPath = self::chapterPath($bookSlug, $oldNum, false);
            $newPath = self::chapterPath($bookSlug, $newNum + 1, false);

            if (is_file($oldPath) && $oldPath !== $newPath) {
                $content = self::readFile($oldPath);
                if ($content !== null) {
                    self::writeFile($newPath, $content);
                    @unlink($oldPath);
                }
            }
        }
    }

    public static function publishChapters(string $bookSlug): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);

        $draftDir = self::chaptersDir($bookSlug, false);
        $publishedDir = self::chaptersDir($bookSlug, true);

        // Ensure published chapters directory exists
        if (!is_dir($publishedDir)) {
            mkdir($publishedDir, 0775, true);
        }

        // Copy all draft chapters to published
        if (is_dir($draftDir)) {
            foreach (glob($draftDir . DIRECTORY_SEPARATOR . '*.md') ?: [] as $srcFile) {
                $filename = basename($srcFile);
                $dstFile = $publishedDir . DIRECTORY_SEPARATOR . $filename;
                copy($srcFile, $dstFile);
            }
        }

        // Copy chapter metadata
        $draftMetadata = self::loadChaptersMetadata($bookSlug, false);
        if (!empty($draftMetadata)) {
            self::saveChaptersMetadata($bookSlug, true, $draftMetadata);
        }
    }

    private static function extractChapterTitle(string $content): string {
        $lines = explode("\n", $content);
        foreach ($lines as $line) {
            if (preg_match('/^#\s+(.+)$/', $line, $matches)) {
                return trim($matches[1]);
            }
        }
        return 'Untitled Chapter';
    }

    public static function cleanupOrphanedChapters(string $bookSlug, int $maxChapterNum, bool $published): void {
        self::ensureStorage();
        $bookSlug = self::normalizeSlug($bookSlug);
        $dir = self::chaptersDir($bookSlug, $published);

        if (!is_dir($dir)) {
            return;
        }

        // Delete any chapter files numbered higher than maxChapterNum
        for ($num = $maxChapterNum + 1; $num <= 999; $num++) {
            $path = self::chapterPath($bookSlug, $num, $published);
            if (is_file($path)) {
                @unlink($path);
            } else {
                // Stop searching once we hit the first missing file
                break;
            }
        }
    }
}