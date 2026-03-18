import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { emitAudit } from '../core/audit-emitter';

/**
 * Accessor for CSV strings.
 * First line is treated as header row.
 * Result: object with numeric string indices mapping to associative row objects.
 */
export class CsvAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    static from(data: unknown): CsvAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('CsvAccessor expects a CSV string.');
        }
        return new CsvAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const csv = raw as string;
        const lines = csv
            .trim()
            .split('\n')
            .filter((line) => line.trim() !== '');

        if (lines.length < 1) return {};

        const headers = CsvAccessor.parseCsvLine(lines[0]);
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
                emitAudit('security.violation', {
                    reason: 'csv_column_mismatch',
                    line: i + 1,
                    expected: headers.length,
                    actual: values.length,
                });
            }
        }

        return result;
    }

    clone(data: Record<string, unknown>): CsvAccessor<T> {
        const inst = Object.create(CsvAccessor.prototype) as CsvAccessor<T>;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }

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
