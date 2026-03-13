import { describe, it, expect } from 'vitest';
import { TypeDetector } from '../../../src/core/type-detector';
import { ArrayAccessor } from '../../../src/accessors/array.accessor';
import { ObjectAccessor } from '../../../src/accessors/object.accessor';
import { JsonAccessor } from '../../../src/accessors/json.accessor';
import { XmlAccessor } from '../../../src/accessors/xml.accessor';
import { YamlAccessor } from '../../../src/accessors/yaml.accessor';
import { TomlAccessor } from '../../../src/accessors/toml.accessor';
import { IniAccessor } from '../../../src/accessors/ini.accessor';
import { EnvAccessor } from '../../../src/accessors/env.accessor';
import { UnsupportedTypeError } from '../../../src/exceptions/unsupported-type.error';

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
