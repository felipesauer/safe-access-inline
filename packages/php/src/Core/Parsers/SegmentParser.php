<?php

declare(strict_types=1);

namespace SafeAccessInline\Core\Parsers;

use SafeAccessInline\Enums\SegmentType;

/**
 * Parses dot-notation path strings into structured segment arrays.
 *
 * Supports: keys, wildcards (`*`), filters (`[?...]`), recursive descent (`..`),
 * multi-index (`[0,1,2]`), slice (`[0:5]`, `[::2]`), bracket notation (`['key']`),
 * and root anchor (`$`).
 */
final class SegmentParser
{
    /**
     * Parses a dot-notation path into an array of typed segments.
     *
     * @param string $path Dot-notation path string.
     * @return list<array{type: SegmentType::DESCENT, key: string}|array{type: SegmentType::DESCENT_MULTI, keys: non-empty-list<string>}|array{type: SegmentType::FILTER, expression: array{conditions: array<array{field: string, operator: string, value: mixed}>, logicals: array<string>}}|array{type: SegmentType::KEY, value: string}|array{type: SegmentType::MULTI_INDEX, indices: non-empty-list<int>}|array{type: SegmentType::MULTI_KEY, keys: non-empty-list<string>}|array{type: SegmentType::PROJECTION, fields: list<array{alias: string, source: string}>}|array{type: SegmentType::SLICE, start: int|null, end: int|null, step: int|null}|array{type: SegmentType::WILDCARD}>
     */
    public static function parseSegments(string $path): array
    {
        $segments = [];
        $i = 0;
        $len = strlen($path);

        // Strip root anchor $
        if ($len > 0 && $path[0] === '$') {
            $i = 1;
            if ($i < $len && $path[$i] === '.') {
                $i++;
            }
        }

        while ($i < $len) {
            if ($path[$i] === '.') {
                // Recursive descent: ".."
                if ($i + 1 < $len && $path[$i + 1] === '.') {
                    $i += 2;
                    // Check for bracket notation after ".." → ..['key1','key2']
                    if ($i < $len && $path[$i] === '[') {
                        $j = $i + 1;
                        while ($j < $len && $path[$j] !== ']') {
                            $j++;
                        }
                        $inner = substr($path, $i + 1, $j - $i - 1);
                        $i = $j + 1;
                        if (str_contains($inner, ',')) {
                            $parts = array_map('trim', explode(',', $inner));
                            $allQuoted = true;
                            foreach ($parts as $p) {
                                if (
                                    !(str_starts_with($p, "'") && str_ends_with($p, "'")) &&
                                    !(str_starts_with($p, '"') && str_ends_with($p, '"'))
                                ) {
                                    $allQuoted = false;
                                    break;
                                }
                            }
                            if ($allQuoted) {
                                $keys = array_map(fn (string $p): string => substr($p, 1, -1), $parts);
                                $segments[] = ['type' => SegmentType::DESCENT_MULTI, 'keys' => $keys];
                                continue;
                            }
                        }
                        // Single quoted key after ..
                        if (preg_match('/^([\'"])(.*?)\\1$/', $inner, $m)) {
                            $segments[] = ['type' => SegmentType::DESCENT, 'key' => $m[2]];
                            continue;
                        }
                        // Unquoted key in brackets
                        $segments[] = ['type' => SegmentType::DESCENT, 'key' => $inner];
                        continue;
                    }
                    $key = '';
                    while ($i < $len && $path[$i] !== '.' && $path[$i] !== '[') {
                        if ($path[$i] === '\\' && $i + 1 < $len && $path[$i + 1] === '.') {
                            $key .= '.';
                            $i += 2;
                        } else {
                            $key .= $path[$i];
                            $i++;
                        }
                    }
                    if ($key !== '') {
                        $segments[] = ['type' => SegmentType::DESCENT, 'key' => $key];
                    }
                    continue;
                }
                $i++;
                // Projection after dot: .{field1, field2} or .{alias: field}
                if ($i < $len && $path[$i] === '{') {
                    $j = $i + 1;
                    while ($j < $len && $path[$j] !== '}') {
                        $j++;
                    }
                    $inner = substr($path, $i + 1, $j - $i - 1);
                    $i = $j + 1;
                    $fields = [];
                    foreach (array_filter(array_map('trim', explode(',', $inner))) as $entry) {
                        $colonIdx = strpos($entry, ':');
                        if ($colonIdx !== false) {
                            $fields[] = [
                                'alias' => trim(substr($entry, 0, $colonIdx)),
                                'source' => trim(substr($entry, $colonIdx + 1)),
                            ];
                        } else {
                            $fields[] = ['alias' => $entry, 'source' => $entry];
                        }
                    }
                    $segments[] = ['type' => SegmentType::PROJECTION, 'fields' => $fields];
                }
                continue;
            }

            // Filter: [?...]
            if ($path[$i] === '[' && $i + 1 < $len && $path[$i + 1] === '?') {
                $depth = 1;
                $j = $i + 1;
                while ($j < $len && $depth > 0) {
                    $j++;
                    if ($j < $len && $path[$j] === '[') {
                        $depth++;
                    }
                    if ($j < $len && $path[$j] === ']') {
                        $depth--;
                    }
                }
                $filterExpr = substr($path, $i + 2, $j - $i - 2);
                $segments[] = ['type' => SegmentType::FILTER, 'expression' => FilterParser::parse($filterExpr)];
                $i = $j + 1;
                continue;
            }

            // Bracket notation: [0], [0,1,2], [0:5], ['key'], ["key"]
            if ($path[$i] === '[') {
                $j = $i + 1;
                while ($j < $len && $path[$j] !== ']') {
                    $j++;
                }
                $inner = substr($path, $i + 1, $j - $i - 1);
                $i = $j + 1;

                // Multi-index: [0,1,2] or multi-key: ['a','b'] — check before single-quoted
                if (str_contains($inner, ',')) {
                    $parts = array_map('trim', explode(',', $inner));
                    // Check if all parts are quoted strings (multi-key)
                    $allQuoted = true;
                    foreach ($parts as $p) {
                        if (
                            !(str_starts_with($p, "'") && str_ends_with($p, "'"))
                            && !(str_starts_with($p, '"') && str_ends_with($p, '"'))
                        ) {
                            $allQuoted = false;
                            break;
                        }
                    }
                    if ($allQuoted) {
                        $keys = array_map(fn ($p) => substr($p, 1, -1), $parts);
                        $segments[] = ['type' => SegmentType::MULTI_KEY, 'keys' => $keys];
                        continue;
                    }
                    $indices = array_map('intval', $parts);
                    $allNumeric = true;
                    foreach ($parts as $p) {
                        if (!is_numeric(trim($p))) {
                            $allNumeric = false;
                            break;
                        }
                    }
                    if ($allNumeric) {
                        $segments[] = ['type' => SegmentType::MULTI_INDEX, 'indices' => $indices];
                        continue;
                    }
                }

                // Quoted bracket key: ['key'] or ["key"]
                if (preg_match('/^([\'"])(.*?)\1$/', $inner, $quotedMatch)) {
                    $segments[] = ['type' => SegmentType::KEY, 'value' => $quotedMatch[2]];
                    continue;
                }

                // Slice: [start:end:step]
                if (str_contains($inner, ':')) {
                    $sliceParts = explode(':', $inner);
                    $start = $sliceParts[0] !== '' ? (int) $sliceParts[0] : null;
                    $end = count($sliceParts) > 1 && $sliceParts[1] !== '' ? (int) $sliceParts[1] : null;
                    $step = count($sliceParts) > 2 && $sliceParts[2] !== '' ? (int) $sliceParts[2] : null;
                    $segments[] = ['type' => SegmentType::SLICE, 'start' => $start, 'end' => $end, 'step' => $step];
                    continue;
                }

                // Wildcard inside brackets: [*]
                if ($inner === '*') {
                    $segments[] = ['type' => SegmentType::WILDCARD];
                    continue;
                }

                // Regular index/key
                $segments[] = ['type' => SegmentType::KEY, 'value' => $inner];
                continue;
            }

            // Wildcard
            if ($path[$i] === '*') {
                $segments[] = ['type' => SegmentType::WILDCARD];
                $i++;
                continue;
            }

            // Regular key
            $key = '';
            while ($i < $len && $path[$i] !== '.' && $path[$i] !== '[') {
                if ($path[$i] === '\\' && $i + 1 < $len && $path[$i + 1] === '.') {
                    $key .= '.';
                    $i += 2;
                } else {
                    $key .= $path[$i];
                    $i++;
                }
            }
            if ($key !== '') {
                $segments[] = ['type' => SegmentType::KEY, 'value' => $key];
            }
        }

        return $segments;
    }

    /**
     * Parses a path string into an array of literal keys.
     *
     * Handles: escaped dots (`\.`), bracket notation (`[0]`).
     *
     * @param string $path Dot-notation path string.
     * @return array<string>
     */
    public static function parseKeys(string $path): array
    {
        // 1. Convert brackets to dot notation: "a[0][1]" → "a.0.1"
        $path = preg_replace('/\[([^\]]+)\]/', '.$1', $path) ?? $path;

        // 2. Split by "." respecting escaped "\."
        $placeholder = "\x00ESC_DOT\x00";
        $path = str_replace('\.', $placeholder, $path);
        $keys = explode('.', $path);

        // 3. Restore escaped dots
        return array_map(
            fn (string $k) => str_replace($placeholder, '.', $k),
            $keys
        );
    }
}
