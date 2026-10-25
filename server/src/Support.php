<?php
declare(strict_types=1);
namespace AttendIQ;

function sendSupport(array $ticket, array $user, array $config): void {
    $smtp = $config['smtp'] ?? [];
    if (empty($smtp['host']) || empty($smtp['from'])) throw new ApiError(503, 'Support email is not configured. Ask your administrator to configure SMTP.');
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP(); $mail->Host = $smtp['host']; $mail->Port = (int) ($smtp['port'] ?? 465);
    $mail->SMTPSecure = $smtp['encryption'] ?? 'smtps';
    // Plain SMTP is permitted only for an explicit local test receiver.
    if ($mail->SMTPSecure === '' && !in_array($mail->Host, ['127.0.0.1', 'localhost'], true)) throw new ApiError(503, 'SMTP encryption must be configured.');
    $mail->SMTPAuth = !empty($smtp['username']);
    $mail->Username = $smtp['username'] ?? ''; $mail->Password = $smtp['password'] ?? '';
    $mail->SMTPAutoTLS = $mail->SMTPSecure !== '';
    $mail->Timeout = 15; $mail->CharSet = 'UTF-8';
    $mail->setFrom($smtp['from'], 'AttendIQ Support');
    $mail->addAddress('info@niyanti.com');
    $mail->addReplyTo($user['email'], $user['name']);
    $mail->Subject = '[AttendIQ ' . $ticket['id'] . '] ' . $ticket['subject'];
    $mail->Body = "From: {$user['name']} <{$user['email']}>\nRole: {$user['role']}\nTicket: {$ticket['id']}\n\n{$ticket['message']}";
    try { $mail->send(); } catch (\Throwable $error) { error_log('AttendIQ SMTP failure: ' . get_class($error)); throw new ApiError(502, 'The mail server did not accept your request. Please retry later.'); }
}
