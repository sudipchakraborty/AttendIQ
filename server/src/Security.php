<?php
declare(strict_types=1);
namespace AttendIQ;

const PERMISSIONS = [
    'Admin' => ['employees.read', 'employees.write', 'salaries.read', 'salaries.write', 'reports.read', 'users.manage', 'support.send'],
    'HR' => ['employees.read', 'employees.write', 'salaries.read', 'salaries.write', 'reports.read', 'support.send'],
    'Viewer' => ['reports.read', 'support.send'],
];
function publicUser(array $user): array { return array_intersect_key($user, array_flip(['id', 'name', 'email', 'role', 'active', 'version'])); }
function sessionUser(Store $store): ?array {
    if (!isset($_SESSION['userId'])) return null;
    $now = time();
    if ($now - ($_SESSION['lastSeen'] ?? 0) > 1800 || $now - ($_SESSION['createdAt'] ?? 0) > 28800) { $_SESSION = []; return null; }
    $user = $store->transaction(function (&$state) { foreach ($state['users'] as $user) if ($user['id'] === $_SESSION['userId'] && $user['active'] && $user['authVersion'] === ($_SESSION['authVersion'] ?? 0)) return $user; return null; });
    if (!$user) { $_SESSION = []; return null; }
    $_SESSION['lastSeen'] = $now;
    return $user;
}
function permit(?array $user, string $permission): void {
    if (!$user) throw new ApiError(401, 'Please log in to continue.');
    if (!in_array($permission, PERMISSIONS[$user['role']] ?? [], true)) throw new ApiError(403, 'Your role does not allow this action.');
}
function loginSession(array $user): void {
    session_regenerate_id(true);
    $_SESSION = ['userId' => $user['id'], 'authVersion' => $user['authVersion'], 'createdAt' => time(), 'lastSeen' => time(), 'csrf' => bin2hex(random_bytes(24))];
}
function csrf(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'] ?? '', $token)) throw new ApiError(419, 'Your session token expired. Reload and try again.');
}
function limit(array &$state, string $key, int $maximum, int $seconds): bool {
    $now = time();
    foreach ($state['limits'] as $name => $value) if ($value['until'] < $now) unset($state['limits'][$name]);
    $entry = $state['limits'][$key] ?? ['count' => 0, 'until' => $now + $seconds];
    $entry['count']++; $state['limits'][$key] = $entry;
    return $entry['count'] <= $maximum;
}
function checkVersion(array $item, array $body): void {
    if (($body['version'] ?? null) !== $item['version']) throw new ApiError(409, 'This record changed. Reload before saving again.');
}
