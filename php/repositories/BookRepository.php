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

    private static function draftPath(string $slug): string {
        return self::draftsDir() . DIRECTORY_SEPARATOR . $slug . '.md';
    }

    private static function publishedPath(string $slug): string {
        return self::publishedDir() . DIRECTORY_SEPARATOR . $slug . '.md';
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
                        'status' => $status,
                        'draftExists' => false,
                        'publishedExists' => false,
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

        return [
            'slug' => $slug,
            'title' => self::extractTitle($contents, $slug),
            'content' => $contents,
            'status' => $published !== null ? 'published' : 'draft',
            'draftExists' => $draft !== null,
            'publishedExists' => $published !== null,
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

        self::writeFile(self::draftPath($slug), $publishedContents);
        @unlink(self::publishedPath($slug));

        return $slug;
    }

    public static function getPublishedBooks(): array {
        return array_values(array_filter(self::listBooks(), static function (array $book): bool {
            return $book['publishedExists'];
        }));
    }

    public static function getPublishedBook(string $slug): ?array {
        $slug = self::normalizeSlug($slug);
        $contents = self::readFile(self::publishedPath($slug));

        if ($contents === null) {
            return null;
        }

        return [
            'slug' => $slug,
            'title' => self::extractTitle($contents, $slug),
            'content' => $contents,
        ];
    }

    public static function extractTitle(string $markdown, string $fallbackSlug): string {
        if (preg_match('/^#\s+(.+)$/m', $markdown, $matches)) {
            return trim($matches[1]);
        }

        return self::prettyTitle($fallbackSlug);
    }

    public static function markdownToHtml(string $markdown): string {
        $markdown = str_replace(["\r\n", "\r"], "\n", $markdown);
        $lines = explode("\n", $markdown);
        $html = [];
        $paragraph = [];
        $inList = false;
        $inCode = false;
        $codeLines = [];

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

        foreach ($lines as $line) {
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