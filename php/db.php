<?php

declare(strict_types=1);

$configPaths = [
	__DIR__ . '/../config.php',      // Local: project root
	__DIR__ . '/../../config.php',   // Hostinger: outside public_html
];

$config = [];
foreach ($configPaths as $path) {
	if (file_exists($path)) {
		$config = require $path;
		break;
	}
}

$dbHost = $config['DB_HOST'];
$dbPort = $config['DB_PORT'];
$dbName = $config['DB_NAME'];
$dbUser = $config['DB_USER'];
$dbPass = $config['DB_PASS'];

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
