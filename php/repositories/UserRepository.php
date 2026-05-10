<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

class UserRepository {
    public static function getAll(PDO $pdo): array {
        $stmt = $pdo->query("
            SELECT id, username, password_hash
            FROM users
            ORDER BY id ASC
        ");

        return array_map(static fn(array $row): User => User::fromArray($row), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public static function findById(PDO $pdo, int $userId): ?User {
        $stmt = $pdo->prepare("
            SELECT id, username, password_hash
            FROM users
            WHERE id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $userId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : User::fromArray($row);
    }

    public static function findByUsername(PDO $pdo, string $username): ?User {
        $stmt = $pdo->prepare("
            SELECT id, username, password_hash
            FROM users
            WHERE username = :username
            LIMIT 1
        ");
        $stmt->execute(['username' => $username]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : User::fromArray($row);
    }

    public static function createUser(PDO $pdo, User $user): int {
        $stmt = $pdo->prepare("
            INSERT INTO users (username, password_hash)
            VALUES (:username, :password_hash)
        ");
        $stmt->execute([
            'username' => $user->username,
            'password_hash' => $user->passwordHash,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function updateUser(PDO $pdo, User $user): void {
        $stmt = $pdo->prepare("
            UPDATE users
            SET username = :username
            WHERE id = :id
        ");
        $stmt->execute([
            'id' => $user->id,
            'username' => $user->username,
        ]);
    }

    public static function deleteUser(PDO $pdo, User $user): void {
        $stmt = $pdo->prepare("
            DELETE FROM users
            WHERE id = :id
        ");
        $stmt->execute(['id' => $user->id]);
    }
}