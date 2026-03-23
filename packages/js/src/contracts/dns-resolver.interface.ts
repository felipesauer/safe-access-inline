/**
 * Injectable DNS resolver contract for the IoLoader.
 *
 * Providing a custom implementation enables full control over DNS resolution
 * in tests (mocks, deterministic responses) and production environments
 * (corporate DNS, split-horizon resolution, custom SSRF rules, etc.).
 *
 * The default implementation delegates to Node.js `dns/promises` with the same
 * SSRF protection applied regardless of which resolver is injected.
 *
 * @remarks
 * The PHP counterpart is `DnsResolverInterface` in
 * `src/Contracts/DnsResolverInterface.php`, with methods `resolveIPv4()` and
 * `resolveIPv6()`. This interface mirrors the Node.js `dns/promises` API shape
 * so that the native resolver satisfies it without adaptation.
 *
 * @example
 * ```typescript
 * // Mock DNS resolver for testing SSRF protection
 * const mockResolver: DnsResolverInterface = {
 *   async resolve(hostname) {
 *     if (hostname === 'trusted.internal') return ['10.0.0.5'];
 *     return ['93.184.216.34'];
 *   },
 *   async resolve4(hostname) {
 *     return this.resolve(hostname);
 *   },
 * };
 *
 * configureIoLoader({ dnsResolver: mockResolver });
 * ```
 */
export interface DnsResolverInterface {
    /**
     * Resolves `hostname` to an array of IP address strings (IPv4 or IPv6).
     *
     * Used as the primary resolution path when `resolve4` and `resolve6` are
     * not provided.
     *
     * @param hostname - The hostname to resolve (e.g. `'example.com'`).
     * @returns A promise resolving to an array of IP address strings.
     */
    resolve(hostname: string): Promise<string[]>;

    /**
     * Resolves `hostname` to an array of IPv4 address strings (A records).
     *
     * When provided, this method is preferred over {@link resolve} for IPv4
     * lookups directly matching the SSRF validation path.
     *
     * @param hostname - The hostname to resolve.
     * @returns A promise resolving to an array of dotted-decimal IPv4 strings.
     */
    resolve4?(hostname: string): Promise<string[]>;

    /**
     * Resolves `hostname` to an array of IPv6 address strings (AAAA records).
     *
     * When provided, this method is used for IPv6 SSRF validation.
     *
     * @param hostname - The hostname to resolve.
     * @returns A promise resolving to an array of IPv6 address strings.
     */
    resolve6?(hostname: string): Promise<string[]>;
}
