import { AbstractAccessor } from './abstract-accessor';
import { ArrayAccessor } from '../accessors/array.accessor';
import { ObjectAccessor } from '../accessors/object.accessor';
import { JsonAccessor } from '../accessors/json.accessor';
import { XmlAccessor } from '../accessors/xml.accessor';
import { YamlAccessor } from '../accessors/yaml.accessor';
import { TomlAccessor } from '../accessors/toml.accessor';
import { IniAccessor } from '../accessors/ini.accessor';
import { EnvAccessor } from '../accessors/env.accessor';
import { UnsupportedTypeError } from '../exceptions/unsupported-type.error';

/**
 * Automatically detects the data format and returns the appropriate Accessor.
 *
 * Detection order:
 * 1. array             → ArrayAccessor
 * 2. object            → ObjectAccessor
 * 3. string JSON       → JsonAccessor
 * 4. string XML        → XmlAccessor
 * 5. string YAML       → YamlAccessor
 * 6. string TOML       → TomlAccessor
 * 7. string INI        → IniAccessor
 * 8. string ENV        → EnvAccessor
 */
export class TypeDetector {
    static resolve(data: unknown): AbstractAccessor {
        if (Array.isArray(data)) return ArrayAccessor.from(data);
        if (typeof data === 'object' && data !== null) return ObjectAccessor.from(data);
        if (typeof data === 'string') {
            const trimmed = data.trim();

            // JSON: starts with { or [
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    return JsonAccessor.from(data);
                } catch {
                    /* not JSON */
                }
            }

            // XML: starts with <
            if (trimmed.startsWith('<')) {
                return XmlAccessor.from(data);
            }

            // YAML: lines with "key:" but no "key="
            if (/^[\w-]+\s*:/m.test(trimmed) && !/^[\w-]+\s*=/m.test(trimmed)) {
                return YamlAccessor.from(data);
            }

            // TOML: key = "quoted_value" pattern (characteristic of TOML)
            if (/^[\w-]+\s*=\s*"/m.test(trimmed)) {
                return TomlAccessor.from(data);
            }

            // INI: section headers [section]
            if (/^\[[\w.-]+\]/m.test(trimmed)) {
                return IniAccessor.from(data);
            }

            // ENV: lines KEY=VALUE (uppercase with underscores)
            if (/^[A-Z][A-Z0-9_]*\s*=/m.test(trimmed)) {
                return EnvAccessor.from(data);
            }
        }
        throw new UnsupportedTypeError(
            'Unable to auto-detect data format. Use a specific factory (e.g., SafeAccess.fromJson()).',
        );
    }
}
