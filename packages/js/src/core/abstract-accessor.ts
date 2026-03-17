import type yaml from 'js-yaml';
import type { stringify as tomlStringify } from 'smol-toml';
import { optionalRequire } from './optional-require';
import { DotNotationParser } from './dot-notation-parser';
import { PluginRegistry } from './plugin-registry';
import { deepFreeze } from './deep-freeze';

const getYaml = optionalRequire<typeof yaml>('js-yaml', 'YAML');
const getSmolToml = optionalRequire<{ stringify: typeof tomlStringify }>('smol-toml', 'TOML');
import { diff as jsonDiff, applyPatch as jsonApplyPatch } from './json-patch';
import type { JsonPatchOp } from './json-patch';
import type { AccessorInterface } from '../contracts/accessor.interface';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { ReadonlyViolationError } from '../exceptions/readonly-violation.error';
import { mask } from './data-masker';
import type { MaskPattern } from './data-masker';
import type { SchemaAdapterInterface } from '../contracts/schema-adapter.interface';
import { SchemaValidationError } from '../exceptions/schema-validation.error';
import { SchemaRegistry } from './schema-registry';
import { getGlobalPolicy } from './security-policy';
import { sanitizeCsvCell } from './csv-sanitizer';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

export abstract class AbstractAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> implements AccessorInterface<T> {
    protected data: Record<string, unknown> = {};
    protected raw: unknown;
    protected isReadonly: boolean;

    constructor(raw: unknown, options?: { readonly?: boolean }) {
        this.raw = raw;
        this.isReadonly = options?.readonly ?? false;
        this.data = this.parse(raw);
        if (this.isReadonly) {
            deepFreeze(this.data);
        }
    }

    protected abstract parse(raw: unknown): Record<string, unknown>;
    abstract clone(data: Record<string, unknown>): AbstractAccessor<T>;

    protected cloneWithState(data: Record<string, unknown>): AbstractAccessor<T> {
        const inst = this.clone(data);
        inst.isReadonly = this.isReadonly;
        if (inst.isReadonly) {
            deepFreeze(inst.data);
        }
        return inst;
    }

    get<P extends DeepPaths<T> & string>(path: P): ValueAtPath<T, P>;
    get<P extends DeepPaths<T> & string>(
        path: P,
        defaultValue: ValueAtPath<T, P>,
    ): ValueAtPath<T, P>;
    get(path: string, defaultValue?: unknown): unknown;
    get(path: string, bindings: Record<string, string | number>, defaultValue: unknown): unknown;
    get(path: string, defaultOrBindings: unknown = null, defaultValue?: unknown): unknown {
        // If second arg is a bindings object and path contains template placeholders
        if (
            defaultOrBindings !== null &&
            typeof defaultOrBindings === 'object' &&
            !Array.isArray(defaultOrBindings) &&
            path.includes('{')
        ) {
            const resolved = DotNotationParser.renderTemplate(
                path,
                defaultOrBindings as Record<string, string | number>,
            );
            return DotNotationParser.get(this.data, resolved, defaultValue ?? null);
        }
        return DotNotationParser.get(this.data, path, defaultOrBindings);
    }

    getTemplate(
        template: string,
        bindings: Record<string, string | number>,
        defaultValue: unknown = null,
    ): unknown {
        const resolved = DotNotationParser.renderTemplate(template, bindings);
        return DotNotationParser.get(this.data, resolved, defaultValue);
    }

    // ── Array-based Paths ───────────────────────────

    getAt(segments: string[], defaultValue: unknown = null): unknown {
        return DotNotationParser.getBySegments(this.data, segments, defaultValue);
    }

    hasAt(segments: string[]): boolean {
        const sentinel = Symbol('sentinel');
        return DotNotationParser.getBySegments(this.data, segments, sentinel) !== sentinel;
    }

    setAt(segments: string[], value: unknown): AbstractAccessor<T> {
        this.assertNotReadonly();
        const newData = DotNotationParser.setBySegments(this.data, segments, value);
        return this.cloneWithState(newData);
    }

    removeAt(segments: string[]): AbstractAccessor<T> {
        this.assertNotReadonly();
        const newData = DotNotationParser.removeBySegments(this.data, segments);
        return this.cloneWithState(newData);
    }

    getMany(paths: Record<string, unknown>): Record<string, unknown> {
        const results: Record<string, unknown> = {};
        for (const [path, defaultValue] of Object.entries(paths)) {
            results[path] = this.get(path, defaultValue);
        }
        return results;
    }

    has(path: string): boolean {
        return DotNotationParser.has(this.data, path);
    }

    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T> {
        this.assertNotReadonly();
        const newData = DotNotationParser.set(this.data, path, value);
        return this.cloneWithState(newData);
    }

