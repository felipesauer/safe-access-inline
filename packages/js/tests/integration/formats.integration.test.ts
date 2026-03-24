/**
 * @testtype Integration — Multi-format
 * @description Verifies that the same data accessed via JSON, YAML, and TOML
 *   returns identical results. Tests the full pipeline: parse → accessor → get.
 *   If a test fails, the bug is in the format adapter, not in the access engine.
 *   Run: npx vitest run tests/integration/formats.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { SafeAccess } from '../../src/safe-access';

const canonicalData = {
    user: { name: 'Ana', age: 30 },
    items: [
        { name: 'Widget', price: 10 },
        { name: 'Gadget', price: 50 },
        { name: 'Gizmo', price: 25 },
    ],
};

const jsonString = JSON.stringify(canonicalData);

const yamlString = [
    'user:',
    '  name: Ana',
    '  age: 30',
    'items:',
    '  - name: Widget',
    '    price: 10',
    '  - name: Gadget',
    '    price: 50',
    '  - name: Gizmo',
    '    price: 25',
].join('\n');

describe('Multi-format integration', () => {
    // JSON is the reference format — all other formats are compared against it
    describe('JSON accessor queries', () => {
        const accessor = SafeAccess.fromJson(jsonString);

        it('simple path: user.name', () => {
            expect(accessor.get('user.name')).toBe('Ana');
        });

        it('wildcard: items.*.price', () => {
            expect(accessor.get('items.*.price')).toEqual([10, 50, 25]);
        });

        it('filter: items[?price>20].name', () => {
            expect(accessor.get('items[?price>20].name')).toEqual(['Gadget', 'Gizmo']);
        });

        it('default for missing path: user.nonexistent', () => {
            expect(accessor.get('user.nonexistent', 'N/A')).toBe('N/A');
        });

        it('array index: items.0.name', () => {
            expect(accessor.get('items.0.name')).toBe('Widget');
        });
    });

    // YAML must produce the same results as JSON for the same logical data
    describe('YAML accessor queries', () => {
        const accessor = SafeAccess.fromYaml(yamlString);

        it('simple path: user.name', () => {
            expect(accessor.get('user.name')).toBe('Ana');
        });

        it('wildcard: items.*.price', () => {
            expect(accessor.get('items.*.price')).toEqual([10, 50, 25]);
        });

        it('filter: items[?price>20].name', () => {
            expect(accessor.get('items[?price>20].name')).toEqual(['Gadget', 'Gizmo']);
        });

        it('default for missing path: user.nonexistent', () => {
            expect(accessor.get('user.nonexistent', 'N/A')).toBe('N/A');
        });

        it('array index: items.0.name', () => {
            expect(accessor.get('items.0.name')).toBe('Widget');
        });
    });

    // TOML has type constraints (no top-level arrays), so we test a subset
    describe('TOML accessor queries', () => {
        const tomlString = [
            '[user]',
            'name = "Ana"',
            'age = 30',
            '',
            '[[items]]',
            'name = "Widget"',
            'price = 10',
            '',
            '[[items]]',
            'name = "Gadget"',
            'price = 50',
            '',
            '[[items]]',
            'name = "Gizmo"',
            'price = 25',
        ].join('\n');

        const accessor = SafeAccess.fromToml(tomlString);

        it('simple path: user.name', () => {
            expect(accessor.get('user.name')).toBe('Ana');
        });

        it('wildcard: items.*.price', () => {
            expect(accessor.get('items.*.price')).toEqual([10, 50, 25]);
        });

        it('filter: items[?price>20].name', () => {
            expect(accessor.get('items[?price>20].name')).toEqual(['Gadget', 'Gizmo']);
        });

        it('default for missing path: user.nonexistent', () => {
            expect(accessor.get('user.nonexistent', 'N/A')).toBe('N/A');
        });

        it('array index: items.0.name', () => {
            expect(accessor.get('items.0.name')).toBe('Widget');
        });
    });
});
