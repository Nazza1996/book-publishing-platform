<?php

declare(strict_types=1);

$dbHost = getenv('DB_HOST') ?: 'db';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'app';
$dbUser = getenv('DB_USER') ?: 'appuser';
$dbPass = getenv('DB_PASS') ?: 'secret';

$dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";

try {
	$pdo = new PDO($dsn, $dbUser, $dbPass, [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES => false,
	]);
} catch (PDOException $e) {
	http_response_code(500);
	header('Content-Type: application/json');
	echo json_encode([
		'success' => false,
		'message' => 'Database connection failed',
	]);
	exit;
}
