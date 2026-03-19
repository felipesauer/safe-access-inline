import { AbstractAccessor } from './core/abstract-accessor';
import { ArrayAccessor } from './accessors/array.accessor';
import { ObjectAccessor } from './accessors/object.accessor';
import { JsonAccessor } from './accessors/json.accessor';
import { XmlAccessor } from './accessors/xml.accessor';
import { YamlAccessor } from './accessors/yaml.accessor';
import { TomlAccessor } from './accessors/toml.accessor';
import { IniAccessor } from './accessors/ini.accessor';
import { CsvAccessor } from './accessors/csv.accessor';
import { EnvAccessor } from './accessors/env.accessor';
import { NdjsonAccessor } from './accessors/ndjson.accessor';
import { TypeDetector } from './core/rendering/type-detector';
import { InvalidFormatError } from './exceptions/invalid-format.error';
import { Format } from './enums/format.enum';
import { readFileSync, readFile, fetchUrl, resolveFormatFromExtension } from './core/io/io-loader';
import { deepMerge } from './core/operations/deep-merger';
import { watchFile } from './core/io/file-watcher';
import type { SecurityPolicy } from './security/guards/security-policy';
import {
    setGlobalPolicy as _setGlobalPolicy,
    clearGlobalPolicy as _clearGlobalPolicy,
} from './security/guards/security-policy';
import {
    assertPayloadSize,
    assertMaxKeys,
    assertMaxStructuralDepth,
} from './security/guards/security-options';
import { onAudit, clearAuditListeners } from './security/audit/audit-emitter';
import type { AuditListener } from './security/audit/audit-emitter';
import { PathCache } from './core/resolvers/path-cache';
import { PluginRegistry } from './core/registries/plugin-registry';
import { SchemaRegistry } from './core/registries/schema-registry';
import { FilterParser } from './core/parsers/filter-parser';
import { resetIoLoaderConfig } from './core/io/io-loader';
import { DEFAULT_SAFE_ACCESS_CONFIG } from './core/config/safe-access-config';

/**
 * Primary façade for the safe-access-inline library.
 *
 * Provides static factory methods (`from`, `fromJson`, `fromFile`, `fromUrl`, …),
 * format auto-detection, layered configuration, security policy management,
 * file watching, audit listeners, and a custom-accessor extension point.
 */
export class SafeAccess {
    private static customAccessors = new Map<string, new (data: unknown) => AbstractAccessor>();

    // ── Unified Factory ─────────────────────────────

    /**
     * Creates an accessor for `data`, optionally targeted to a specific `format`.
     *
     * When `format` is omitted, {@link TypeDetector} auto-detects the data type.
     * Custom accessors registered via {@link extend} are tried last.
     *
     * @param data - Raw data (string, array, or plain object).
     * @param format - Explicit format hint (e.g. `'json'`, `'yaml'`, `Format.Xml`).
     * @returns The appropriate format-specific accessor.
     * @throws {@link InvalidFormatError} When the format is unknown.
     */
    static from(data: unknown[], format: 'array'): ArrayAccessor;
    static from(data: Record<string, unknown>, format: 'object'): ObjectAccessor;
    static from(data: string, format: 'json'): JsonAccessor;
    static from(data: string, format: 'xml'): XmlAccessor;
    static from(data: string, format: 'yaml'): YamlAccessor;
    static from(data: string, format: 'toml'): TomlAccessor;
    static from(data: string, format: 'ini'): IniAccessor;
    static from(data: string, format: 'csv'): CsvAccessor;
    static from(data: string, format: 'env'): EnvAccessor;
    static from(data: string, format: 'ndjson'): NdjsonAccessor;
    static from(data: unknown, format: string): AbstractAccessor;
    static from(data: unknown): AbstractAccessor;
    static from(data: unknown[], format: Format.Array): ArrayAccessor;
    static from(data: Record<string, unknown>, format: Format.Object): ObjectAccessor;
    static from(data: string, format: Format.Json): JsonAccessor;
    static from(data: string, format: Format.Xml): XmlAccessor;
    static from(data: string, format: Format.Yaml): YamlAccessor;
    static from(data: string, format: Format.Toml): TomlAccessor;
    static from(data: string, format: Format.Ini): IniAccessor;
    static from(data: string, format: Format.Csv): CsvAccessor;
    static from(data: string, format: Format.Env): EnvAccessor;
    static from(data: string, format: Format.Ndjson): NdjsonAccessor;
    static from(data: unknown, format?: string | Format): AbstractAccessor {
        if (!format) {
            return TypeDetector.resolve(data);
        }

        switch (format) {
            case 'array':
                return ArrayAccessor.from(data as unknown[]);
            case 'object':
                return ObjectAccessor.from(data as Record<string, unknown>);
            case 'json':
                return JsonAccessor.from(data as string);
            case 'xml':
                return XmlAccessor.from(data as string);
            case 'yaml':
                return YamlAccessor.from(data as string);
            case 'toml':
                return TomlAccessor.from(data as string);
            case 'ini':
                return IniAccessor.from(data as string);
            case 'csv':
                return CsvAccessor.from(data as string);
            case 'env':
                return EnvAccessor.from(data as string);
            case 'ndjson':
                return NdjsonAccessor.from(data as string);
            default: {
                const Cls = SafeAccess.customAccessors.get(format);
                if (Cls) return new Cls(data);
                throw new InvalidFormatError(
                    `Unknown format '${format}'. Use a known format or register a custom accessor via SafeAccess.extend().`,
                );
            }
        }
    }

