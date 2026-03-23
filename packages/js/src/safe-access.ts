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
import { SecurityError } from './exceptions/security.error';
import { Format } from './enums/format.enum';
import {
    readFileSync,
    readFile,
    fetchUrl,
    resolveFormatFromExtension,
    assertPathWithinAllowedDirs,
} from './core/io/io-loader';
import type { FileLoadOptions } from './contracts/file-load-options.interface';
import { streamLines, parseCsvLine } from './core/io/stream-reader';
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
import { DotNotationParser } from './core/parsers/dot-notation-parser';
import { resetIoLoaderConfig } from './core/io/io-loader';
import { DEFAULT_SAFE_ACCESS_CONFIG } from './core/config/safe-access-config';
import { renderTemplate } from './core/rendering/template-renderer';
import { CompiledPath } from './types/compiled-path';

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

    /**
     * Creates a typed {@link ArrayAccessor} from an array.
     *
     * @param data - Source array.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link ArrayAccessor}.
     */
    static fromArray<T extends Record<string, unknown> = Record<string, unknown>>(
        data: unknown[],
        options?: { readonly?: boolean },
    ): ArrayAccessor<T> {
        return new ArrayAccessor(data, options) as ArrayAccessor<T>;
    }

    /**
     * Creates a typed {@link ObjectAccessor} from a plain object.
     *
     * @param data - Source plain object.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link ObjectAccessor}.
     */
    static fromObject<T extends Record<string, unknown> = Record<string, unknown>>(
        data: Record<string, unknown>,
        options?: { readonly?: boolean },
    ): ObjectAccessor<T> {
        return new ObjectAccessor(data, options) as ObjectAccessor<T>;
    }

    /**
     * Creates a typed {@link JsonAccessor} from a JSON string.
     *
     * @param data - JSON-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link JsonAccessor}.
     */
    static fromJson<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): JsonAccessor<T> {
        return new JsonAccessor(data, options) as JsonAccessor<T>;
    }

    /**
     * Creates a typed {@link XmlAccessor} from an XML string.
     *
     * @param data - XML-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link XmlAccessor}.
     */
    static fromXml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): XmlAccessor<T> {
        return new XmlAccessor(data, options) as XmlAccessor<T>;
    }

    /**
     * Creates a typed {@link YamlAccessor} from a YAML string.
     *
     * @param data - YAML-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link YamlAccessor}.
     */
    static fromYaml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): YamlAccessor<T> {
        return new YamlAccessor(data, options) as YamlAccessor<T>;
    }

    /**
     * Creates a typed {@link TomlAccessor} from a TOML string.
     *
     * @param data - TOML-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link TomlAccessor}.
     */
    static fromToml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): TomlAccessor<T> {
        return new TomlAccessor(data, options) as TomlAccessor<T>;
    }

    /**
     * Creates a typed {@link IniAccessor} from an INI-format string.
     *
     * @param data - INI-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link IniAccessor}.
     */
    static fromIni<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): IniAccessor<T> {
        return new IniAccessor(data, options) as IniAccessor<T>;
    }

    /**
     * Creates a typed {@link CsvAccessor} from a CSV string.
     *
     * @param data - CSV-encoded string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link CsvAccessor}.
     */
    static fromCsv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): CsvAccessor<T> {
        return new CsvAccessor(data, options) as CsvAccessor<T>;
    }

    /**
     * Creates a typed {@link EnvAccessor} from a `.env`-format string.
     *
     * @param data - `.env`-format string.
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link EnvAccessor}.
     */
    static fromEnv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): EnvAccessor<T> {
        return new EnvAccessor(data, options) as EnvAccessor<T>;
    }

    /**
     * Creates a typed {@link NdjsonAccessor} from a newline-delimited JSON string.
     *
     * @param data - NDJSON-encoded string (one JSON object per line).
     * @param options - Optional configuration (`readonly: true` freezes the accessor).
     * @returns A typed {@link NdjsonAccessor}.
     */
    static fromNdjson<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
        options?: { readonly?: boolean },
    ): NdjsonAccessor<T> {
        return new NdjsonAccessor(data, options) as NdjsonAccessor<T>;
    }

    /**
     * Auto-detects the data format and returns the matching accessor.
     *
     * @param data - Raw input (array, plain object, or format string).
     * @returns The appropriate format-specific accessor.
     * @throws {@link UnsupportedTypeError} When the format cannot be determined.
     */
    static detect(data: unknown): AbstractAccessor {
        return TypeDetector.resolve(data);
    }

    private static readonly MAX_CUSTOM_ACCESSORS = DEFAULT_SAFE_ACCESS_CONFIG.maxCustomAccessors;

    /**
     * Registers a custom accessor class under a format `name`.
     *
     * @param name - Format identifier to register (e.g. `'my-format'`).
     * @param cls - Constructor of the custom accessor class.
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

    /**
     * Removes all custom accessors registered via {@link extend}.
     */
    static clearCustomAccessors(): void {
        SafeAccess.customAccessors.clear();
    }

    /**
     * Instantiates a previously registered custom accessor by `name`.
     *
     * @param name - Format identifier of the registered custom accessor.
     * @param data - Raw data to pass to the accessor constructor.
     * @returns A new accessor instance of the registered type.
     * @throws {@link Error} When no custom accessor is registered under `name`.
     */
    static custom(name: string, data: unknown): AbstractAccessor {
        const Cls = SafeAccess.customAccessors.get(name);
        if (!Cls) throw new Error(`Custom accessor '${name}' is not registered.`);
        return new Cls(data);
    }

    // ── File/URL I/O ─────────────────────────────────

    /**
     * Validates `filePath` against the `allowedExtensions` list in `options`.
     *
     * @throws {@link SecurityError} When the extension is not permitted.
     */
    private static assertAllowedExtension(filePath: string, allowedExtensions?: string[]): void {
        if (!allowedExtensions || allowedExtensions.length === 0) return;
        const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.map((e) => e.toLowerCase()).includes(ext)) {
            throw new SecurityError(
                `File extension '${ext}' is not in the allowed list: [${allowedExtensions.join(', ')}].`,
            );
        }
    }

    /**
     * Reads a file synchronously and returns an accessor.
     *
     * The format is inferred from the file extension unless explicitly provided.
     * Path-traversal protection requires `allowedDirs` or `allowAnyPath: true`.
     *
     * Accepts either a {@link FileLoadOptions} object or the legacy inline options shape
     * (both have the same structure — all previous call-sites continue working).
     *
     * @param filePath - Path to the file.
     * @param options - Optional {@link FileLoadOptions} controlling format, path restrictions,
     *   extension allowlist, and maximum file size.
     * @throws {@link SecurityError} When the file is outside allowed directories or the
     *   extension/size constraints are violated.
     */
    static fromFileSync(filePath: string, options?: FileLoadOptions): AbstractAccessor {
        SafeAccess.assertAllowedExtension(filePath, options?.allowedExtensions);
        const content = readFileSync(filePath, {
            allowedDirs: options?.allowedDirs,
            allowAnyPath: options?.allowAnyPath,
        });
        if (options?.maxSize && options.maxSize > 0) {
            assertPayloadSize(content, options.maxSize);
        }
        const format = options?.format ?? resolveFormatFromExtension(filePath);
        if (!format) {
            return TypeDetector.resolve(content);
        }
        return SafeAccess.from(content, format as string);
    }

    /**
     * Reads a file asynchronously and returns an accessor.
     *
     * Accepts either a {@link FileLoadOptions} object or the legacy inline options shape
     * (both have the same structure — all previous call-sites continue working).
     *
     * @param filePath - Path to the file.
     * @param options - Optional {@link FileLoadOptions} controlling format, path restrictions,
     *   extension allowlist, and maximum file size.
     * @throws {@link SecurityError} When the file is outside allowed directories or the
     *   extension/size constraints are violated.
     */
    static async fromFile(filePath: string, options?: FileLoadOptions): Promise<AbstractAccessor> {
        SafeAccess.assertAllowedExtension(filePath, options?.allowedExtensions);
        const content = await readFile(filePath, {
            allowedDirs: options?.allowedDirs,
            allowAnyPath: options?.allowAnyPath,
        });
        if (options?.maxSize && options.maxSize > 0) {
            assertPayloadSize(content, options.maxSize);
        }
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

    /**
     * Deep-merges multiple accessors into a single {@link ObjectAccessor} (last wins).
     *
     * @param sources - Accessors to merge in order (later entries override earlier ones).
     * @returns A new {@link ObjectAccessor} containing the merged data.
     */
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

    /**
     * Reads multiple files and deep-merges them in order (last wins).
     *
     * @param paths - File paths to read and merge.
     * @param options - Optional path restriction options.
     * @returns A new accessor containing the merged data.
     */
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

    /**
     * Watches a file for changes and re-parses it on each change.
     *
     * @param filePath - Path to the file to watch.
     * @param onChange - Callback invoked with a new accessor on each file change.
     * @param options - Optional format and path restriction options.
     * @returns An unsubscribe function; call it to stop watching.
     */
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
    // ── Streaming ─────────────────────────────────────────

    /**
     * Streams a CSV file line by line, yielding one {@link ObjectAccessor} per data row.
     *
     * The first line is treated as the header row. Memory usage is proportional to a single
     * row, not the entire file. The underlying file handle is closed automatically even if
     * the consumer breaks out of the `for await` loop early.
     *
     * @param filePath - Path to the CSV file.
     * @param options  - Optional path-restriction options.
     * @returns AsyncGenerator yielding an {@link ObjectAccessor} for each data row.
     * @throws {@link SecurityError} When the path violates any constraint.
     */
    static async *streamCsv(
        filePath: string,
        options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
    ): AsyncGenerator<ObjectAccessor> {
        const resolved = assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
            allowAnyPath: options?.allowAnyPath,
        });
        let headers: string[] | null = null;
        for await (const line of streamLines(resolved)) {
            if (line.trim() === '') continue;
            if (headers === null) {
                headers = parseCsvLine(line);
                continue;
            }
            const values = parseCsvLine(line);
            const row: Record<string, unknown> = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i]] = i < values.length ? values[i] : null;
            }
            yield ObjectAccessor.from(row);
        }
    }

    /**
     * Streams an NDJSON file line by line, yielding one {@link JsonAccessor} per JSON line.
     *
     * Empty lines are skipped. The underlying file handle is closed automatically even if
     * the consumer breaks out of the `for await` loop early.
     *
     * @param filePath - Path to the NDJSON file.
     * @param options  - Optional path-restriction options.
     * @returns AsyncGenerator yielding a {@link JsonAccessor} for each JSON line.
     * @throws {@link SecurityError} When the path violates any constraint.
     */
    static async *streamNdjson(
        filePath: string,
        options?: { allowedDirs?: string[]; allowAnyPath?: boolean },
    ): AsyncGenerator<JsonAccessor> {
        const resolved = assertPathWithinAllowedDirs(filePath, options?.allowedDirs, {
            allowAnyPath: options?.allowAnyPath,
        });
        for await (const line of streamLines(resolved)) {
            if (line.trim() === '') continue;
            yield JsonAccessor.from(line);
        }
    }
    // ── SecurityPolicy ───────────────────────────────

    /**
     * Installs a process-wide security policy for all subsequent operations.
     *
     * @param policy - The security policy to apply globally.
     */
    static setGlobalPolicy(policy: SecurityPolicy): void {
        _setGlobalPolicy(policy);
    }

    /**
     * Removes the global security policy.
     */
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
            accessor = accessor.mask(policy.maskPatterns);
        }

        return accessor;
    }

    /**
     * Reads a file with path-traversal protection and key/mask policy enforcement.
     *
     * @param filePath - Path of the file to read.
     * @param policy - Security policy to apply (allowedDirs, maxKeys, maskPatterns).
     * @returns A new accessor with policy checks applied.
     * @throws {@link SecurityError} When the file is outside allowed directories.
     */
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
            accessor = accessor.mask(policy.maskPatterns);
        }

        return accessor;
    }

    /**
     * Fetches a URL with SSRF, payload-size, and key/mask policy enforcement.
     *
     * @param url - URL to fetch.
     * @param policy - Security policy to apply (SSRF protection, maxPayloadBytes, maxKeys, maskPatterns).
     * @returns A new accessor with policy checks applied.
     * @throws {@link SecurityError} On any network-policy violation.
     */
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
            accessor = accessor.mask(policy.maskPatterns);
        }

        return accessor;
    }

    // ── Path Utilities ──────────────────────────────

    /**
     * Pre-compiles a dot-notation path into a {@link CompiledPath} for repeated use.
     *
     * The returned object can be passed to {@link AbstractAccessor.getCompiled} to resolve
     * values without re-parsing the path on each call. Combine with a tight loop or
     * repeated access against different accessors for maximum throughput.
     *
     * @param path - Dot-notation path to compile.
     * @returns A pre-compiled path object.
     */
    static compilePath(path: string): CompiledPath {
        return new CompiledPath(DotNotationParser.getSegments(path));
    }

    /**
     * Resolves a template path by substituting `{key}` placeholders with the
     * provided bindings, returning the rendered dot-notation path string.
     *
     * This is a pure path-rendering utility — it does **not** access any data.
     * To render a template path and then retrieve a value, call
     * {@link AbstractAccessor.getTemplate} on an accessor instance instead.
     *
     * @example
     * ```ts
     * SafeAccess.getTemplate('users.{id}.name', { id: 42 });
     * // → 'users.42.name'
     * ```
     *
     * @param template - Template string with `{key}` placeholders.
     * @param bindings - Key-value pairs to substitute.
     * @returns Rendered dot-notation path string.
     * @throws {Error} When a placeholder key is not present in `bindings`.
     */
    static getTemplate(template: string, bindings: Record<string, string | number>): string {
        return renderTemplate(template, bindings);
    }

    // ── Audit ────────────────────────────────────────

    /**
     * Registers an audit listener invoked on every auditable operation.
     *
     * @param listener - Callback to receive {@link AuditEvent} objects.
     * @returns An unsubscribe function; call it to remove the listener.
     */
    static onAudit(listener: AuditListener): () => void {
        return onAudit(listener);
    }

    /**
     * Removes all audit listeners.
     */
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
        DotNotationParser.resetConfig();
        resetIoLoaderConfig();
    }

    private constructor() {}
}
