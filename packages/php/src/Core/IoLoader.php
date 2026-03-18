<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\AuditLogger;

/**
 * I/O loader for reading files and fetching URLs.
 */
final class IoLoader
{
    private static ?HttpClientInterface $httpClient = null;

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
    public static function assertPathWithinAllowedDirs(
        string $filePath,
        array $allowedDirs = [],
        bool $allowAnyPath = false,
    ): void {
        if (str_contains($filePath, "\0")) {
            throw new SecurityException('File path contains null bytes.');
        }

        if (count($allowedDirs) === 0) {
            if ($allowAnyPath) {
                return;
            }
            throw new SecurityException(
                'No allowedDirs configured. Provide allowedDirs or set allowAnyPath: true to bypass path restrictions.'
            );
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
    public static function readFile(string $filePath, array $allowedDirs = [], bool $allowAnyPath = false): string
    {
        self::assertPathWithinAllowedDirs($filePath, $allowedDirs, $allowAnyPath);
        AuditLogger::emit('file.read', ['filePath' => $filePath]);
        $content = @file_get_contents($filePath);
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
        $resolvedIp = self::assertSafeUrl($url, $options);
        AuditLogger::emit('url.fetch', ['url' => $url]);

        $parsed = parse_url($url);
        /** @var string $host */
        $host = $parsed['host'] ?? '';
        $port = $parsed['port'] ?? 443;

        $curlOptions = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_RESOLVE => ["{$host}:{$port}:{$resolvedIp}"],
        ];

        return self::getHttpClient()->fetch($url, $curlOptions);
    }

    public static function setHttpClient(HttpClientInterface $client): void
    {
        self::$httpClient = $client;
    }

    public static function resetHttpClient(): void
    {
        self::$httpClient = null;
    }

    private static function getHttpClient(): HttpClientInterface
    {
        return self::$httpClient ??= new CurlHttpClient();
    }

    /**
     * @param array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]} $options
     * @return string The resolved IP address (used by fetchUrl to pin DNS via CURLOPT_RESOLVE).
     * @throws SecurityException
     */
    public static function assertSafeUrl(string $url, array $options = []): string
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
        $host = $parsed['host'];

        // Check IPv6 loopback and link-local
        $cleaned = trim($host, '[]');
        if (!$allowPrivateIps) {
            if ($cleaned === '::1' || $cleaned === '0:0:0:0:0:0:0:1') {
                throw new SecurityException('Access to loopback IPv6 addresses is blocked.');
            }

            // Block fe80::/10 (link-local) — full range fe80::–febf::, not just fe80::
            // The /10 prefix covers second bytes 0x80–0xbf: fe8x, fe9x, feax, febx
            if (preg_match('/^fe[89ab][0-9a-f]:/i', strtolower($cleaned))) {
                throw new SecurityException('Access to IPv6 link-local addresses is blocked.');
            }

            // Block ::ffff:0:0/96 (IPv4-mapped IPv6)
            if (str_starts_with(strtolower($cleaned), '::ffff:')) {
                $mappedIp = substr($cleaned, 7);
                if (self::isPrivateIp($mappedIp)) {
                    throw new SecurityException(
                        "Access to private/internal IP '{$cleaned}' is blocked (SSRF protection)."
                    );
                }
            }

            // Block fc00::/7 (ULA — unique local addresses)
            if (preg_match('/^f[cd][0-9a-f]{0,2}:/i', $cleaned)) {
                throw new SecurityException('Access to IPv6 unique local addresses (ULA) is blocked.');
            }

            // Block metadata hostnames
            if (in_array($host, ['metadata.google.internal', 'instance-data'], true)) {
                throw new SecurityException(
                    "Access to cloud metadata hostname '{$host}' is blocked."
                );
            }
        }

        // Resolve hostname to IP — try IPv4 first, then AAAA fallback
        $ip = gethostbyname($host);

        if ($ip === $host) {
            // gethostbyname failed (returned hostname unchanged) — try IPv6 AAAA records
            $records = @dns_get_record($host, DNS_AAAA);
            if (is_array($records) && count($records) > 0 && isset($records[0]['ipv6'])) {
                $ip = $records[0]['ipv6'];

                if (!$allowPrivateIps && self::isPrivateIpv6($ip)) {
                    throw new SecurityException(
                        "Access to private/internal IPv6 '{$ip}' is blocked (SSRF protection)."
                    );
                }

                return $ip;
            }
        }

        if (!$allowPrivateIps && self::isPrivateIp($ip)) {
            throw new SecurityException(
                "Access to private/internal IP '{$ip}' is blocked (SSRF protection)."
            );
        }

        return $ip;
    }

    public static function isPrivateIpv6(string $ip): bool
    {
        $lower = strtolower($ip);

        // ::1 loopback
        if ($lower === '::1' || $lower === '0:0:0:0:0:0:0:1') {
            return true;
        }

        // fe80::/10 link-local — full range fe80::–febf::, not just fe80::
        // The /10 prefix covers second bytes 0x80–0xbf: fe8x, fe9x, feax, febx
        if (preg_match('/^fe[89ab][0-9a-f]:/i', $lower)) {
            return true;
        }

        // fc00::/7 ULA (unique local addresses): fd00::/8 and fc00::/8
        if (preg_match('/^f[cd][0-9a-f]{0,2}:/i', $lower)) {
            return true;
        }

        // ::ffff:0:0/96 IPv4-mapped — check the mapped IPv4 address
        if (str_starts_with($lower, '::ffff:')) {
            $mappedIp = substr($lower, 7);
            return self::isPrivateIp($mappedIp);
        }

        return false;
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