    // ── Typed Factories ──────────────────────────────

    /** Creates a typed {@link ArrayAccessor} from an array. */
    static fromArray<T extends Record<string, unknown> = Record<string, unknown>>(
        data: unknown[],
        options?: { readonly?: boolean },
    ): ArrayAccessor<T> {
        return new ArrayAccessor(data, options) as ArrayAccessor<T>;
    }

    /** Creates a typed {@link ObjectAccessor} from a plain object. */
    static fromObject<T extends Record<string, unknown> = Record<string, unknown>>(
        data: Record<string, unknown>,
        options?: { readonly?: boolean },
    ): ObjectAccessor<T> {
        return new ObjectAccessor(data, options) as ObjectAccessor<T>;
    }

    /** Creates a typed {@link JsonAccessor} from a JSON string. */
    static fromJson<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): JsonAccessor<T> {
        return new JsonAccessor(data, options) as JsonAccessor<T>;
    }

    /** Creates a typed {@link XmlAccessor} from an XML string. */
    static fromXml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): XmlAccessor<T> {
        return new XmlAccessor(data, options) as XmlAccessor<T>;
    }

    /** Creates a typed {@link YamlAccessor} from a YAML string. */
    static fromYaml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): YamlAccessor<T> {
        return new YamlAccessor(data, options) as YamlAccessor<T>;
    }

    /** Creates a typed {@link TomlAccessor} from a TOML string. */
    static fromToml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): TomlAccessor<T> {
        return new TomlAccessor(data, options) as TomlAccessor<T>;
    }

    /** Creates a typed {@link IniAccessor} from an INI-format string. */
    static fromIni<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): IniAccessor<T> {
        return new IniAccessor(data, options) as IniAccessor<T>;
    }

    /** Creates a typed {@link CsvAccessor} from a CSV string. */
    static fromCsv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): CsvAccessor<T> {
        return new CsvAccessor(data, options) as CsvAccessor<T>;
    }

    /** Creates a typed {@link EnvAccessor} from a `.env`-format string. */
    static fromEnv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): EnvAccessor<T> {
        return new EnvAccessor(data, options) as EnvAccessor<T>;
    }

    /** Creates a typed {@link NdjsonAccessor} from a newline-delimited JSON string. */
    static fromNdjson<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): NdjsonAccessor<T> {
        return new NdjsonAccessor(data, options) as NdjsonAccessor<T>;
    }

    /** Auto-detects the data format and returns the matching accessor. */
    static detect(data: unknown): AbstractAccessor {
        return TypeDetector.resolve(data);
    }

    private static readonly MAX_CUSTOM_ACCESSORS = DEFAULT_SAFE_ACCESS_CONFIG.maxCustomAccessors;

    /**
     * Registers a custom accessor class under a format `name`.
     *
     * @throws {RangeError} When the maximum number of custom accessors is reached.
     */
    static extend(name: string, cls: new (data: unknown) => AbstractAccessor): void {
        if (SafeAccess.customAccessors.size >= SafeAccess.MAX_CUSTOM_ACCESSORS) {
            throw new RangeError(
                `Maximum custom accessor count (${SafeAccess.MAX_CUSTOM_ACCESSORS}) reached.`,
            );
        }
        SafeAccess.customAccessors.set(name, cls);
    }

    /** Removes all custom accessors registered via {@link extend}. */
    static clearCustomAccessors(): void {
        SafeAccess.customAccessors.clear();
    }

    /** Instantiates a previously registered custom accessor by `name`. */
    static custom(name: string, data: unknown): AbstractAccessor {
        const Cls = SafeAccess.customAccessors.get(name);
        if (!Cls) throw new Error(`Custom accessor '${name}' is not registered.`);
        return new Cls(data);
    }

    // ── File/URL I/O ─────────────────────────────────

    /**
     * Reads a file synchronously and returns an accessor.
     *
     * The format is inferred from the file extension unless explicitly provided.
     * Path-traversal protection requires `allowedDirs` or `allowAnyPath: true`.
     *
     * @throws {@link SecurityError} When the file is outside allowed directories.
     */
    static fromFileSync(
        filePath: string,
        options?: { format?: string | Format; allowedDirs?: string[]; allowAnyPath?: boolean },
    ): AbstractAccessor {
        const content = readFileSync(filePath, {
            allowedDirs: options?.allowedDirs,
            allowAnyPath: options?.allowAnyPath,
        });
        const format = options?.format ?? resolveFormatFromExtension(filePath);
        if (!format) {
            return TypeDetector.resolve(content);
        }
        return SafeAccess.from(content, format as string);
    }

    /**
     * Reads a file asynchronously and returns an accessor.
     *
     * @throws {@link SecurityError} When the file is outside allowed directories.
     */
    static async fromFile(
        filePath: string,
        options?: { format?: string | Format; allowedDirs?: string[]; allowAnyPath?: boolean },
    ): Promise<AbstractAccessor> {
        const content = await readFile(filePath, {
            allowedDirs: options?.allowedDirs,
            allowAnyPath: options?.allowAnyPath,
        });
        const format = options?.format ?? resolveFormatFromExtension(filePath);
        if (!format) {
            return TypeDetector.resolve(content);
        }
        return SafeAccess.from(content, format as string);
    }

    /**
     * Fetches a URL over HTTPS with SSRF protection and returns an accessor.
     *
     * Format is inferred from the URL path extension unless explicitly provided.
     *
     * @throws {@link SecurityError} On any network-policy violation.
     */
    static async fromUrl(
        url: string,
        options?: {
            format?: string | Format;
            allowPrivateIps?: boolean;
            allowedHosts?: string[];
            allowedPorts?: number[];
        },
    ): Promise<AbstractAccessor> {
        const { format, ...fetchOpts } = options ?? {};
        const content = await fetchUrl(url, fetchOpts);
        if (format) {
            return SafeAccess.from(content, format as string);
        }
        // Try to resolve format from URL path
        const urlPath = new URL(url).pathname;
        const detectedFormat = resolveFormatFromExtension(urlPath);
        if (detectedFormat) {
            return SafeAccess.from(content, detectedFormat as string);
        }
        return TypeDetector.resolve(content);
    }

    // ── Layered Config ───────────────────────────────

    /** Deep-merges multiple accessors into a single {@link ObjectAccessor} (last wins). */
    static layer(sources: AbstractAccessor[]): AbstractAccessor {
        if (sources.length === 0) {
            return ObjectAccessor.from({});
        }
        const merged = deepMerge(
            sources[0].toObject(),
            ...sources.slice(1).map((s) => s.toObject()),
        );
        return ObjectAccessor.from(merged);
    }

    /** Reads multiple files and deep-merges them in order (last wins). */
    static async layerFiles(
        paths: string[],
        options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
    ): Promise<AbstractAccessor> {
        const accessors = await Promise.all(
            paths.map((p) =>
                SafeAccess.fromFile(p, {
                    allowedDirs: options?.allowedDirs,
                    allowAnyPath: options?.allowAnyPath,
                }),
            ),
        );
        return SafeAccess.layer(accessors);
    }

    // ── File Watcher ─────────────────────────────────

    /** Watches a file for changes and re-parses it on each change. Returns an unsubscribe function. */
    static watchFile(
        filePath: string,
        onChange: (accessor: AbstractAccessor) => void,
        options?: { format?: string | Format; allowedDirs?: string[]; allowAnyPath?: boolean },
    ): () => void {
        return watchFile(filePath, () => {
            const accessor = SafeAccess.fromFileSync(filePath, options);
            onChange(accessor);
        });
    }

    // ── SecurityPolicy ───────────────────────────────

    /** Installs a process-wide security policy for all subsequent operations. */
    static setGlobalPolicy(policy: SecurityPolicy): void {
        _setGlobalPolicy(policy);
    }

    /** Removes the global security policy. */
    static clearGlobalPolicy(): void {
        _clearGlobalPolicy();
    }

    /**
     * Parses `data` and validates it against `policy` limits (payload size, key count, depth).
     *
     * If `policy.maskPatterns` is set, sensitive keys are masked in the returned accessor.
     */
    static withPolicy(data: unknown, policy: SecurityPolicy): AbstractAccessor {
        if (typeof data === 'string' && policy.maxPayloadBytes) {
            assertPayloadSize(data, policy.maxPayloadBytes);
        }

        let accessor = TypeDetector.resolve(data);

        if (policy.maxKeys) {
            assertMaxKeys(accessor.toObject(), policy.maxKeys);
        }

        if (policy.maxDepth) {
            assertMaxStructuralDepth(accessor.toObject(), policy.maxDepth);
        }

        if (policy.maskPatterns && policy.maskPatterns.length > 0) {
            accessor = accessor.masked(policy.maskPatterns);
        }

        return accessor;
    }

    /** Reads a file with path-traversal protection and key/mask policy enforcement. */
    static async fromFileWithPolicy(
        filePath: string,
        policy: SecurityPolicy,
    ): Promise<AbstractAccessor> {
        let accessor = await SafeAccess.fromFile(filePath, {
            allowedDirs: policy.allowedDirs,
        });

        if (policy.maxKeys) {
            assertMaxKeys(accessor.toObject(), policy.maxKeys);
        }

        if (policy.maskPatterns && policy.maskPatterns.length > 0) {
            accessor = accessor.masked(policy.maskPatterns);
        }

        return accessor;
    }

    /** Fetches a URL with SSRF + payload-size + key/mask policy enforcement. */
    static async fromUrlWithPolicy(url: string, policy: SecurityPolicy): Promise<AbstractAccessor> {
        // Fetch raw text first so payload size is checked against actual HTTP bytes, not re-serialized JSON
        const rawText = await fetchUrl(url, {
            allowPrivateIps: policy.url?.allowPrivateIps,
            allowedHosts: policy.url?.allowedHosts,
            allowedPorts: policy.url?.allowedPorts,
        });

        if (policy.maxPayloadBytes) {
            assertPayloadSize(rawText, policy.maxPayloadBytes);
        }

        // Resolve format from URL path extension, then parse
        const urlPath = new URL(url).pathname;
        const detectedFormat = resolveFormatFromExtension(urlPath);
        let accessor = detectedFormat
            ? SafeAccess.from(rawText, detectedFormat as string)
            : TypeDetector.resolve(rawText);

        if (policy.maxKeys) {
            assertMaxKeys(accessor.toObject(), policy.maxKeys);
        }

        if (policy.maskPatterns && policy.maskPatterns.length > 0) {
            accessor = accessor.masked(policy.maskPatterns);
        }

        return accessor;
    }

    // ── Audit ────────────────────────────────────────

    /** Registers an audit listener invoked on every auditable operation. */
    static onAudit(listener: AuditListener): () => void {
        return onAudit(listener);
    }

    /** Removes all audit listeners. */
    static clearAuditListeners(): void {
        clearAuditListeners();
    }

    // ── Reset All ────────────────────────────────────

    /**
     * Resets all global/static state. Intended for test teardown.
     */
    static resetAll(): void {
        SafeAccess.customAccessors.clear();
        PathCache.clear();
        clearAuditListeners();
        _clearGlobalPolicy();
        PluginRegistry.reset();
        SchemaRegistry.clearDefaultAdapter();
        FilterParser.resetConfig();
        resetIoLoaderConfig();
    }

    private constructor() {}
}
