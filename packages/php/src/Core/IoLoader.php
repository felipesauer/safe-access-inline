<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\AuditLogger;

/**
 * I/O loader for reading files and fetching URLs.
 */
final class IoLoader
{
    /** @var array<string, AccessorFormat> */
    private const EXTENSION_FORMAT_MAP = [
        'json' => AccessorFormat::Json,
        'xml' => AccessorFormat::Xml,
        'yaml' => AccessorFormat::Yaml,
        'yml' => AccessorFormat::Yaml,
        'toml' => AccessorFormat::Toml,
        'ini' => AccessorFormat::Ini,
        'cfg' => AccessorFormat::Ini,
        'csv' => AccessorFormat::Csv,
        'env' => AccessorFormat::Env,
        'ndjson' => AccessorFormat::Ndjson,
        'jsonl' => AccessorFormat::Ndjson,
    ];

    public static function resolveFormatFromExtension(string $filePath): ?AccessorFormat
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        return self::EXTENSION_FORMAT_MAP[$ext] ?? null;
    }

    /**
     * @param string[] $allowedDirs
     * @throws SecurityException
     */
    public static function assertPathWithinAllowedDirs(string $filePath, array $allowedDirs = []): void
    {
        if (str_contains($filePath, "\0")) {
            throw new SecurityException('File path contains null bytes.');
        }

        if (count($allowedDirs) === 0) {
            return;
        }

        $resolved = realpath($filePath);
        if ($resolved === false) {
            // File doesn't exist yet — resolve the directory part
            $dir = realpath(dirname($filePath));
            if ($dir === false) {
                throw new SecurityException("Path '{$filePath}' is outside allowed directories.");
            }
            $resolved = $dir . DIRECTORY_SEPARATOR . basename($filePath);
        }

        foreach ($allowedDirs as $allowedDir) {
            $resolvedDir = realpath($allowedDir);
            if ($resolvedDir === false) {
                continue;
            }
            if (str_starts_with($resolved, $resolvedDir . DIRECTORY_SEPARATOR) || $resolved === $resolvedDir) {
                return;
            }
        }

        throw new SecurityException("Path '{$filePath}' is outside allowed directories.");
    }

    /**
     * @param string[] $allowedDirs
     * @throws SecurityException
     */
    public static function readFile(string $filePath, array $allowedDirs = []): string
    {
        self::assertPathWithinAllowedDirs($filePath, $allowedDirs);
        AuditLogger::emit('file.read', ['filePath' => $filePath]);
        $content = file_get_contents($filePath);
        if ($content === false) {
            throw new SecurityException("Failed to read file: '{$filePath}'");
        }
        return $content;
    }

    /**
     * @param array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]} $options
     * @throws SecurityException
     */
    public static function fetchUrl(string $url, array $options = []): string
    {
        self::assertSafeUrl($url, $options);
        AuditLogger::emit('url.fetch', ['url' => $url]);

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'follow_location' => 0,
            ],
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
            ],
        ]);

        $content = @file_get_contents($url, false, $context);
        if ($content === false) {
            throw new SecurityException("Failed to fetch URL: '{$url}'");
        }
        return $content;
    }

    /**
     * @param array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]} $options
     * @throws SecurityException
     */
    public static function assertSafeUrl(string $url, array $options = []): void
    {
        $parsed = parse_url($url);
        if ($parsed === false || !isset($parsed['scheme'], $parsed['host'])) {
            throw new SecurityException("Invalid URL: '{$url}'");
        }

        if (strtolower($parsed['scheme']) !== 'https') {
            throw new SecurityException(
                "Only HTTPS URLs are allowed. Got: '{$parsed['scheme']}'"
            );
        }

        if (isset($parsed['user']) || isset($parsed['pass'])) {
            throw new SecurityException('URLs with embedded credentials are not allowed.');
        }

        $allowedPorts = $options['allowedPorts'] ?? [443];
        $port = $parsed['port'] ?? 443;
        if (!in_array($port, $allowedPorts, true)) {
            throw new SecurityException(
                "Port {$port} is not in the allowed list: [" . implode(', ', $allowedPorts) . ']'
            );
        }

        $allowedHosts = $options['allowedHosts'] ?? [];
        if (count($allowedHosts) > 0 && !in_array($parsed['host'], $allowedHosts, true)) {
            throw new SecurityException("Host '{$parsed['host']}' is not in the allowed list.");
        }

        $allowPrivateIps = $options['allowPrivateIps'] ?? false;
        if (!$allowPrivateIps) {
            $host = $parsed['host'];

            // Check IPv6 loopback
            $cleaned = trim($host, '[]');
            if ($cleaned === '::1' || $cleaned === '0:0:0:0:0:0:0:1') {
                throw new SecurityException('Access to loopback IPv6 addresses is blocked.');
            }

            // Block metadata hostnames
            if (in_array($host, ['metadata.google.internal', 'instance-data'], true)) {
                throw new SecurityException(
                    "Access to cloud metadata hostname '{$host}' is blocked."
                );
            }

            // Resolve hostname to IP
            $ip = gethostbyname($host);
            if (self::isPrivateIp($ip)) {
                throw new SecurityException(
                    "Access to private/internal IP '{$ip}' is blocked (SSRF protection)."
                );
            }
        }
    }

    public static function isPrivateIp(string $ip): bool
    {
        $long = ip2long($ip);
        if ($long === false) {
            return true; // Invalid = treat as private for safety
        }

        $ranges = [
            [0x0a000000, 0x0affffff], // 10.0.0.0/8
            [0xac100000, 0xac1fffff], // 172.16.0.0/12
            [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
            [0x7f000000, 0x7fffffff], // 127.0.0.0/8
            [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
            [0x00000000, 0x00ffffff], // 0.0.0.0/8
        ];

        foreach ($ranges as [$start, $end]) {
            if ($long >= $start && $long <= $end) {
                return true;
            }
        }

        return false;
    }
}
