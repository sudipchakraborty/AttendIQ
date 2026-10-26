<?php
declare(strict_types=1);
// Same-origin transport only. Authentication and business logic run in Node.js.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function failGateway(int $status, string $message): never {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) failGateway(405, 'Method not allowed.');
$route = $_GET['route'] ?? '/auth/session';
if (!is_string($route) || strlen($route) > 180 || !preg_match('#^/[A-Za-z0-9_/-]+$#D', $route)) failGateway(404, 'Invalid route.');
$input = fopen('php://input', 'rb');
$body = stream_get_contents($input, 32769);
if ($body === false || strlen($body) > 32768) failGateway(413, 'Request is too large.');
if (!extension_loaded('curl')) failGateway(503, 'The API gateway requires PHP cURL.');
// Fixed upstream: no request data can select a host, port, scheme, or URL path.
$url = 'https://socket.sukalyanai.com:9443/api/index.php?route=' . rawurlencode($route);
$headers = ['Content-Type: application/json'];
$gatewayConfig = __DIR__ . '/.gateway-config.php';
$secret = is_file($gatewayConfig) ? require $gatewayConfig : '';
if (!is_string($secret) || strlen($secret) < 64) failGateway(503, 'The API gateway is not configured.');
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
$timestamp = (string) (int) floor(microtime(true) * 1000);
$headers[] = 'X-AttendIQ-Client-IP: ' . $clientIp;
$headers[] = 'X-AttendIQ-Timestamp: ' . $timestamp;
$headers[] = 'X-AttendIQ-Signature: ' . hash_hmac('sha256', $timestamp . "\n" . $clientIp, $secret);
$csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (preg_match('/^[a-f0-9]{48}$/D', $csrf)) $headers[] = 'X-CSRF-Token: ' . $csrf;
$cookie = $_COOKIE['AttendIQSession'] ?? '';
if (is_string($cookie) && preg_match('/^[a-f0-9]{48}$/D', $cookie)) $headers[] = 'Cookie: AttendIQSession=' . $cookie;
$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_HEADERFUNCTION => static function ($handle, string $line): int {
        if (preg_match('/^Set-Cookie:\s*(AttendIQSession=[^\r\n]+)\r?\n$/i', $line, $match)) header('Set-Cookie: ' . $match[1], false);
        return strlen($line);
    },
]);
if ($method !== 'GET') curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
$response = curl_exec($curl);
$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$contentType = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
curl_close($curl);
if ($response === false || $status < 100 || !str_starts_with($contentType, 'application/json')) failGateway(502, 'The Node.js API is unavailable. Please try again later.');
http_response_code($status);
echo $response;
