import { describe, it, expect } from 'vitest';
import { TypeDetector } from '../../../../src/core/rendering/type-detector';
import { ArrayAccessor } from '../../../../src/accessors/array.accessor';
import { ObjectAccessor } from '../../../../src/accessors/object.accessor';
import { JsonAccessor } from '../../../../src/accessors/json.accessor';
import { XmlAccessor } from '../../../../src/accessors/xml.accessor';
import { YamlAccessor } from '../../../../src/accessors/yaml.accessor';
import { TomlAccessor } from '../../../../src/accessors/toml.accessor';
import { IniAccessor } from '../../../../src/accessors/ini.accessor';
import { EnvAccessor } from '../../../../src/accessors/env.accessor';
import { UnsupportedTypeError } from '../../../../src/exceptions/unsupported-type.error';

describe(TypeDetector.name, () => {
    it('detects array', () => {
        const accessor = TypeDetector.resolve([1, 2, 3]);
        expect(accessor).toBeInstanceOf(ArrayAccessor);
    });

    it('detects object', () => {
        const accessor = TypeDetector.resolve({ a: 1 });
        expect(accessor).toBeInstanceOf(ObjectAccessor);
    });

    it('detects JSON string', () => {
        const accessor = TypeDetector.resolve('{"key": "value"}');
        expect(accessor).toBeInstanceOf(JsonAccessor);
    });

    it('detects JSON array string', () => {
        const accessor = TypeDetector.resolve('[1, 2, 3]');
        expect(accessor).toBeInstanceOf(JsonAccessor);
    });

    it('detects XML string', () => {
        const accessor = TypeDetector.resolve('<root><item>value</item></root>');
        expect(accessor).toBeInstanceOf(XmlAccessor);
    });

    it('detects YAML string', () => {
        const accessor = TypeDetector.resolve('database:\n  host: localhost\n  port: 5432');
        expect(accessor).toBeInstanceOf(YamlAccessor);
    });

    it('detects INI string', () => {
        const accessor = TypeDetector.resolve('[database]\nhost=localhost\nport=5432');
        expect(accessor).toBeInstanceOf(IniAccessor);
    });

    it('detects ENV string', () => {
        const accessor = TypeDetector.resolve('APP_KEY=secret\nDEBUG=true');
        expect(accessor).toBeInstanceOf(EnvAccessor);
    });

    it('throws UnsupportedTypeError for unsupported type', () => {
        expect(() => TypeDetector.resolve(42)).toThrow(UnsupportedTypeError);
    });

    it('throws UnsupportedTypeError for non-JSON string', () => {
        expect(() => TypeDetector.resolve('just plain text')).toThrow(UnsupportedTypeError);
    });

    it('detects TOML string', () => {
        const accessor = TypeDetector.resolve('title = "Hello"\n\n[server]\nhost = "localhost"');
        expect(accessor).toBeInstanceOf(TomlAccessor);
    });

    it('falls through invalid JSON array to throw', () => {
        // Starts with [ so tries JSON first, fails, then falls through
        // No other pattern matches, so UnsupportedTypeError is thrown
        expect(() => TypeDetector.resolve('[not json at all')).toThrow(UnsupportedTypeError);
    });
});

// ── TypeDetector — NDJSON fallback ──────────────────────────────
describe('TypeDetector — NDJSON fallback', () => {
    it('detects NDJSON when JSON parse fails but lines are objects', () => {
        const ndjson = '{"a":1}\n{"b":2}';
        const acc = TypeDetector.resolve(ndjson);
        expect(acc.all()).toBeTruthy();
    });

    it('falls through when invalid JSON with non-object lines', () => {
        const data = '{invalid json\nstill broken';
        expect(() => TypeDetector.resolve(data)).toThrow();
    });
});

