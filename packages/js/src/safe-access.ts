import { AbstractAccessor } from './core/abstract-accessor';
import { ArrayAccessor } from './accessors/array.accessor';
import { ObjectAccessor } from './accessors/object.accessor';
import { JsonAccessor } from './accessors/json.accessor';
import { XmlAccessor } from './accessors/xml.accessor';
import { YamlAccessor } from './accessors/yaml.accessor';
import { TomlAccessor } from './accessors/toml.accessor';
import { IniAccessor } from './accessors/ini.accessor';
import { EnvAccessor } from './accessors/env.accessor';
import { NdjsonAccessor } from './accessors/ndjson.accessor';
import { TypeDetector } from './core/rendering/type-detector';
import { InvalidFormatError } from './exceptions/invalid-format.error';
import { Format } from './enums/format.enum';
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
import { PathCache } from './core/resolvers/path-cache';
import { PluginRegistry } from './core/registries/plugin-registry';
import { DotNotationParser } from './core/parsers/dot-notation-parser';

/**
 * Primary façade for the safe-access-inline library.
 *
 * Provides static factory methods (`from`, `fromJson`, …),
 * format auto-detection, security policy management, and plugin registration.
 */
export class SafeAccess {
    // ── Unified Factory ─────────────────────────────

    /**
     * Creates an accessor for `data`, optionally targeted to a specific `format`.
     *
     * When `format` is omitted, {@link TypeDetector} auto-detects the data type.
     *
     * @param data - Raw data (string, array, or plain object).
     * @param format - Explicit format hint (e.g. `'json'`, `'yaml'`, `Format.Xml`).
     * @returns The appropriate format-specific accessor.
     * @throws {@link InvalidFormatError} When the format is unknown.
     */
    static from(data: unknown[], format: 'array'): ArrayAccessor;
    static from(data: string, format: 'json'): JsonAccessor;
    static from(data: string, format: 'xml'): XmlAccessor;
    static from(data: string, format: 'yaml'): YamlAccessor;
    static from(data: string, format: 'toml'): TomlAccessor;
    static from(data: string, format: 'ini'): IniAccessor;
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
            case 'env':
                return EnvAccessor.from(data as string);
            case 'ndjson':
                return NdjsonAccessor.from(data as string);
            default: {
                throw new InvalidFormatError(`Unknown format '${format}'. Use a known format.`);
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
     */
    static withPolicy(data: unknown, policy: SecurityPolicy): AbstractAccessor {
        if (typeof data === 'string' && policy.maxPayloadBytes) {
            assertPayloadSize(data, policy.maxPayloadBytes);
        }

        const accessor = TypeDetector.resolve(data);

        if (policy.maxKeys) {
            assertMaxKeys(accessor.all() as Record<string, unknown>, policy.maxKeys);
        }

        if (policy.maxDepth) {
            assertMaxStructuralDepth(accessor.all() as Record<string, unknown>, policy.maxDepth);
        }

        return accessor;
    }

    // ── Reset All ────────────────────────────────────

    /**
     * Resets all global/static state. Intended for test teardown.
     */
    static resetAll(): void {
        PathCache.clear();
        _clearGlobalPolicy();
        PluginRegistry.reset();
        DotNotationParser.resetConfig();
    }

    private constructor() {}
}
