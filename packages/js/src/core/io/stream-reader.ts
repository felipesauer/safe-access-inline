import * as fs from 'node:fs';
import * as readline from 'node:readline';

/**
 * Yields each line of a file as a string using Node.js readline.
 *
 * The underlying `ReadStream` and `Interface` are closed in a `finally` block,
 * ensuring the file handle is released even when the consumer breaks out of
 * a `for await` loop early (iterator return / throw).
 *
 * @param filePath - Canonical, already-validated absolute path to the file.
 * @returns AsyncGenerator yielding one raw line string per iteration.
 */
export async function* streamLines(filePath: string): AsyncGenerator<string> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    try {
        for await (const line of rl) {
            yield line;
        }
    } finally {
        rl.close();
        fileStream.destroy();
    }
}

/**
 * Parses a single CSV line into an array of field values.
 *
 * Handles double-quote field quoting and `""` escaped quotes inside a quoted field.
 * Leading and trailing whitespace in each field is trimmed.
 *
 * @param line - A single CSV line string.
 * @returns Array of string field values.
 */
export function parseCsvLine(line: string): string[] {
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
