<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

use SafeAccessInline\Contracts\DnsResolverInterface;
use SafeAccessInline\Contracts\HttpClientInterface;
use SafeAccessInline\Core\Config\IoLoaderConfig;
use SafeAccessInline\Enums\Format;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Audit\AuditLogger;

/**
 * I/O loader for reading files and fetching URLs.
 */
final class IoLoader
{
    /** Optional HTTP client override; null uses the built-in {@see CurlHttpClient}. */
    private static ?HttpClientInterface $httpClient = null;

    /** Optional DNS resolver override; null uses the built-in {@see NativeDnsResolver}. */
    private static ?DnsResolverInterface $dnsResolver = null;

    /** Active I/O loader configuration, lazily initialised on first access. */
    private static IoLoaderConfig $config;

    /**
     * Returns the active I/O loader configuration, lazily initialised.
     */
    private static function config(): IoLoaderConfig
    {
        return self::$config ??= new IoLoaderConfig();
    }

    /**
     * Overrides the default I/O loader configuration.
     */
    public static function configure(IoLoaderConfig $config): void
    {
        self::$config = $config;
    }

    /**
     * Resets the configuration to defaults.
     */
    public static function resetConfig(): void
    {
        self::$config = new IoLoaderConfig();
    }

    /** @var array<string, Format> */
    private const EXTENSION_FORMAT_MAP = [
        'json' => Format::Json,
        'xml' => Format::Xml,
        'yaml' => Format::Yaml,
        'yml' => Format::Yaml,
        'toml' => Format::Toml,
        'ini' => Format::Ini,
        'cfg' => Format::Ini,
        'csv' => Format::Csv,
        'env' => Format::Env,
        'ndjson' => Format::Ndjson,
        'jsonl' => Format::Ndjson,
    ];

