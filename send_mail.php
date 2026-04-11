<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = htmlspecialchars($data['name'] ?? '');
    $email = htmlspecialchars($data['email'] ?? '');
    $company = htmlspecialchars($data['company'] ?? '');
    $message = htmlspecialchars($data['message'] ?? '');
    
    // Проверка
    if (empty($name) || empty($email) || empty($message)) {
        echo json_encode(['success' => false, 'error' => 'Заполните все поля']);
        exit;
    }
    
    // Настройки письма
    $to = 'chairman@tajcottex.tj';
    $subject = '=?UTF-8?B?' . base64_encode('Новое сообщение с сайта TAJCOTTEX') . '?=';
    
    $body = "
    <html>
    <body style='font-family: Arial, sans-serif; padding: 20px;'>
        <div style='background: #2E7D32; color: white; padding: 20px; border-radius: 10px 10px 0 0;'>
            <h2 style='margin:0;'>📧 Новое сообщение с сайта TAJCOTTEX</h2>
        </div>
        <div style='background: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px;'>
            <p><strong>👤 Имя:</strong> {$name}</p>
            <p><strong>📧 Email:</strong> <a href='mailto:{$email}'>{$email}</a></p>
            <p><strong>🏢 Компания:</strong> {$company}</p>
            <p><strong>💬 Сообщение:</strong></p>
            <div style='background: white; padding: 15px; border-radius: 5px;'>" . nl2br($message) . "</div>
        </div>
    </body>
    </html>";
    
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: TAJCOTTEX <chairman@tajcottex.tj>\r\n";
    $headers .= "Reply-To: {$email}\r\n";
    
    if (mail($to, $subject, $body, $headers)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка сервера']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Неверный метод']);
}
?>
