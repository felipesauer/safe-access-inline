import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for NDJSON (Newline Delimited JSON) strings.
 * Each line is a separate JSON object.
 * Result: object with numeric string indices mapping to parsed JSON objects.
 */
export class NdjsonAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    static from(data: unknown): NdjsonAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('NdjsonAccessor expects an NDJSON string.');
        }
        return new NdjsonAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const input = raw as string;
        const allLines = input.split('\n');
        const lines = allLines
            .map((line, idx) => ({ line: line.trim(), originalLine: idx + 1 }))
            .filter(({ line }) => line !== '');

        if (lines.length === 0) return {};

        const result: Record<string, unknown> = {};

        for (let i = 0; i < lines.length; i++) {
            const { line, originalLine } = lines[i];
            try {
                result[String(i)] = JSON.parse(line);
            } catch {
                throw new InvalidFormatError(
                    `NdjsonAccessor failed to parse line ${originalLine}: ${line}`,
                );
            }
        }

        return result;
    }

    clone(data: Record<string, unknown>): NdjsonAccessor<T> {
        const inst = Object.create(NdjsonAccessor.prototype) as NdjsonAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}
