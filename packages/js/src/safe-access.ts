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
import { TypeDetector } from './core/type-detector';
import { InvalidFormatError } from './exceptions/invalid-format.error';
import { Format } from './format.enum';

export class SafeAccess {
    private static customAccessors = new Map<string, new (data: unknown) => AbstractAccessor>();

    // ── Unified Factory ─────────────────────────────

    static from(data: unknown[], format: 'array'): ArrayAccessor;
    static from(data: Record<string, unknown>, format: 'object'): ObjectAccessor;
    static from(data: string, format: 'json'): JsonAccessor;
    static from(data: string, format: 'xml'): XmlAccessor;
    static from(data: string, format: 'yaml'): YamlAccessor;
    static from(data: string, format: 'toml'): TomlAccessor;
    static from(data: string, format: 'ini'): IniAccessor;
    static from(data: string, format: 'csv'): CsvAccessor;
    static from(data: string, format: 'env'): EnvAccessor;
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

    static fromArray<T extends Record<string, unknown> = Record<string, unknown>>(
        data: unknown[],
    ): ArrayAccessor<T> {
        return ArrayAccessor.from(data) as ArrayAccessor<T>;
    }

    static fromObject<T extends Record<string, unknown> = Record<string, unknown>>(
        data: Record<string, unknown>,
    ): ObjectAccessor<T> {
        return ObjectAccessor.from(data) as ObjectAccessor<T>;
    }

    static fromJson<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): JsonAccessor<T> {
        return JsonAccessor.from(data) as JsonAccessor<T>;
    }

    static fromXml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): XmlAccessor<T> {
        return XmlAccessor.from(data) as XmlAccessor<T>;
    }

    static fromYaml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): YamlAccessor<T> {
        return YamlAccessor.from(data) as YamlAccessor<T>;
    }

    static fromToml<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): TomlAccessor<T> {
        return TomlAccessor.from(data) as TomlAccessor<T>;
    }

    static fromIni<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): IniAccessor<T> {
        return IniAccessor.from(data) as IniAccessor<T>;
    }

    static fromCsv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): CsvAccessor<T> {
        return CsvAccessor.from(data) as CsvAccessor<T>;
    }

    static fromEnv<T extends Record<string, unknown> = Record<string, unknown>>(
        data: string,
    ): EnvAccessor<T> {
        return EnvAccessor.from(data) as EnvAccessor<T>;
    }

    static detect(data: unknown): AbstractAccessor {
        return TypeDetector.resolve(data);
    }

    static extend(name: string, cls: new (data: unknown) => AbstractAccessor): void {
        SafeAccess.customAccessors.set(name, cls);
    }

    static custom(name: string, data: unknown): AbstractAccessor {
        const Cls = SafeAccess.customAccessors.get(name);
        if (!Cls) throw new Error(`Custom accessor '${name}' is not registered.`);
        return new Cls(data);
    }

    /* v8 ignore next */
    private constructor() {}
}
