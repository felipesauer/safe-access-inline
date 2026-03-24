import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for NDJSON (Newline Delimited JSON) strings.
 * Each line is a separate JSON object.
 * Result: object with numeric string indices mapping to parsed JSON objects.
 *
 * **Strict parsing:** Every non-empty line must be valid JSON. If any line
 * fails to parse, an `InvalidFormatError` is thrown immediately — there is
 * no lenient/skip mode. Empty and whitespace-only lines are silently ignored.
 */
export class NdjsonAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a newline-delimited JSON string.
     *
     * @param data - A valid NDJSON string (one JSON object per line).
     * @returns A new {@link NdjsonAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string or any line fails to parse.
     */
    static from(data: unknown, options?: { readonly?: boolean }): NdjsonAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('NdjsonAccessor expects an NDJSON string.');
        }
        return new NdjsonAccessor(data, options);
    }

    /**
     * Parses a newline-delimited JSON string into an indexed record.
     * Empty lines are skipped; any malformed line throws immediately.
     *
     * @param raw - The raw NDJSON string.
     * @returns A plain record keyed by sequential index strings.
     * @throws {InvalidFormatError} If any non-empty line is not valid JSON.
     */
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

    /**
     * Returns a new {@link NdjsonAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link NdjsonAccessor} instance.
     */
    protected override clone(data: Record<string, unknown> = {}): NdjsonAccessor<T> {
        const inst = Object.create(NdjsonAccessor.prototype) as NdjsonAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }
}