    remove(path: string): AbstractAccessor<T> {
        this.assertNotReadonly();
        const newData = DotNotationParser.remove(this.data, path);
        return this.cloneWithState(newData);
    }

    merge(value: Record<string, unknown>): AbstractAccessor<T>;
    merge(path: string, value: Record<string, unknown>): AbstractAccessor<T>;
    merge(
        pathOrValue: string | Record<string, unknown>,
        value?: Record<string, unknown>,
    ): AbstractAccessor<T> {
        this.assertNotReadonly();
        if (typeof pathOrValue === 'string') {
            const newData = DotNotationParser.merge(this.data, pathOrValue, value!);
            return this.cloneWithState(newData);
        }
        const newData = DotNotationParser.merge(this.data, '', pathOrValue);
        return this.cloneWithState(newData);
    }

    type(path: string): string | null {
        if (!this.has(path)) return null;
        const val = this.get(path);
        return Array.isArray(val) ? 'array' : typeof val;
    }

    count(path?: string): number {
        const target = path ? this.get(path, []) : this.data;
        if (Array.isArray(target)) return target.length;
        if (typeof target === 'object' && target !== null) return Object.keys(target).length;
        return 0;
    }

    keys(path?: string): string[] {
        const target = path ? this.get(path, {}) : this.data;
        if (typeof target === 'object' && target !== null) return Object.keys(target);
        return [];
    }

    all(): Record<string, unknown> {
        return { ...this.data };
    }

    toArray(): Record<string, unknown> {
        return { ...this.data };
    }

    toJson(pretty = false): string {
        return JSON.stringify(this.data, null, pretty ? 2 : undefined);
    }

    toObject(): Record<string, unknown> {
        return structuredClone(this.data);
    }

    toToml(): string {
        if (PluginRegistry.hasSerializer('toml')) {
            return PluginRegistry.getSerializer('toml').serialize(this.data);
        }

        try {
            return getSmolToml().stringify(this.data);
        } catch (e) {
            throw new InvalidFormatError(`toToml() failed to serialize data: ${String(e)}`);
        }
    }

    toYaml(): string {
        if (PluginRegistry.hasSerializer('yaml')) {
            return PluginRegistry.getSerializer('yaml').serialize(this.data);
        }

        return getYaml().dump(this.data);
    }

    toXml(rootElement = 'root'): string {
        if (!/^[a-zA-Z_][\w.-]*$/.test(rootElement)) {
            throw new InvalidFormatError(`Invalid XML root element name: '${rootElement}'`);
        }

        if (PluginRegistry.hasSerializer('xml')) {
            return PluginRegistry.getSerializer('xml').serialize(this.data);
        }

        return `<?xml version="1.0"?>\n<${rootElement}>${AbstractAccessor.objectToXml(this.data)}</${rootElement}>\n`;
    }

    private static escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    private static objectToXml(data: Record<string, unknown>): string {
        let xml = '';
        for (const [key, value] of Object.entries(data)) {
            const safeKey = /^\d+$/.test(key) ? `item_${key}` : key;
            if (value !== null && typeof value === 'object') {
                xml += `<${safeKey}>${AbstractAccessor.objectToXml(value as Record<string, unknown>)}</${safeKey}>`;
            } else {
                const strValue =
                    value != null &&
                    (typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean')
                        ? String(value)
                        : '';
                xml += `<${safeKey}>${AbstractAccessor.escapeXml(strValue)}</${safeKey}>`;
            }
        }
        return xml;
    }

    transform(format: string): string {
        if (PluginRegistry.hasSerializer(format)) {
            return PluginRegistry.getSerializer(format).serialize(this.data);
        }

        // Fall back to built-in serializers for YAML and TOML
        if (format === 'yaml') return this.toYaml();
        if (format === 'toml') return this.toToml();
        if (format === 'csv') return this.toCsv();

        return PluginRegistry.getSerializer(format).serialize(this.data);
    }

    toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string {
        const mode = csvMode ?? getGlobalPolicy()?.csvMode ?? 'none';
        const rows = Object.values(this.data);
        if (rows.length === 0) return '';

        const firstRow = rows[0] as Record<string, unknown>;
        const headers = Object.keys(firstRow);
        const sanitize = (cell: string): string => sanitizeCsvCell(cell, mode);
        const escapeCsv = (val: unknown): string => {
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        const lines = [headers.map((h) => escapeCsv(sanitize(h))).join(',')];
        for (const row of rows) {
            const r = row as Record<string, unknown>;
            lines.push(headers.map((h) => escapeCsv(sanitize(String(r[h] ?? '')))).join(','));
        }
        return lines.join('\n');
    }

    toNdjson(): string {
        const values = Object.values(this.data);
        return values.map((v) => JSON.stringify(v)).join('\n');
    }

    masked(patterns?: MaskPattern[]): AbstractAccessor<T> {
        const maskedData = mask(this.data, patterns);
        return this.cloneWithState(maskedData);
    }

    validate<TSchema = unknown>(schema: TSchema, adapter?: SchemaAdapterInterface<TSchema>): this {
        const resolvedAdapter =
            adapter ??
            (SchemaRegistry.getDefaultAdapter() as SchemaAdapterInterface<TSchema> | null);
        if (!resolvedAdapter) {
            throw new Error(
                'No schema adapter provided. Pass an adapter or set a default via SchemaRegistry.setDefaultAdapter().',
            );
        }
        const result = resolvedAdapter.validate(this.data, schema);
        if (!result.valid) {
            throw new SchemaValidationError(result.errors);
        }
        return this;
    }

    diff(other: AbstractAccessor): JsonPatchOp[] {
        return jsonDiff(this.data, other.all());
    }

    applyPatch(ops: JsonPatchOp[]): AbstractAccessor<T> {
        this.assertNotReadonly();
        const newData = jsonApplyPatch(this.data, ops);
        return this.cloneWithState(newData);
    }

    // ── Array Operations (immutable) ────────────────

    push(path: string, ...items: unknown[]): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, [...arr, ...items]);
    }

