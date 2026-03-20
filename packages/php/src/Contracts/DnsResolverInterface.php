<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Abstraction over PHP's native DNS-resolution functions.
 *
 * Extracted from {@see \SafeAccessInline\Core\Io\IoLoader} so that tests can
 * inject a deterministic resolver without relying on live DNS lookups.
 */
interface DnsResolverInterface
{
    /**
     * Resolves a hostname to its IPv4 address via A record lookup.
     *
     * Returns the host string unchanged when resolution fails (same contract
     * as PHP's built-in {@see gethostbyname()}).
     *
     * @param  string $host Hostname to resolve.
     * @return string Resolved IPv4 address, or `$host` if resolution failed.
     */
    public function resolveIPv4(string $host): string;

    /**
     * Resolves a hostname to an IPv6 address via AAAA record lookup.
     *
     * Returns `null` when no AAAA record is found or when the lookup fails.
     *
     * @param  string $host Hostname to resolve.
     * @return string|null Resolved IPv6 address, or `null` if resolution failed.
     */
    public function resolveIPv6(string $host): ?string;
}
