/**
 * Core engine for resolving paths with dot notation.
 * Functional equivalent of the PHP version.
 */
export class DotNotationParser {
  /**
   * Accesses a value in a nested structure via dot notation.
   */
  static get(data: Record<string, unknown>, path: string, defaultValue: unknown = null): unknown {
    if (path === '') return defaultValue;

    const keys = DotNotationParser.parseKeys(path);
    let current: unknown = data;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (key === '*') {
        const items = Array.isArray(current)
          ? current
          : typeof current === 'object' && current !== null
            ? Object.values(current as Record<string, unknown>)
            : null;

        if (items === null) return defaultValue;

        const remaining = keys.slice(i + 1);
        if (remaining.length === 0) return [...items];

        const remainingPath = remaining.join('.');
        return items.map((item) =>
          typeof item === 'object' && item !== null
            ? DotNotationParser.get(item as Record<string, unknown>, remainingPath, defaultValue)
            : defaultValue,
        );
      }

      if (current !== null && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Checks whether a path exists.
   */
  static has(data: Record<string, unknown>, path: string): boolean {
    const sentinel = Symbol('sentinel');
    return DotNotationParser.get(data, path, sentinel) !== sentinel;
  }

  /**
   * Sets a value via dot notation (returns a new object — immutable).
   */
  static set(data: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    const keys = DotNotationParser.parseKeys(path);
    const result = structuredClone(data);
    let current: Record<string, unknown> = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * Removes a path (returns a new object — immutable).
   */
  static remove(data: Record<string, unknown>, path: string): Record<string, unknown> {
    const keys = DotNotationParser.parseKeys(path);
    const result = structuredClone(data);
    let current: Record<string, unknown> = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        return result;
      }
      current = current[key] as Record<string, unknown>;
    }

    delete current[keys[keys.length - 1]];
    return result;
  }

  /**
   * Parses a path into an array of keys.
   */
  private static parseKeys(path: string): string[] {
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