    pop(path: string): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, arr.slice(0, -1));
    }

    shift(path: string): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, arr.slice(1));
    }

    unshift(path: string, ...items: unknown[]): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, [...items, ...arr]);
    }

    insert(path: string, index: number, ...items: unknown[]): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        const idx = index < 0 ? Math.max(0, arr.length + index) : index;
        const result = [...arr.slice(0, idx), ...items, ...arr.slice(idx)];
        return this.setInternal(path, result);
    }

    filterAt(
        path: string,
        predicate: (item: unknown, index: number) => boolean,
    ): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, arr.filter(predicate));
    }

    mapAt(path: string, transform: (item: unknown, index: number) => unknown): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, arr.map(transform));
    }

    sortAt(path: string, key?: string, direction: 'asc' | 'desc' = 'asc'): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = [...this.ensureArray(path)];
        const dir = direction === 'desc' ? -1 : 1;
        arr.sort((a, b) => {
            const va = key ? (a as Record<string, unknown>)?.[key] : a;
            const vb = key ? (b as Record<string, unknown>)?.[key] : b;
            if (va === vb) return 0;
            if (va === undefined || va === null) return dir;
            if (vb === undefined || vb === null) return -dir;
            return va < vb ? -dir : dir;
        });
        return this.setInternal(path, arr);
    }

    unique(path: string, key?: string): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        if (key) {
            const seen = new Set<unknown>();
            const result = arr.filter((item) => {
                const val = (item as Record<string, unknown>)?.[key];
                if (seen.has(val)) return false;
                seen.add(val);
                return true;
            });
            return this.setInternal(path, result);
        }
        return this.setInternal(path, [...new Set(arr)]);
    }

    flatten(path: string, depth = 1): AbstractAccessor<T> {
        this.assertNotReadonly();
        const arr = this.ensureArray(path);
        return this.setInternal(path, arr.flat(depth));
    }

    first(path: string, defaultValue: unknown = null): unknown {
        const arr = this.getArrayOrEmpty(path);
        return arr.length > 0 ? arr[0] : defaultValue;
    }

    last(path: string, defaultValue: unknown = null): unknown {
        const arr = this.getArrayOrEmpty(path);
        return arr.length > 0 ? arr[arr.length - 1] : defaultValue;
    }

    nth(path: string, index: number, defaultValue: unknown = null): unknown {
        const arr = this.getArrayOrEmpty(path);
        const idx = index < 0 ? arr.length + index : index;
        return idx >= 0 && idx < arr.length ? arr[idx] : defaultValue;
    }

    private ensureArray(path: string): unknown[] {
        const value = this.get(path);
        if (!Array.isArray(value)) {
            throw new InvalidFormatError(`Value at path '${path}' is not an array.`);
        }
        return value;
    }

    private getArrayOrEmpty(path: string): unknown[] {
        const value = this.get(path);
        return Array.isArray(value) ? value : [];
    }

    private setInternal(path: string, value: unknown): AbstractAccessor<T> {
        const newData = DotNotationParser.set(this.data, path, value);
        return this.cloneWithState(newData);
    }

    private assertNotReadonly(): void {
        if (this.isReadonly) {
            throw new ReadonlyViolationError();
        }
    }
}
