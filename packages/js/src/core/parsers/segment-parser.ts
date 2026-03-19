import { FilterParser } from './filter-parser';
import type { FilterExpression } from './filter-parser';
import { SegmentType } from '../../enums/segment-type.enum';

/**
 * Typed segment returned by {@link SegmentParser.parseSegments}.
 */
export type Segment =
    | { type: SegmentType.KEY; value: string }
    | { type: SegmentType.WILDCARD }
    | { type: SegmentType.FILTER; expression: FilterExpression }
    | { type: SegmentType.DESCENT; key: string }
    | { type: SegmentType.DESCENT_MULTI; keys: string[] }
    | { type: SegmentType.MULTI_INDEX; indices: number[] }
    | { type: SegmentType.SLICE; start: number | null; end: number | null; step: number | null };

/**
 * Parses dot-notation path strings into structured segment arrays.
 *
 * Supports: keys, wildcards (`*`), filters (`[?...]`), recursive descent (`..`),
 * multi-index (`[0,1,2]`), slice (`[0:5]`, `[::2]`), bracket notation (`['key']`),
 * and root anchor (`$`).
 */
export class SegmentParser {
    /**
     * Parses a dot-notation path into an array of typed segments.
     *
     * @param path - Dot-notation path string.
     * @returns Array of parsed segments.
     */
    static parseSegments(path: string): Segment[] {
        const segments: Segment[] = [];
        let i = 0;

        // Strip root anchor $
        if (path.startsWith('$')) {
            i = 1;
            if (i < path.length && path[i] === '.') i++;
        }

        while (i < path.length) {
            // Skip leading dot
            if (path[i] === '.') {
                // Recursive descent: ".."
                if (i + 1 < path.length && path[i + 1] === '.') {
                    i += 2;
                    // Check for bracket notation after ".." → ..['key1','key2']
                    if (i < path.length && path[i] === '[') {
                        let j = i + 1;
                        while (j < path.length && path[j] !== ']') j++;
                        const inner = path.substring(i + 1, j);
                        i = j + 1;
                        if (inner.includes(',')) {
                            const parts = inner.split(',').map((p) => p.trim());
                            const allQuoted = parts.every(
                                (p) =>
                                    (p.startsWith("'") && p.endsWith("'")) ||
                                    (p.startsWith('"') && p.endsWith('"')),
                            );
                            if (allQuoted) {
                                const keys = parts.map((p) => p.slice(1, -1));
                                segments.push({ type: SegmentType.DESCENT_MULTI, keys });
                                continue;
                            }
                        }
                        // Single quoted key after ..
                        const quotedMatch = inner.match(/^(['"])(.*?)\1$/);
                        if (quotedMatch) {
                            segments.push({ type: SegmentType.DESCENT, key: quotedMatch[2] });
                            continue;
                        }
                        // Unquoted key in brackets
                        segments.push({ type: SegmentType.DESCENT, key: inner });
                        continue;
                    }
                    // Collect the key after ".."
                    let key = '';
                    while (i < path.length && path[i] !== '.' && path[i] !== '[') {
                        if (path[i] === '\\' && i + 1 < path.length && path[i + 1] === '.') {
                            key += '.';
                            i += 2;
                        } else {
                            key += path[i];
                            i++;
                        }
                    }
                    if (key) segments.push({ type: SegmentType.DESCENT, key });
                    continue;
                }
                i++;
                continue;
            }

            // Filter: [?...]
            if (path[i] === '[' && i + 1 < path.length && path[i + 1] === '?') {
                let depth = 1;
                let j = i + 1;
                while (j < path.length && depth > 0) {
                    j++;
                    if (path[j] === '[') depth++;
                    if (path[j] === ']') depth--;
                }
                const filterExpr = path.substring(i + 2, j);
                segments.push({
                    type: SegmentType.FILTER,
                    expression: FilterParser.parse(filterExpr),
                });
                i = j + 1;
                continue;
            }

            // Bracket notation: [0], [0,1,2], [0:5], ['key'], ["key"]
            if (path[i] === '[') {
                let j = i + 1;
                while (j < path.length && path[j] !== ']') j++;
                const inner = path.substring(i + 1, j);
                i = j + 1;

                // Multi-index: [0,1,2] or multi-key: ['a','b'] — check before single-quoted
                if (inner.includes(',')) {
                    const parts = inner.split(',').map((p) => p.trim());
                    // Check if all parts are quoted strings (multi-key)
                    const allQuoted = parts.every(
                        (p) =>
                            (p.startsWith("'") && p.endsWith("'")) ||
                            (p.startsWith('"') && p.endsWith('"')),
                    );
                    if (allQuoted) {
                        const keys = parts.map((p) => p.slice(1, -1));
                        segments.push({
                            type: SegmentType.MULTI_INDEX,
                            indices: keys as unknown as number[],
                        });
                        (segments[segments.length - 1] as unknown as { keys: string[] }).keys =
                            keys;
                        continue;
                    }
                    const indices = parts.map((p) => parseInt(p, 10));
                    if (indices.every((n) => !isNaN(n))) {
                        segments.push({ type: SegmentType.MULTI_INDEX, indices });
                        continue;
                    }
                }

                // Quoted bracket key: ['key'] or ["key"]
                const quotedMatch = inner.match(/^(['"])(.*?)\1$/);
                if (quotedMatch) {
                    segments.push({ type: SegmentType.KEY, value: quotedMatch[2] });
                    continue;
                }

                // Slice: [start:end:step]
                if (inner.includes(':')) {
                    const sliceParts = inner.split(':');
                    const start = sliceParts[0] !== '' ? parseInt(sliceParts[0], 10) : null;
                    const end =
                        sliceParts.length > 1 && sliceParts[1] !== ''
                            ? parseInt(sliceParts[1], 10)
                            : null;
                    const step =
                        sliceParts.length > 2 && sliceParts[2] !== ''
                            ? parseInt(sliceParts[2], 10)
                            : null;
                    segments.push({ type: SegmentType.SLICE, start, end, step });
                    continue;
                }

                // Regular index/key
                segments.push({ type: SegmentType.KEY, value: inner });
                continue;
            }

            // Wildcard
            if (path[i] === '*') {
                segments.push({ type: SegmentType.WILDCARD });
                i++;
                continue;
            }

            // Regular key
            let key = '';
            while (i < path.length && path[i] !== '.' && path[i] !== '[') {
                if (path[i] === '\\' && i + 1 < path.length && path[i + 1] === '.') {
                    key += '.';
                    i += 2;
                } else {
                    key += path[i];
                    i++;
                }
            }
            // key is always non-empty here: the outer loop only falls through to this section
            // when path[i] is not '.', '[', or '*', guaranteeing at least one iteration above.
            segments.push({ type: SegmentType.KEY, value: key });
        }

        return segments;
    }

    /**
     * Parses a path into an array of literal keys.
     *
     * Converts bracket notation (`a[0][1]`) to dot notation (`a.0.1`),
     * then splits by `.` respecting escaped `\.`.
     *
     * @param path - Dot-notation path string.
     * @returns Array of key strings.
     */
    static parseKeys(path: string): string[] {
        // Convert brackets: "a[0][1]" → "a.0.1"
        const normalized = path.replace(/\[([^\]]+)\]/g, '.$1');

        // Split by "." respecting escaped "\."
        const placeholder = '\x00ESC_DOT\x00';
        const escaped = normalized.replace(/\\\./g, placeholder);
        const keys = escaped.split('.');

        const placeholderRegex = new RegExp(
            placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'g',
        );
        return keys.map((k) => k.replace(placeholderRegex, '.'));
    }
}
