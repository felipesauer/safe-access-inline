import { SecurityError } from '../../exceptions/security.error';

type CsvSanitizeMode = 'prefix' | 'strip' | 'error' | 'none';

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitises a single CSV cell to prevent formula-injection attacks.
 *
 * @param cell - The raw cell value.
 * @param mode - Strategy: `'prefix'` prepends a quote, `'strip'` removes dangerous chars,
 *               `'error'` throws, `'none'` passes through.
 * @returns The sanitised cell string.
 * @throws {@link SecurityError} When `mode` is `'error'` and the cell starts with a dangerous character.
 */
export function sanitizeCsvCell(cell: string, mode: CsvSanitizeMode = 'none'): string {
    if (mode === 'none') return cell;

    const isDangerous = DANGEROUS_PREFIXES.some((p) => cell.startsWith(p));
    if (!isDangerous) return cell;

    switch (mode) {
        case 'prefix':
            return `'${cell}`;
        case 'strip':
            return cell.replace(/^[=+\-@\t\r\n]+/, '');
        case 'error':
            throw new SecurityError(`CSV cell starts with dangerous character: '${cell[0]}'`);
        default:
            return cell;
    }
}

/**
 * Sanitises every cell in a CSV row.
 *
 * @param row - Array of raw cell values.
 * @param mode - Sanitisation strategy applied to each cell.
 * @returns A new array of sanitised cell strings.
 */
export function sanitizeCsvRow(row: string[], mode: CsvSanitizeMode = 'none'): string[] {
    return row.map((cell) => sanitizeCsvCell(cell, mode));
}
