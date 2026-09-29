<?php
/* TAJCOTTEX — contact form handler.
   Accepts JSON (sent by js/site.js) or a regular form POST. */
header('Content-Type: application/json; charset=utf-8');

function reply($ok, $error = null) {
    echo json_encode($ok ? ['success' => true] : ['success' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    reply(false, 'Неверный метод');
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    $data = $_POST;
}

// Honeypot: real visitors never fill the hidden "website" field.
if (!empty($data['website'])) {
    reply(true);
}

function field($data, $key, $max) {
    $v = isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : '';
    return mb_substr($v, 0, $max, 'UTF-8');
}

$name    = field($data, 'name', 120);
$email   = field($data, 'email', 160);
$company = field($data, 'company', 160);
$message = field($data, 'message', 5000);

$subjects = [
    'membership'  => 'Членство в ассоциации',
    'investment'  => 'Инвестиционное сотрудничество',
    'export'      => 'Поддержка экспорта',
    'partnership' => 'Партнёрство',
    'press'       => 'Пресса и мероприятия',
    'other'       => 'Другое',
];
$topic = $subjects[field($data, 'subject', 20)] ?? 'Другое';

if ($name === '' || $email === '' || $message === '') {
    reply(false, 'Заполните обязательные поля');
}
// filter_var also rejects CR/LF, so the address is safe to use in a header.
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(false, 'Некорректный email');
}

$h = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };

$to      = 'chairman@tajcottex.tj';
$subject = '=?UTF-8?B?' . base64_encode('Сайт TAJCOTTEX: ' . $topic) . '?=';
$body = "<html><body style=\"font-family: Arial, sans-serif; color:#161a12;\">
  <div style=\"background:#0b100c; color:#e6c985; padding:18px 22px; border-radius:10px 10px 0 0;\">
    <strong>Новое обращение с сайта TAJCOTTEX</strong>
  </div>
  <div style=\"background:#f5f0e5; padding:22px; border-radius:0 0 10px 10px;\">
    <p><strong>Тема:</strong> {$h($topic)}</p>
    <p><strong>Имя:</strong> {$h($name)}</p>
    <p><strong>Email:</strong> <a href=\"mailto:{$h($email)}\">{$h($email)}</a></p>
    <p><strong>Компания:</strong> {$h($company)}</p>
    <p><strong>Сообщение:</strong></p>
    <div style=\"background:#fff; padding:14px; border-radius:6px;\">" . nl2br($h($message)) . "</div>
  </div>
</body></html>";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: TAJCOTTEX <chairman@tajcottex.tj>\r\n";
$headers .= "Reply-To: {$email}\r\n";

if (mail($to, $subject, $body, $headers)) {
    reply(true);
}
reply(false, 'Ошибка сервера');