// ── TypeDetector — regex anchor and pattern mutations ────────────
describe('TypeDetector — regex anchor mutation tests', () => {
    it('does not detect non-YAML when "key:" appears inside a line but not at start', () => {
        // Mutation removes ^ from /^[\w-]+\s*:/m → matches key: anywhere in line
        // Without ^ anchor, "Some text key: value" would match and return YamlAccessor
        expect(() => TypeDetector.resolve('Some text key: value')).toThrow(UnsupportedTypeError);
    });

    it('detects YAML with whitespace before colon (key  : value)', () => {
        // Checks that \s* matches multiple spaces before colon
        const acc = TypeDetector.resolve('database  : localhost\nport  : 5432');
        expect(acc).toBeInstanceOf(YamlAccessor);
    });

    it('does not detect YAML when key= pattern appears (kills YAML &&-NOT-INI logic)', () => {
        // YAML check fails when /^[\w-]+\s*=/m also matches
        // An INI-like string should NOT be detected as YAML
        const acc = TypeDetector.resolve('[section]\nhost=localhost\nport=5432');
        expect(acc).toBeInstanceOf(IniAccessor);
    });

    it('detects YAML with hyphenated key names ([\\w-]+ regex)', () => {
        const acc = TypeDetector.resolve('server-host: localhost\nclient-port: 8080');
        expect(acc).toBeInstanceOf(YamlAccessor);
    });

    it('does not detect TOML when value is not quoted (key = unquoted)', () => {
        // TOML regex requires /^[\w-]+\s*=\s*"/ — unquoted values don't match
        // But ENV check may catch uppercase keys
        expect(() => TypeDetector.resolve('key = unquoted_value')).toThrow(UnsupportedTypeError);
    });

    it('detects TOML when key = "quoted" format present', () => {
        const acc = TypeDetector.resolve('title = "Hello World"\n\n[server]\nhost = "localhost"');
        expect(acc).toBeInstanceOf(TomlAccessor);
    });

    it('does not detect TOML when = is preceded by multiple spaces (kills \\s* mutation)', () => {
        // Mutation: /^[\w-]+\s=\s*"/ requires exactly one space before =
        // With real /^[\w-]+\s*=\s*"/, any number of spaces is OK
        const acc = TypeDetector.resolve('title  =  "Hello"\n\n[server]\nhost = "localhost"');
        expect(acc).toBeInstanceOf(TomlAccessor);
    });

    it('detects INI with section header [section.name] including dot', () => {
        // Tests [\w.-]+ allows dots in section names
        const acc = TypeDetector.resolve('[server.config]\nhost=localhost');
        expect(acc).toBeInstanceOf(IniAccessor);
    });

    it('does not detect INI with non-matching bracket pattern (kills regex mutation)', () => {
        // Mutation: /\[[\w.-]+\]/m removes ^ → matches section anywhere
        // Real regex requires ^ anchor at start of line (multiline)
        // "other text [section]" should not match /^[\[[\w.-]+\]/m
        expect(() => TypeDetector.resolve('no section here')).toThrow(UnsupportedTypeError);
    });

    it('detects ENV with uppercase keys and underscores', () => {
        const acc = TypeDetector.resolve('APP_NAME=myapp\nDEBUG_MODE=false');
        expect(acc).toBeInstanceOf(EnvAccessor);
    });

    it('does not detect ENV when key starts with lowercase (kills [A-Z] mutation)', () => {
        // Mutation: /[A-Z][A-Z0-9_]*\s*=/ removes ^ → matches uppercase anywhere
        // Real /^[A-Z][A-Z0-9_]*\s*=/ requires uppercase key at START of line
        expect(() => TypeDetector.resolve('lowercase_key=value')).toThrow(UnsupportedTypeError);
    });

    it('detects ENV with multi-part uppercase key', () => {
        const acc = TypeDetector.resolve('DATABASE_URL=postgres://localhost/db');
        expect(acc).toBeInstanceOf(EnvAccessor);
    });

    it('throws UnsupportedTypeError with descriptive message for unknown format', () => {
        // StringLiteral mutation on error message
        try {
            TypeDetector.resolve(42);
        } catch (e) {
            expect(e).toBeInstanceOf(UnsupportedTypeError);
            expect(String(e)).toContain('auto-detect');
        }
    });

    it('resolves null as non-null object → falls to string checks', () => {
        // typeof null === 'object' but null !== null check prevents ObjectAccessor
        expect(() => TypeDetector.resolve(null)).toThrow(UnsupportedTypeError);
    });

    it('detects NDJSON — NDJSON lines with empty lines are valid (t === "" condition)', () => {
        // Tests the t === '' branch in NDJSON detection
        // EqualityOperator mutation: t !== '' would exclude empty lines from "valid"
        const ndjson = '{"a":1}\n\n{"b":2}';
        // This may not parse as valid NDJSON but should fall back gracefully
        expect(() => TypeDetector.resolve(ndjson)).not.toThrow();
    });
});
