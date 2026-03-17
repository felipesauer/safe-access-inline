import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for INI-format strings.
 * Supports sections ([section]) and key=value pairs.
 * Sections become nested objects.
 */
export class IniAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    static from(data: unknown): IniAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('IniAccessor expects an INI string.');
        }
        return new IniAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const ini = raw as string;
        const result: Record<string, unknown> = {};
        let currentSection: string | null = null;

        for (const rawLine of ini.split('\n')) {
            const line = rawLine.trim();

            // Skip empty lines and comments
            if (line === '' || line.startsWith(';') || line.startsWith('#')) {
                continue;
            }

            // Section header
            const sectionMatch = line.match(/^\[([^\]]+)\]$/);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                if (!(currentSection in result)) {
                    result[currentSection] = {};
                }
                continue;
            }

            // Key=Value
            const eqPos = line.indexOf('=');
            if (eqPos === -1) continue;

            const key = line.substring(0, eqPos).trim();
            let value: string = line.substring(eqPos + 1).trim();

            // Remove surrounding quotes
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            // Type coercion
            const coerced: unknown = IniAccessor.coerceValue(value);

            if (currentSection) {
                (result[currentSection] as Record<string, unknown>)[key] = coerced;
            } else {
                result[key] = coerced;
            }
        }

        return result;
    }

    clone(data: Record<string, unknown>): IniAccessor<T> {
        const inst = Object.create(IniAccessor.prototype) as IniAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }

    private static coerceValue(value: string): unknown {
        if (value === 'true' || value === 'on' || value === 'yes') return true;
        if (
            value === 'false' ||
            value === 'off' ||
            value === 'no' ||
            value === 'none' ||
            value === ''
        )
            return false;
        if (value === 'null') return null;
        if (/^-?\d+$/.test(value)) return parseInt(value, 10);
        if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
        return value;
    }
}
