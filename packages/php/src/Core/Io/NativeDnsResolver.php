<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Io;

use SafeAccessInline\Contracts\DnsResolverInterface;

/**
 * Default DNS resolver that delegates to PHP's native functions.
 *
 * Used by {@see IoLoader} when no custom resolver has been injected.
 * Delegates to {@see gethostbyname()} for IPv4 and {@see dns_get_record()}
 * for IPv6 AAAA record lookups.
 */
class NativeDnsResolver implements DnsResolverInterface
{
    /**
     * Resolves a hostname to an IPv4 address using {@see gethostbyname()}.
     *
     * Returns the host unchanged when resolution fails, mirroring the built-in
     * function's failure contract.
     *
     * @param  string $host Hostname to resolve.
     * @return string Resolved IPv4 address, or `$host` if resolution failed.
     */
    public function resolveIPv4(string $host): string
    {
        return gethostbyname($host);
    }

    /**
     * Resolves a hostname to an IPv6 address via AAAA DNS record lookup.
     *
     * Errors from {@see dns_get_record()} are silenced with `@` to keep
     * SSRF-guard logic deterministic regardless of the DNS environment.
     *
     * @param  string $host Hostname to resolve.
     * @return string|null Resolved IPv6 address, or `null` if resolution failed.
     */
    public function resolveIPv6(string $host): ?string
    {
        $records = $this->dnsGetRecord($host);
        if (is_array($records) && count($records) > 0 && isset($records[0]['ipv6'])) {
            return $records[0]['ipv6'];
        }
        return null;
    }

    /**
     * Calls {@see dns_get_record()} for AAAA records.
     * Extracted as a protected method so tests can override it to return fixtures.
     *
     * @return array<mixed>|false
     */
    protected function dnsGetRecord(string $host): array|false
    {
        return @dns_get_record($host, DNS_AAAA);
    }
}
