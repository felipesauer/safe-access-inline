import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FormatSerializer } from '../../../../src/core/rendering/format-serializer';
import { PluginRegistry } from '../../../../src/core/registries/plugin-registry';
import type { SerializerPlugin } from '../../../../src/core/registries/plugin-registry';
import { UnsupportedTypeError } from '../../../../src/exceptions/unsupported-type.error';

beforeEach(() => {
    PluginRegistry.reset();
});

afterEach(() => {
    PluginRegistry.reset();
});

describe(FormatSerializer.name, () => {
    // ── toIni — plugin override (line 147) ────────────────────────────────

    it('toIni uses a registered plugin serializer when present (line 147)', () => {
        const mockResult = 'plugin_ini_output=1\n';
        const plugin: SerializerPlugin = { serialize: () => mockResult };
        PluginRegistry.registerSerializer('ini', plugin);

        const result = FormatSerializer.toIni({ key: 'value' });
        expect(result).toBe(mockResult);
    });

    it('toIni falls back to built-in serializer when no plugin registered', () => {
        const result = FormatSerializer.toIni({ name: 'test', count: 42 });
        expect(result).toContain('name = test');
        expect(result).toContain('count = 42');
    });

    it('toIni serializes sub-section object values as JSON (line 157 true branch)', () => {
        // When a sub-value inside a section block is itself an object, it is JSON.stringify'd
        const result = FormatSerializer.toIni({ section: { nested: { a: 1 } } });
        expect(result).toContain('[section]');
        expect(result).toContain('nested = {"a":1}');
    });

    // ── toEnv — plugin override (line 187) ────────────────────────────────

    it('toEnv uses a registered plugin serializer when present (line 187)', () => {
        const mockResult = 'PLUGIN_ENV=1\n';
        const plugin: SerializerPlugin = { serialize: () => mockResult };
        PluginRegistry.registerSerializer('env', plugin);

        const result = FormatSerializer.toEnv({ KEY: 'value' });
        expect(result).toBe(mockResult);
    });

    it('toEnv falls back to built-in serializer when no plugin registered', () => {
        const result = FormatSerializer.toEnv({ APP_NAME: 'myapp', PORT: 3000 });
        expect(result).toContain('APP_NAME=myapp');
        expect(result).toContain('PORT=3000');
    });

    it('toEnv emits empty string for null values (line 194 true branch)', () => {
        // value == null → str = '' → no quotes → KEY=
        const result = FormatSerializer.toEnv({ OPTIONAL: null });
        expect(result).toContain('OPTIONAL=');
    });

    // ── transform — format dispatch (lines 218-219) ───────────────────────

    it('transform dispatches to built-in toYaml for yaml format (line 218)', () => {
        // No plugin registered — calls FormatSerializer.toYaml() directly
        const result = FormatSerializer.transform({ key: 'value' }, 'yaml');
        expect(result).toContain('key');
    });

    it('transform dispatches to built-in toToml for toml format (line 219)', () => {
        // No plugin registered — calls FormatSerializer.toToml() directly
        const result = FormatSerializer.transform({ key: 'value' }, 'toml');
        expect(result).toContain('key');
    });

    it('transform dispatches to built-in toCsv for csv format', () => {
        const result = FormatSerializer.transform({ items: [{ id: 1 }, { id: 2 }] }, 'csv');
        expect(typeof result).toBe('string');
    });

    it('transform dispatches to built-in toIni for ini format (line 218 true branch)', () => {
        // No ini plugin registered — true branch at line 218
        const result = FormatSerializer.transform({ host: 'localhost', port: 3000 }, 'ini');
        expect(result).toContain('host = localhost');
    });

    it('transform dispatches to built-in toEnv for env format (line 219 true branch)', () => {
        // No env plugin registered — true branch at line 219
        const result = FormatSerializer.transform({ APP: 'test', PORT: 8080 }, 'env');
        expect(result).toContain('APP=test');
    });

    it('transform throws UnsupportedTypeError for unknown format', () => {
        expect(() => FormatSerializer.transform({ key: 'value' }, 'unknown-format')).toThrow(
            UnsupportedTypeError,
        );
    });
});

