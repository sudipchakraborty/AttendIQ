<?php
declare(strict_types=1);
namespace AttendIQ;
require __DIR__ . '/Store.php';
require __DIR__ . '/Security.php';
require __DIR__ . '/Support.php';
require __DIR__ . '/Api.php';
require dirname(__DIR__) . '/vendor/autoload.php';

function serve(): void {
    ini_set('display_errors', '0');
    header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY');
    try {
        $storage = getenv('ATTENDIQ_STORAGE') ?: (PHP_SAPI === 'cli-server' ? dirname(__DIR__, 2) . '/.attendiq' : dirname($_SERVER['DOCUMENT_ROOT']) . '/attendiq-private');
        $store = new Store($storage, dirname(__DIR__) . '/seed.php');
        $configPath = getenv('ATTENDIQ_CONFIG') ?: $storage . '/config.php';
        $config = is_file($configPath) ? require $configPath : [];
        $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', '28800');
        session_name('AttendIQSession');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
        session_start();
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) throw new ApiError(413, 'Request is too large.');
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $body = [];
        if ($method !== 'GET') {
            if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) throw new ApiError(415, 'Send application/json.');
            $input = fopen('php://input', 'rb');
            $raw = stream_get_contents($input, 32769); fclose($input);
            if (strlen($raw) > 32768) throw new ApiError(413, 'Request is too large.');
            $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
            if (!is_array($body) || array_is_list($body) && $body !== []) throw new ApiError(422, 'Send a JSON object.');
        }
        $route = $_GET['route'] ?? '/auth/session';
        if (!is_string($route) || strlen($route) > 180) throw new ApiError(404, 'Invalid route.');
        echo json_encode(route($store, $config, $route, $method, $body), JSON_THROW_ON_ERROR);
    } catch (ApiError $error) { http_response_code($error->status); echo json_encode(['error' => $error->getMessage()]); }
    catch (\JsonException) { http_response_code(422); echo json_encode(['error' => 'Invalid JSON request.']); }
    catch (\Throwable $error) { error_log('AttendIQ API failure: ' . get_class($error) . ' ' . $error->getMessage()); http_response_code(500); echo json_encode(['error' => 'The server could not complete the request. Please contact your administrator.']); }
}
