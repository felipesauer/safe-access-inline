import { SecurityError } from '../exceptions/security.error';

type CsvSanitizeMode = 'prefix' | 'strip' | 'error' | 'none';

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n'];

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

export function sanitizeCsvRow(row: string[], mode: CsvSanitizeMode = 'none'): string[] {
    return row.map((cell) => sanitizeCsvCell(cell, mode));
}
