<?php

declare(strict_types=1);

session_start();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed',
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Username and password are required',
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, password_hash
        FROM users
        WHERE username = ?
        LIMIT 1
    ");

    $stmt->execute([$username]);

    $user = $stmt->fetch();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to process login request',
    ]);
    exit;
}

if ($user && password_verify($password, $user['password_hash'])) {

    session_regenerate_id(true);

    $_SESSION['user_id'] = $user['id'];

    echo json_encode([
        'success' => true,
        'redirect' => '/admin',
    ]);

    exit;
}

echo json_encode([
    'success' => false,
    'message' => 'Invalid credentials'
]);