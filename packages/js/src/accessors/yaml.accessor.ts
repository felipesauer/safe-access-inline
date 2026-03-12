import { AbstractAccessor } from '../core/abstract-accessor';
import { PluginRegistry } from '../core/plugin-registry';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for YAML strings.
 * Implements a lightweight subset YAML parser (no external dependencies).
 * Supports: key-value, nesting via indentation, arrays (- item), quoted strings, booleans, numbers, null.
 */
export class YamlAccessor extends AbstractAccessor {
    static from(data: unknown): YamlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('YamlAccessor expects a YAML string.');
        }
        return new YamlAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const yaml = raw as string;

        // Use registered plugin if available, otherwise fall back to built-in parser
        if (PluginRegistry.hasParser('yaml')) {
            return PluginRegistry.getParser('yaml').parse(yaml);
        }

        try {
            return YamlAccessor.parseYaml(yaml);
        } catch {
            /* v8 ignore next */
            throw new InvalidFormatError('YamlAccessor failed to parse YAML string.');
        }
    }

    clone(data: Record<string, unknown>): YamlAccessor {
        const inst = Object.create(YamlAccessor.prototype) as YamlAccessor;
        inst.raw = this.raw;
        inst.data = data;
        return inst;
    }

    private static parseYaml(yaml: string): Record<string, unknown> {
        const lines = yaml.split('\n');
        const result: Record<string, unknown> = {};
        YamlAccessor.parseBlock(lines, 0, 0, result);
        return result;
    }

    /**
     * Recursively parses a block of YAML lines at a given indentation level.
     * Returns the index of the next line to process.
     */
    private static parseBlock(
        lines: string[],
        startIdx: number,
        indent: number,
        target: Record<string, unknown>,
    ): number {
        let i = startIdx;

        while (i < lines.length) {
            const line = lines[i];
            const stripped = line.trimEnd();

            // Skip empty lines and comments
            if (stripped === '' || stripped.trimStart().startsWith('#')) {
                i++;
                continue;
            }

            const currentIndent = line.length - line.trimStart().length;

            // If we've dedented, return to parent
            if (currentIndent < indent) {
                return i;
            }

            // Skip lines with deeper indent (already consumed)
            if (currentIndent > indent) {
                i++;
                continue;
            }

            const content = stripped.trimStart();

            // Array item at this level: "- value"
            if (content.startsWith('- ')) {
                // This shouldn't happen at object level; skip
                i++;
                continue;
            }

            // Key: value
            const colonIdx = content.indexOf(':');
            if (colonIdx === -1) {
                i++;
                continue;
            }

            const key = content.substring(0, colonIdx).trim();
            const valueStr = content.substring(colonIdx + 1).trim();

            if (valueStr === '' || valueStr === '|' || valueStr === '>') {
                // Check next lines for nested content
                const nextLineIdx = YamlAccessor.findNextContentLine(lines, i + 1);
                if (nextLineIdx < lines.length) {
                    const nextLine = lines[nextLineIdx];
                    const nextIndent = nextLine.length - nextLine.trimStart().length;

                    if (nextIndent > currentIndent) {
                        const nextContent = nextLine.trimStart();

                        // Check if it's an array
                        if (nextContent.startsWith('- ')) {
                            const arr: unknown[] = [];
                            const endIdx = YamlAccessor.parseArray(
                                lines,
                                nextLineIdx,
                                nextIndent,
                                arr,
                            );
                            target[key] = arr;
                            i = endIdx;
                            continue;
                        }

                        // It's a nested object
                        const nested: Record<string, unknown> = {};
                        const endIdx = YamlAccessor.parseBlock(
                            lines,
                            nextLineIdx,
                            nextIndent,
                            nested,
                        );
                        target[key] = nested;
                        i = endIdx;
                        continue;
                    }
                }
                // Empty value
                target[key] = null;
                i++;
            } else {
                target[key] = YamlAccessor.coerceValue(valueStr);
                i++;
            }
        }

        return i;
    }

    private static parseArray(
        lines: string[],
        startIdx: number,
        indent: number,
        target: unknown[],
    ): number {
        let i = startIdx;

        while (i < lines.length) {
            const line = lines[i];
            const stripped = line.trimEnd();

            if (stripped === '' || stripped.trimStart().startsWith('#')) {
                i++;
                continue;
            }

            const currentIndent = line.length - line.trimStart().length;
            if (currentIndent < indent) return i;
            if (currentIndent > indent) {
                i++;
                continue;
            }

            const content = stripped.trimStart();
            if (!content.startsWith('- ')) return i;

            const itemValue = content.substring(2).trim();

            // Check if this array item has nested content (e.g., "- key: value")
            const colonIdx = itemValue.indexOf(':');
            if (colonIdx !== -1 && !itemValue.startsWith('"') && !itemValue.startsWith("'")) {
                // Inline object in array item
                const nested: Record<string, unknown> = {};
                const key = itemValue.substring(0, colonIdx).trim();
                const val = itemValue.substring(colonIdx + 1).trim();

                if (val === '') {
                    // Multi-line nested object
                    const nextLineIdx = YamlAccessor.findNextContentLine(lines, i + 1);
                    if (nextLineIdx < lines.length) {
                        const nextIndent =
                            lines[nextLineIdx].length - lines[nextLineIdx].trimStart().length;
                        if (nextIndent > currentIndent) {
                            const child: Record<string, unknown> = {};
                            const endIdx = YamlAccessor.parseBlock(
                                lines,
                                nextLineIdx,
                                nextIndent,
                                child,
                            );
                            nested[key] = child;
                            target.push(nested);
                            i = endIdx;
                            continue;
                        }
                    }
                    nested[key] = null;
                } else {
                    nested[key] = YamlAccessor.coerceValue(val);

                    // Check for additional keys at deeper indent
                    const nextLineIdx = i + 1;
                    if (nextLineIdx < lines.length) {
                        const nextLine = lines[nextLineIdx];
                        const nextIndent = nextLine.length - nextLine.trimStart().length;
                        if (nextIndent > currentIndent && !nextLine.trimStart().startsWith('-')) {
                            const endIdx = YamlAccessor.parseBlock(
                                lines,
                                nextLineIdx,
                                nextIndent,
                                nested,
                            );
                            target.push(nested);
                            i = endIdx;
                            continue;
                        }
                    }
                }

                target.push(nested);
                i++;
            } else {
                target.push(YamlAccessor.coerceValue(itemValue));
                i++;
            }
        }

        return i;
    }

    private static findNextContentLine(lines: string[], startIdx: number): number {
        for (let i = startIdx; i < lines.length; i++) {
            const stripped = lines[i].trimEnd();
            if (stripped !== '' && !stripped.trimStart().startsWith('#')) {
                return i;
            }
        }
        return lines.length;
    }

    private static coerceValue(value: string): unknown {
        if (value === 'true' || value === 'True' || value === 'TRUE') return true;
        if (value === 'false' || value === 'False' || value === 'FALSE') return false;
        if (value === 'null' || value === 'Null' || value === 'NULL' || value === '~') return null;

        // Remove surrounding quotes
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            return value.slice(1, -1);
        }

        // Number coercion
        if (/^-?\d+$/.test(value)) return parseInt(value, 10);
        if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

        return value;
    }
}
