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

export class SafeAccess {
    private static customAccessors = new Map<string, new (data: unknown) => AbstractAccessor>();

    static fromArray(data: unknown[]): ArrayAccessor {
        return ArrayAccessor.from(data);
    }

    static fromObject(data: Record<string, unknown>): ObjectAccessor {
        return ObjectAccessor.from(data);
    }

    static fromJson(data: string): JsonAccessor {
        return JsonAccessor.from(data);
    }

    static fromXml(data: string): XmlAccessor {
        return XmlAccessor.from(data);
    }

    static fromYaml(data: string): YamlAccessor {
        return YamlAccessor.from(data);
    }

    static fromToml(data: string): TomlAccessor {
        return TomlAccessor.from(data);
    }

    static fromIni(data: string): IniAccessor {
        return IniAccessor.from(data);
    }

    static fromCsv(data: string): CsvAccessor {
        return CsvAccessor.from(data);
    }

    static fromEnv(data: string): EnvAccessor {
        return EnvAccessor.from(data);
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

    private constructor() {}
}
