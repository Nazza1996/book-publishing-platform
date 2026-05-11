<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../php/repositories/BookRepository.php';

BookRepository::ensureStorage();

$slug = trim((string)($_GET['slug'] ?? ''));
$chapterNum = (int)($_GET['num'] ?? 0);

if ($slug === '' || $chapterNum === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing slug or chapter number']);
    exit;
}

$chapter = BookRepository::getChapter($slug, $chapterNum, true);

if ($chapter === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Chapter not found']);
    exit;
}

$html = BookRepository::markdownToHtml($chapter['content']);

echo json_encode([
    'num' => $chapter['num'],
    'title' => htmlspecialchars($chapter['title']),
    'html' => $html,
]);