    /**
     * Resolves a {@see Format} from a file path's extension.
     *
     * Returns null when the extension is not in the known format map.
     *
     * @param  string $filePath Absolute or relative file path.
     * @return Format|null Resolved format, or null when unrecognised.
     */
    public static function resolveFormatFromExtension(string $filePath): ?Format
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        return self::EXTENSION_FORMAT_MAP[$ext] ?? null;
    }

    /**
     * Validates that `$filePath` resolves to a path within one of the `$allowedDirs`.
     *
     * Resolves symlinks before comparing, blocks null-byte injection, and rejects paths
     * outside the allowlist. Returns the canonical resolved path so the caller can use
     * it directly for subsequent I/O operations, eliminating the TOCTOU window between
     * path validation and the actual file read/write.
     *
     * @param  string   $filePath    Path to validate.
     * @param  string[] $allowedDirs Allowlisted directory roots.
     * @param  bool     $allowAnyPath When true, no directory restriction is applied.
     * @return string The canonical resolved path (result of `realpath()`, or logical dirname + basename
     *                for paths that do not exist yet).
     * @throws SecurityException When the path violates any constraint.
     */
    public static function assertPathWithinAllowedDirs(
        string $filePath,
        array $allowedDirs = [],
        bool $allowAnyPath = false,
    ): string {
        if (str_contains($filePath, "\0")) {
            throw new SecurityException('File path contains null bytes.');
        }

        if (count($allowedDirs) === 0) {
            if ($allowAnyPath) {
                // No directory restriction — resolve the path best-effort and return the canonical form.
                $resolved = realpath($filePath);
                return $resolved !== false ? $resolved : $filePath;
            }
            throw new SecurityException(
                'No allowedDirs configured. Provide allowedDirs or set allowAnyPath: true to bypass path restrictions.'
            );
        }

        // Resolve symlinks before comparing — realpath() follows the full symlink chain.
        // The returned canonical path is used by readFile/writeFile to close TOCTOU windows.
        $resolved = realpath($filePath);
        if ($resolved === false) {
            // File doesn't exist yet (e.g. a write target) — resolve the directory part.
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
                return $resolved;
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
        // Use the canonical resolved path for I/O to close the TOCTOU window between
        // symlink validation and the actual read (the path could be swapped between the two).
        $resolved = self::assertPathWithinAllowedDirs($filePath, $allowedDirs, $allowAnyPath);
        AuditLogger::emit('file.read', ['filePath' => $filePath]);

        if (!file_exists($resolved) || !is_readable($resolved)) {
            throw new SecurityException("Failed to read file: '{$filePath}'");
        }

        $content = file_get_contents($resolved);

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
            CURLOPT_TIMEOUT => self::config()->curlTimeout,
            CURLOPT_CONNECTTIMEOUT => self::config()->curlConnectTimeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_RESOLVE => ["{$host}:{$port}:{$resolvedIp}"],
        ];

        return self::getHttpClient()->fetch($url, $curlOptions);
    }

    /**
     * Overrides the HTTP client used by {@see fetchUrl()}.
     *
     * Inject a test double here instead of relying on live network calls.
     *
     * @param HttpClientInterface $client Replacement HTTP client.
     */
    public static function setHttpClient(HttpClientInterface $client): void
    {
        self::$httpClient = $client;
    }

    /**
     * Resets the HTTP client to the default {@see CurlHttpClient}.
     */
    public static function resetHttpClient(): void
    {
        self::$httpClient = null;
    }

    /**
     * Returns the active HTTP client, lazily creating the default on first call.
     *
     * @return HttpClientInterface Active HTTP client.
     */
    private static function getHttpClient(): HttpClientInterface
    {
        return self::$httpClient ??= new CurlHttpClient();
    }

    /**
     * Overrides the DNS resolver used by {@see assertSafeUrl()}. Useful in tests.
     */
    public static function setDnsResolver(DnsResolverInterface $resolver): void
    {
        self::$dnsResolver = $resolver;
    }

    /**
     * Resets the DNS resolver to the default {@see NativeDnsResolver}.
     */
    public static function resetDnsResolver(): void
    {
        self::$dnsResolver = null;
    }

    /**
     * Returns the active DNS resolver, lazily creating the default on first call.
     *
     * @return DnsResolverInterface Active DNS resolver.
     */
    private static function getDnsResolver(): DnsResolverInterface
    {
        return self::$dnsResolver ??= new NativeDnsResolver();
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
            if (in_array($host, ['metadata.google.internal', 'instance-data', 'metadata.oracle.internal'], true)) {
                throw new SecurityException(
                    "Access to cloud metadata hostname '{$host}' is blocked."
                );
            }
        }

        // Resolve hostname to IP — try IPv4 first, then AAAA fallback
        $resolver = self::getDnsResolver();
        $ip = $resolver->resolveIPv4($host);

        if ($ip === $host) {
            // IPv4 resolution failed — try IPv6 AAAA records
            $ipv6 = $resolver->resolveIPv6($host);
            if ($ipv6 !== null) {
                if (!$allowPrivateIps && self::isPrivateIpv6($ipv6)) {
                    throw new SecurityException(
                        "Access to private/internal IPv6 '{$ipv6}' is blocked (SSRF protection)."
                    );
                }

                return $ipv6;
            }
        }

        if (!$allowPrivateIps && self::isPrivateIp($ip)) {
            throw new SecurityException(
                "Access to private/internal IP '{$ip}' is blocked (SSRF protection)."
            );
        }

        return $ip;
    }

    /**
     * Determines whether an IPv6 address falls within a private or reserved range.
     *
     * Covers: loopback (::1), link-local (fe80::/10), ULA (fc00::/7), and
     * IPv4-mapped (::ffff:0:0/96) ranges.
     *
     * @param  string $ip Normalized IPv6 address string.
     * @return bool True when the address is private or reserved.
     */
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

    /**
     * Determines whether an IPv4 address falls within a private or reserved range.
     *
     * Covers: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8,
     * 169.254.0.0/16, 0.0.0.0/8, and 100.64.0.0/10 (CGNAT — RFC 6598).
     * Invalid addresses return true (treated as private).
     *
     * @param  string $ip Dotted-decimal IPv4 address string.
     * @return bool True when the address is private, reserved, or invalid.
     */
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
            [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (link-local, AWS metadata)
            [0x00000000, 0x00ffffff], // 0.0.0.0/8
            [0x64400000, 0x647fffff], // 100.64.0.0/10 (CGNAT — RFC 6598)
        ];

        foreach ($ranges as [$start, $end]) {
            if ($long >= $start && $long <= $end) {
                return true;
            }
        }

        return false;
    }
}
