import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { AuditEventType, emitAudit } from '../security/audit/audit-emitter';
import { sanitizeCsvHeaders } from '../security/sanitizers/csv-sanitizer';
import { getGlobalPolicy } from '../security/guards/security-policy';

/**
 * Accessor for CSV strings.
 * First line is treated as header row.
 * Result: object with numeric string indices mapping to associative row objects.
 */
export class CsvAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    /**
     * Creates an accessor from a CSV string.
     *
     * @param data - A valid CSV string (first row treated as headers).
     * @returns A new {@link CsvAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string.
     */
    static from(data: unknown, options?: { readonly?: boolean }): CsvAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('CsvAccessor expects a CSV string.');
        }
        return new CsvAccessor(data, options);
    }

    /**
     * Parses a CSV string into an indexed record of row objects.
     *
     * @param raw - The raw CSV string.
     * @returns A plain record keyed by row index strings.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        const csv = raw as string;
        const lines = csv
            .trim()
            .split('\n')
            .filter((line) => line.trim() !== '');

        if (lines.length < 1) return {};

        const rawHeaders = CsvAccessor.parseCsvLine(lines[0]);
        const csvMode = getGlobalPolicy()?.csvMode ?? 'none';
        const headers = sanitizeCsvHeaders(rawHeaders, csvMode);
        const result: Record<string, unknown> = {};

        for (let i = 1; i < lines.length; i++) {
            const values = CsvAccessor.parseCsvLine(lines[i]);
            if (values.length === headers.length) {
                const row: Record<string, unknown> = {};
                for (let j = 0; j < headers.length; j++) {
                    row[headers[j]] = values[j];
                }
                result[String(i - 1)] = row;
            } else {
                // A column-count mismatch is a data-format issue, not a security violation;
                // emitting 'security.violation' would inflate security-event counters.
                emitAudit(AuditEventType.DATA_FORMAT_WARNING, {
                    reason: 'csv_column_mismatch',
                    line: i + 1,
                    expected: headers.length,
                    actual: values.length,
                });
            }
        }

        return result;
    }

    /**
     * Returns a new {@link CsvAccessor} wrapping the given data.
     *
     * @param data - The record to wrap.
     * @returns A new {@link CsvAccessor} instance.
     */
    clone(data: Record<string, unknown>): CsvAccessor<T> {
        const inst = Object.create(CsvAccessor.prototype) as CsvAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }

    /**
     * Parses a single CSV line, respecting quoted fields and escaped quotes.
     *
     * @param line - A single CSV line string.
     * @returns An array of field values.
     */
    private static parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current.trim());
        return result;
    }
}
