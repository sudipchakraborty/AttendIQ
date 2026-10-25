<?php
// Copy this outside the public directory. Set ATTENDIQ_CONFIG to its absolute path,
// or put it at <private storage>/config.php. Never commit the real configuration.
return [
    'smtp' => [
        'host' => 'smtp.hostinger.com',
        'port' => 465,
        'encryption' => 'smtps',
        'username' => 'your-mailbox@example.com',
        'password' => 'configure-privately-on-server',
        'from' => 'your-mailbox@example.com',
    ],
];
