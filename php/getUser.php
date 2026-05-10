<?php

declare(strict_types=1);

session_start();

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'loggedIn' => false,
        'message' => 'Not logged in',
    ]);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/repositories/UserRepository.php';

try {
    $user = UserRepository::findById($pdo, (int)$_SESSION['user_id']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to load user information',
    ]);
    exit;
}

if ($user === null) {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'loggedIn' => false,
        'message' => 'User not found',
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'loggedIn' => true,
    'user' => [
            'id' => $user->id,
            'username' => $user->username,
    ],
]);
