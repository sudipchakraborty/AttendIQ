<?php
declare(strict_types=1);
namespace AttendIQ;

function route(Store $store, array $config, string $route, string $method, array $body): array {
    $user = sessionUser($store);
    if ($route === '/auth/session' && $method === 'GET') {
        $_SESSION['csrf'] ??= bin2hex(random_bytes(24));
        $setup = $store->transaction(fn(&$state) => count($state['users']) === 0);
        return ['user' => $user ? publicUser($user) : null, 'permissions' => $user ? PERMISSIONS[$user['role']] : [], 'csrfToken' => $_SESSION['csrf'], 'setupRequired' => $setup];
    }
    if ($method !== 'GET') csrf();
    if ($route === '/auth/setup' && $method === 'POST') {
        $allowed = $store->transaction(fn(&$state) => limit($state, 'setup:' . ($_SERVER['REMOTE_ADDR'] ?? 'local'), 10, 900));
        if (!$allowed) throw new ApiError(429, 'Too many setup attempts. Try again later.');
        if (!is_string($body['token'] ?? null) || !hash_equals($store->setupToken(), $body['token'])) throw new ApiError(403, 'Invalid installation token.');
        $name = text($body['name'] ?? '', 'Name'); $email = email($body['email'] ?? ''); $hash = password($body['password'] ?? '');
        $created = $store->transaction(function (&$state) use ($name, $email, $hash) {
            if ($state['users']) throw new ApiError(409, 'Administrator already configured. Please log in.');
            $user = ['id' => bin2hex(random_bytes(8)), 'name' => $name, 'email' => $email, 'passwordHash' => $hash, 'role' => 'Admin', 'active' => true, 'version' => 1, 'authVersion' => 1];
            $state['users'][] = $user; audit($state, 'admin.setup', $user['id'], $user['id']); return $user;
        });
        loginSession($created); return ['user' => publicUser($created), 'permissions' => PERMISSIONS['Admin'], 'csrfToken' => $_SESSION['csrf'], 'setupRequired' => false];
    }
    if ($route === '/auth/login' && $method === 'POST') {
        $email = email($body['email'] ?? '');
        $key = 'login:' . hash('sha256', $email . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $allowed = $store->transaction(function (&$state) use ($key) { $ip = 'login-ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'local'); if (!limit($state, $ip, 40, 900)) return false; return limit($state, $key, 10, 900); });
        if (!$allowed) throw new ApiError(429, 'Too many login attempts. Try again in 15 minutes.');
        $found = $store->transaction(function (&$state) use ($email) { foreach ($state['users'] as $item) if ($item['email'] === $email && $item['active']) return $item; return null; });
        // Always run a password check to reduce account enumeration through timing.
        $valid = password_verify(is_string($body['password'] ?? null) ? $body['password'] : '', $found['passwordHash'] ?? '$2y$12$9zdEHV8SdfTguGEvVU/H/.nrtk8W3XL2gC8XbfzaQR9W6bVFAtxB2');
        if (!$found || !$valid) throw new ApiError(401, 'Email or password is incorrect.');
        $store->transaction(function (&$state) use ($key, $found) { unset($state['limits'][$key]); audit($state, 'auth.login', $found['id'], $found['id']); });
        loginSession($found); return ['user' => publicUser($found), 'permissions' => PERMISSIONS[$found['role']], 'csrfToken' => $_SESSION['csrf'], 'setupRequired' => false];
    }
    if ($route === '/auth/logout' && $method === 'POST') { $_SESSION = []; session_regenerate_id(true); return ['ok' => true]; }
    if ($route === '/auth/password' && $method === 'PUT') {
        if (!$user) throw new ApiError(401, 'Please log in.');
        if (!password_verify($body['currentPassword'] ?? '', $user['passwordHash'])) throw new ApiError(422, 'Current password is incorrect.');
        $hash = password($body['password'] ?? '');
        $updated = $store->transaction(function (&$state) use ($user, $hash) { foreach ($state['users'] as &$item) if ($item['id'] === $user['id']) { $item['passwordHash'] = $hash; $item['authVersion']++; $item['version']++; audit($state, 'auth.password', $item['id'], $user['id']); return $item; } throw new ApiError(404, 'User not found.'); });
        loginSession($updated); return ['ok' => true, 'csrfToken' => $_SESSION['csrf']];
    }
    if ($route === '/defaults' && $method === 'GET') {
        permit($user, 'reports.read');
        return $store->transaction(fn(&$state) => ['attendance' => $store->attendance(), 'employees' => array_values(array_map(fn($e) => array_intersect_key($e, array_flip(['id', 'name', 'monthlySalary'])), array_filter($state['employees'], fn($e) => !$e['archived']))), 'archivedIds' => array_column(array_filter($state['employees'], fn($e) => $e['archived']), 'id'), 'revision' => $state['revision']]);
    }
    if ($route === '/employees' && $method === 'GET') { permit($user, 'employees.read'); return $store->transaction(fn(&$state) => ['employees' => $state['employees'], 'revision' => $state['revision']]); }
    if ($route === '/employees' && $method === 'POST') {
        permit($user, 'employees.write');
        $name = text($body['name'] ?? '', 'Employee name'); $mail = !empty($body['email']) ? email($body['email']) : '';
        return $store->transaction(function (&$state) use ($name, $mail, $user, $body) {
            $id = isset($body['id']) && $body['id'] !== '' ? text($body['id'], 'Device employee ID', 40) : (string) (1 + max(array_merge([0], array_map(fn($e) => ctype_digit($e['id']) ? (int) $e['id'] : 0, $state['employees']))));
            if (!preg_match('/^[A-Za-z0-9_-]+$/', $id)) throw new ApiError(422, 'Employee ID can contain letters, digits, underscores or hyphens.');
            foreach ($state['employees'] as $item) if ($item['id'] === $id || strcasecmp($item['name'], $name) === 0) throw new ApiError(409, 'Employee ID or name already exists, including archived records.');
            $employee = ['id' => $id, 'name' => $name, 'email' => $mail, 'monthlySalary' => null, 'archived' => false, 'version' => 1];
            $state['employees'][] = $employee; audit($state, 'employee.create', $id, $user['id']); return ['employee' => $employee];
        });
    }
    if (preg_match('#^/employees/([^/]+)$#', $route, $matches) && in_array($method, ['PUT', 'DELETE'], true)) {
        permit($user, 'employees.write'); $id = $matches[1];
        return $store->transaction(function (&$state) use ($id, $body, $method, $user) {
            foreach ($state['employees'] as &$item) if ($item['id'] === $id) {
                checkVersion($item, $body);
                if ($method === 'DELETE') $item['archived'] = true;
                else {
                    $name = text($body['name'] ?? $item['name'], 'Employee name');
                    foreach ($state['employees'] as $other) if ($other['id'] !== $id && strcasecmp($other['name'], $name) === 0) throw new ApiError(409, 'Employee name already exists.');
                    $item['name'] = $name; $item['email'] = !empty($body['email']) ? email($body['email']) : '';
                    if (array_key_exists('archived', $body)) { if (!is_bool($body['archived'])) throw new ApiError(422, 'Invalid archive state.'); $item['archived'] = $body['archived']; }
                }
                $item['version']++; audit($state, $method === 'DELETE' ? 'employee.archive' : 'employee.update', $id, $user['id']); return ['employee' => $item];
            }
            throw new ApiError(404, 'Employee not found.');
        });
    }
    if ($route === '/salaries' && $method === 'GET') { permit($user, 'salaries.read'); return $store->transaction(fn(&$state) => ['employees' => array_values(array_filter($state['employees'], fn($e) => !$e['archived']))]); }
    if (preg_match('#^/salaries/([^/]+)$#', $route, $matches) && $method === 'PUT') {
        permit($user, 'salaries.write'); $id = $matches[1];
        $amount = $body['monthlySalary'] ?? null;
        if (!is_int($amount) && !is_float($amount)) throw new ApiError(422, 'Salary must be a number.');
        if (!is_finite((float) $amount) || $amount < 0 || $amount > 100000000 || abs($amount * 100 - round($amount * 100)) > .0001) throw new ApiError(422, 'Salary must be non-negative with at most two decimal places.');
        return $store->transaction(function (&$state) use ($id, $amount, $body, $user) {
            foreach ($state['employees'] as &$item) if ($item['id'] === $id && !$item['archived']) { checkVersion($item, $body); $item['monthlySalary'] = round($amount, 2); $item['version']++; audit($state, 'salary.update', $id, $user['id']); return ['employee' => $item]; }
            throw new ApiError(404, 'Active employee not found.');
        });
    }
    if ($route === '/users' && $method === 'GET') { permit($user, 'users.manage'); return $store->transaction(fn(&$state) => ['users' => array_map(__NAMESPACE__ . '\\publicUser', $state['users']), 'roles' => array_keys(PERMISSIONS)]); }
    if ($route === '/users' && $method === 'POST') {
        permit($user, 'users.manage'); $name = text($body['name'] ?? '', 'Name'); $mail = email($body['email'] ?? ''); $hash = password($body['password'] ?? ''); $role = $body['role'] ?? '';
        if (!is_string($role) || !isset(PERMISSIONS[$role])) throw new ApiError(422, 'Choose a valid role.');
        return $store->transaction(function (&$state) use ($name, $mail, $hash, $role, $user) {
            foreach ($state['users'] as $item) if ($item['email'] === $mail) throw new ApiError(409, 'Email already exists.');
            $created = ['id' => bin2hex(random_bytes(8)), 'name' => $name, 'email' => $mail, 'passwordHash' => $hash, 'role' => $role, 'active' => true, 'version' => 1, 'authVersion' => 1];
            $state['users'][] = $created; audit($state, 'user.create', $created['id'], $user['id']); return ['user' => publicUser($created)];
        });
    }
    if (preg_match('#^/users/([a-f0-9]+)$#', $route, $matches) && $method === 'PUT') {
        permit($user, 'users.manage'); $id = $matches[1];
        return $store->transaction(function (&$state) use ($id, $body, $user) {
            foreach ($state['users'] as &$item) if ($item['id'] === $id) {
                checkVersion($item, $body); $role = $body['role'] ?? $item['role']; $active = $body['active'] ?? $item['active'];
                if (!is_string($role) || !isset(PERMISSIONS[$role]) || !is_bool($active)) throw new ApiError(422, 'Invalid role or account state.');
                $admins = count(array_filter($state['users'], fn($u) => $u['role'] === 'Admin' && $u['active']));
                if ($item['role'] === 'Admin' && $item['active'] && ($role !== 'Admin' || !$active) && $admins <= 1) throw new ApiError(409, 'Keep at least one active administrator.');
                $item['role'] = $role; $item['active'] = $active; $item['name'] = text($body['name'] ?? $item['name'], 'Name');
                if (!empty($body['password'])) $item['passwordHash'] = password($body['password']);
                $item['authVersion']++; $item['version']++; audit($state, 'user.update', $id, $user['id']); return ['user' => publicUser($item)];
            }
            throw new ApiError(404, 'User not found.');
        });
    }
    if ($route === '/support' && $method === 'POST') {
        permit($user, 'support.send');
        $subject = text($body['subject'] ?? '', 'Subject', 160);
        $message = $body['message'] ?? '';
        if (!is_string($message) || mb_strlen(trim($message)) < 10 || mb_strlen($message) > 10000 || str_contains($message, "\0")) throw new ApiError(422, 'Message must contain 10 to 10000 characters.');
        $allowed = $store->transaction(fn(&$state) => limit($state, 'support:' . $user['id'], 5, 3600));
        if (!$allowed) throw new ApiError(429, 'Support limit reached. Try again later.');
        $ticket = ['id' => 'IQ-' . strtoupper(bin2hex(random_bytes(5))), 'subject' => $subject, 'message' => trim($message), 'userId' => $user['id'], 'createdAt' => gmdate('c'), 'status' => 'pending'];
        $store->transaction(function (&$state) use ($ticket) { $state['tickets'][] = $ticket; });
        try { sendSupport($ticket, $user, $config); $status = 'accepted'; } catch (ApiError $error) { $status = 'failed'; $failure = $error; }
        $store->transaction(function (&$state) use ($ticket, $status, $user) { foreach ($state['tickets'] as &$item) if ($item['id'] === $ticket['id']) $item['status'] = $status; audit($state, 'support.' . $status, $ticket['id'], $user['id']); });
        if (isset($failure)) throw $failure;
        return ['ticketId' => $ticket['id'], 'status' => 'accepted', 'message' => 'The mail server accepted your request for info@niyanti.com.'];
    }
    throw new ApiError(404, 'API endpoint not found.');
}
