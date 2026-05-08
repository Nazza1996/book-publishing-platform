<?php
    class UserRepository {
        public static function getAll(PDO $pdo): array {
            $stmt = $pdo->query("
                SELECT *
                FROM users
                ORDER BY id ASC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        public static function createUser(PDO $pdo, string $username, string $passwordHash): int {
            $stmt = $pdo->prepare("
                INSERT INTO users (username, password_hash)
                VALUES (:username, :password_hash)
            ");
            $stmt->execute([
                'username' => $username,
                'password_hash' => $passwordHash,
            ]);
            return (int)$pdo->lastInsertId();
        }
    
        public static function updateUsername(PDO $pdo, int $userId, string $username): void {
            $stmt = $pdo->prepare("
                UPDATE users
                SET username = :username
                WHERE id = :id
            ");
            $stmt->execute([
                'username' => $username,
                'id' => $userId,
            ]);
        }

        public static function deleteUser(PDO $pdo, int $userId): void {
            $stmt = $pdo->prepare("
                DELETE FROM users
                WHERE id = :id
            ");
            $stmt->execute(['id' => $userId]);
        }
    }
?>