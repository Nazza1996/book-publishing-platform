<?php

declare(strict_types=1);

final class Book implements ArrayAccess, JsonSerializable {
    public string $slug;
    public string $title;
    public string $content;
    public string $status;
    public bool $draftExists;
    public bool $publishedExists;
    public bool $featured;
    public string $description;
    public bool $isPlaceholder;

    public function __construct(
        string $slug,
        string $title,
        string $content,
        string $status,
        bool $draftExists = false,
        bool $publishedExists = false,
        bool $featured = false,
        string $description = '',
        bool $isPlaceholder = false
    ) {
        $this->slug = $slug;
        $this->title = $title;
        $this->content = $content;
        $this->status = $status;
        $this->draftExists = $draftExists;
        $this->publishedExists = $publishedExists;
        $this->featured = $featured;
        $this->description = $description;
        $this->isPlaceholder = $isPlaceholder;
    }

    public static function fromArray(array $data): self {
        return new self(
            (string)($data['slug'] ?? ''),
            (string)($data['title'] ?? ''),
            (string)($data['content'] ?? ''),
            (string)($data['status'] ?? 'draft'),
            (bool)($data['draftExists'] ?? false),
            (bool)($data['publishedExists'] ?? false),
            (bool)($data['featured'] ?? false),
            (string)($data['description'] ?? ''),
            (bool)($data['is_placeholder'] ?? $data['isPlaceholder'] ?? false)
        );
    }

    public static function blankDraft(string $slug = ''): self {
        return new self($slug, '', '', 'draft');
    }

    public static function placeholder(): self {
        return new self('', 'Coming Soon', '', 'published', false, false, false, '', true);
    }

    public function toArray(): array {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'content' => $this->content,
            'status' => $this->status,
            'draftExists' => $this->draftExists,
            'publishedExists' => $this->publishedExists,
            'featured' => $this->featured,
            'description' => $this->description,
            'is_placeholder' => $this->isPlaceholder,
        ];
    }

    public function jsonSerialize(): array {
        return $this->toArray();
    }

    public function offsetExists(mixed $offset): bool {
        return array_key_exists((string)$offset, $this->toArray());
    }

    public function offsetGet(mixed $offset): mixed {
        $key = (string)$offset;
        $data = $this->toArray();

        return $data[$key] ?? null;
    }

    public function offsetSet(mixed $offset, mixed $value): void {
        throw new LogicException('Book models are immutable.');
    }

    public function offsetUnset(mixed $offset): void {
        throw new LogicException('Book models are immutable.');
    }
}
