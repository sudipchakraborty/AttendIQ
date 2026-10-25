<?php
declare(strict_types=1);
namespace AttendIQ;

final class ApiError extends \RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

final class Store {
    public function __construct(public string $directory, private string $seedFile) {
        if (!is_dir($directory) && !mkdir($directory, 0700, true)) throw new \RuntimeException('Cannot create private storage.');
        if (!file_exists($directory . '/setup-token.txt')) {
            $file = @fopen($directory . '/setup-token.txt', 'x');
            if ($file) { fwrite($file, bin2hex(random_bytes(24))); fclose($file); chmod($directory . '/setup-token.txt', 0600); }
        }
    }
    public function transaction(callable $action): mixed {
        $lock = fopen($this->directory . '/state.lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX)) throw new \RuntimeException('Cannot lock storage.');
        try {
            $path = $this->directory . '/state.json';
            $state = file_exists($path) ? json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) : $this->seed();
            $result = $action($state);
            $this->atomic($path, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            // Projections can always be rebuilt from state.json after a crash.
            $this->atomic($this->directory . '/employees.json', json_encode($state['employees'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $salary = '';
            foreach ($state['employees'] as $employee) if (!$employee['archived'] && $employee['monthlySalary'] !== null) $salary .= $employee['name'] . "\t" . number_format($employee['monthlySalary'], 2, '.', '') . "\n";
            $this->atomic($this->directory . '/Salary.txt', $salary);
            return $result;
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }
    private function atomic(string $path, string $text): void {
        $temp = tempnam($this->directory, '.write-');
        if (!$temp || file_put_contents($temp, $text) === false || !rename($temp, $path)) throw new \RuntimeException('Cannot save data.');
        chmod($path, 0600);
    }
    private function seed(): array {
        $attendance = (require $this->seedFile)['attendance'];
        $salary = [];
        foreach (preg_split('/\r?\n/', trim((require $this->seedFile)['salary'])) as $line) {
            if (preg_match('/^(.+?)\s+([\d,.]+)$/', trim($line), $m)) $salary[strtoupper(trim($m[1]))] = ['name' => trim($m[1]), 'amount' => (float) str_replace(',', '', $m[2])];
        }
        $employees = []; $matched = []; $maxId = 0;
        foreach (array_slice(preg_split('/\r?\n/', trim($attendance)), 1) as $line) {
            $fields = explode("\t", $line); if (count($fields) !== 6) continue;
            $id = $fields[2]; $maxId = max($maxId, (int) $id);
            if (isset($employees[$id])) continue;
            $name = trim(preg_replace('/\s*\d+$/', '', trim($fields[3])));
            $key = strtoupper($name); $rate = $name !== '' ? ($salary[$key] ?? null) : null;
            if ($rate) $matched[$key] = true;
            $employees[$id] = ['id' => (string) $id, 'name' => $name ?: "Unnamed employee (ID $id)", 'email' => '', 'monthlySalary' => $rate['amount'] ?? null, 'archived' => false, 'version' => 1];
        }
        foreach ($salary as $key => $entry) if (!isset($matched[$key])) { $id = (string) ++$maxId; $employees[$id] = ['id' => $id, 'name' => $entry['name'], 'email' => '', 'monthlySalary' => $entry['amount'], 'archived' => false, 'version' => 1]; }
        return ['revision' => 1, 'employees' => array_values($employees), 'users' => [], 'audit' => [], 'tickets' => [], 'limits' => []];
    }
    public function attendance(): string { return (require $this->seedFile)['attendance']; }
    public function setupToken(): string { return trim(file_get_contents($this->directory . '/setup-token.txt')); }
}

function audit(array &$state, string $action, string $target, ?string $actor = null): void {
    $state['audit'][] = ['at' => gmdate('c'), 'actor' => $actor, 'action' => $action, 'target' => $target];
    $state['revision']++;
}
function text(mixed $value, string $label, int $max = 120, bool $required = true): string {
    if (!is_string($value)) throw new ApiError(422, "$label must be text.");
    $value = trim($value);
    if (($required && $value === '') || mb_strlen($value) > $max || preg_match('/[\x00-\x1f\x7f]/u', $value)) throw new ApiError(422, "$label is missing or invalid.");
    return $value;
}
function email(mixed $value): string {
    $value = strtolower(text($value, 'Email', 254));
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, 'Enter a valid email address.');
    return $value;
}
function password(mixed $value): string {
    if (!is_string($value) || strlen($value) < 12 || strlen($value) > 72) throw new ApiError(422, 'Use a password between 12 and 72 bytes.');
    return password_hash($value, PASSWORD_DEFAULT);
}
