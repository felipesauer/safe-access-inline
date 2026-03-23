<?php

declare(strict_types=1);

namespace SafeAccessInline\Security\Guards;

/**
 * Utility class for IPv4 and IPv6 private/reserved range detection.
 *
 * All checks are static and side-effect-free. The class is `final` to prevent
 * subclasses from weakening security guarantees.
 *
 * ## Covered ranges
 *
 * ### IPv4
 * - RFC 1918 private: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 * - Loopback: 127.0.0.0/8
 * - Link-local: 169.254.0.0/16 (AWS/GCP metadata endpoint lives here)
 * - This-host: 0.0.0.0/8
 * - CGNAT: 100.64.0.0/10 (RFC 6598)
 *
 * ### IPv6
 * - Loopback: ::1, 0:0:0:0:0:0:0:1
 * - Link-local: fe80::/10 (fe80::–febf::)
 * - Unique Local Address (ULA): fc00::/7 (fc00:: and fd00::)
 * - IPv4-mapped: ::ffff:0:0/96 (delegates to {@see isPrivateIpv4})
 *
 * @see IoLoader Uses this class for SSRF protection in {@see IoLoader::assertSafeUrl()}.
 */
final class IpRangeChecker
{
    /**
     * Determines whether an IPv4 address falls within a private or reserved range.
     *
     * Covers: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8,
     * 169.254.0.0/16, 0.0.0.0/8, and 100.64.0.0/10 (CGNAT — RFC 6598).
     * Invalid addresses return `true` (treated as private for fail-safe behaviour).
     *
     * @param  string $ip Dotted-decimal IPv4 address string (e.g. `'192.168.1.1'`).
     * @return bool `true` when the address is private, reserved, or invalid.
     */
    public static function isPrivateIpv4(string $ip): bool
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

    /**
     * Determines whether an IPv6 address falls within a private or reserved range.
     *
     * Covers: loopback (::1), link-local (fe80::/10), ULA (fc00::/7), and
     * IPv4-mapped (::ffff:0:0/96) ranges.
     *
     * @param  string $ip Normalized IPv6 address string (e.g. `'::1'`, `'fe80::1'`).
     * @return bool `true` when the address is private or reserved.
     */
    public static function isPrivateIpv6(string $ip): bool
    {
        $lower = strtolower($ip);

        // ::1 loopback
        if ($lower === '::1' || $lower === '0:0:0:0:0:0:0:1') {
            return true;
        }

        // fe80::/10 link-local — full range fe80::–febf::
        // The /10 prefix covers second bytes 0x80–0xbf: fe8x, fe9x, feax, febx
        if (preg_match('/^fe[89ab][0-9a-f]:/i', $lower) === 1) {
            return true;
        }

        // fc00::/7 ULA (unique local addresses): fd00::/8 and fc00::/8
        if (preg_match('/^f[cd][0-9a-f]{0,2}:/i', $lower) === 1) {
            return true;
        }

        // ::ffff:0:0/96 IPv4-mapped — check the mapped IPv4 address
        if (str_starts_with($lower, '::ffff:')) {
            $mappedIp = substr($lower, 7);
            return self::isPrivateIpv4($mappedIp);
        }

        return false;
    }
}