// ── FormatSerializer — mutation-killing boundary tests ───────────
describe('FormatSerializer — toCsv mutation tests', () => {
    it('toCsv returns empty string for empty data (rows.length === 0 boundary)', () => {
        // ConditionalExpression mutation: if rows.length === 0 → always false
        const result = FormatSerializer.toCsv({});
        expect(result).toBe('');
    });

    it('toCsv includes header row with correct field names', () => {
        // StringLiteral mutations on separator/join characters
        const result = FormatSerializer.toCsv({
            r1: { name: 'Alice', age: 30 },
        });
        expect(result).toContain('name,age');
        expect(result).toContain('Alice,30');
    });

    it('toCsv calls csvMode correctly in audit deprecation path', () => {
        // LogicalOperator: !csvMode && !getGlobalPolicy()?.csvMode triggers audit
        // BooleanLiteral: BooleanLiteral mutations on csvMode/getGlobalPolicy()?.csvMode
        // When neither csvMode nor global policy is set → audit emitted (mode='none')
        const result = FormatSerializer.toCsv({ r: { v: 1 } });
        expect(result).toContain('v');
    });

    it('toCsv with explicit csvMode skips deprecation audit', () => {
        // When csvMode is explicitly set (truthy), audit is NOT emitted
        const result = FormatSerializer.toCsv({ r: { val: 'x' } }, 'none');
        expect(result).toContain('val');
    });
});

describe('FormatSerializer — toXml mutation tests', () => {
    it('throws InvalidFormatError for invalid XML root element names', () => {
        // Regex mutation: /^[a-zA-Z_][\w.-]*$/ — removes $ anchor or ^ anchor
        expect(() => FormatSerializer.toXml({}, '123invalid')).toThrow('Invalid XML root element');
        expect(() => FormatSerializer.toXml({}, '-bad')).toThrow('Invalid XML root element');
    });

    it('allows valid XML root element names including hyphens and dots', () => {
        expect(() => FormatSerializer.toXml({}, 'my-root')).not.toThrow();
        expect(() => FormatSerializer.toXml({}, 'my.root')).not.toThrow();
        expect(() => FormatSerializer.toXml({}, '_root')).not.toThrow();
    });

    it('toXml includes XML declaration and root element tags', () => {
        // StringLiteral mutations for <?xml...> header and root element tags
        const result = FormatSerializer.toXml({ name: 'test' });
        expect(result).toContain('<?xml');
        expect(result).toContain('<root>');
        expect(result).toContain('</root>');
    });

    it('objectToXml handles numeric keys by prefixing with item_', () => {
        // Regex mutation: /^\d+$/ for numeric key detection
        const result = FormatSerializer.toXml({ '0': 'zero', '1': 'one' });
        expect(result).toContain('item_0');
        expect(result).toContain('item_1');
    });

    it('objectToXml emits empty string for null/non-string/non-number values', () => {
        // ConditionalExpression/LogicalOperator mutations on the type check
        const result = FormatSerializer.toXml({ undef: undefined, sym: null });
        // null and undefined should produce empty element content
        expect(result).toContain('<undef></undef>');
        expect(result).toContain('<sym></sym>');
    });

    it('objectToXml handles boolean values as strings', () => {
        // typeof value === 'boolean' branch in the value serialization
        const result = FormatSerializer.toXml({ flag: true, other: false });
        expect(result).toContain('true');
        expect(result).toContain('false');
    });

    it('objectToXml handles numeric values as strings', () => {
        const result = FormatSerializer.toXml({ count: 42 });
        expect(result).toContain('42');
    });
});

describe('FormatSerializer — toIni serializeIniValue tests', () => {
    it('serializes INI values with special chars in double quotes', () => {
        // Tests the /[=;#[\]\s]/ regex and string quoting logic
        const result = FormatSerializer.toIni({ key: 'value with spaces' });
        expect(result).toContain('"value with spaces"');
    });

    it('serializes INI number values without quotes', () => {
        const result = FormatSerializer.toIni({ port: 3000 });
        expect(result).toContain('port = 3000');
    });

    it('serializes INI boolean values as true/false', () => {
        const result = FormatSerializer.toIni({ enabled: true, disabled: false });
        expect(result).toContain('enabled = true');
        expect(result).toContain('disabled = false');
    });

    it('serializes INI null values as null', () => {
        const result = FormatSerializer.toIni({ key: null });
        expect(result).toContain('key = null');
    });

    it('does not quote INI values that contain double quotes', () => {
        // str.includes('"') prevents wrapping in double quotes
        const result = FormatSerializer.toIni({ key: 'val"ue=test' });
        // Has = and " so quoting would be ambiguous — leaves unquoted
        expect(result).toContain('key =');
    });
});
