<?php

declare(strict_types=1);

final class User implements ArrayAccess, JsonSerializable {
    public int $id;
    public string $username;
    public ?string $passwordHash;

    public function __construct(int $id, string $username, ?string $passwordHash = null) {
        $this->id = $id;
        $this->username = $username;
        $this->passwordHash = $passwordHash;
    }

    public static function fromArray(array $data): self {
        return new self(
            (int)($data['id'] ?? 0),
            (string)($data['username'] ?? ''),
            isset($data['password_hash']) ? (string)$data['password_hash'] : (isset($data['passwordHash']) ? (string)$data['passwordHash'] : null)
        );
    }

    public function toArray(): array {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'password_hash' => $this->passwordHash,
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
        throw new LogicException('User models are immutable.');
    }

    public function offsetUnset(mixed $offset): void {
        throw new LogicException('User models are immutable.');
    }
}
