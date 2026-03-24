import { DotNotationParser } from './parsers/dot-notation-parser';
import { deepFreeze } from './operations/deep-freeze';
import type { AccessorInterface } from '../contracts/accessor.interface';
import { ReadonlyViolationError } from '../exceptions/readonly-violation.error';
import { TypeCastingMixin } from './mixins/type-casting.mixin';
import type { ToJsonOptions } from '../contracts/accessor.interface';

/**
 * Base class for all format-specific accessors.
 *
 * @remarks
 * Functionality is decomposed into a mixin chain:
 * {@link SegmentPathMixin} → {@link TypeCastingMixin} → `AbstractAccessor`.
 */
export abstract class AbstractAccessor<T extends Record<string, unknown> = Record<string, unknown>>
    extends TypeCastingMixin
    implements AccessorInterface<T>
{
    protected data: Record<string, unknown> = {};
    protected raw: unknown;
    protected isReadonly: boolean;

    /**
     * Constructs a new accessor from raw input data.
     *
     * @param raw - Raw input (string content, plain object, or array).
     * @param options - Optional configuration; set `readonly: true` to freeze the data.
     */
    constructor(raw: unknown, options?: { readonly?: boolean }) {
        super();
        this.raw = raw;
        this.isReadonly = options?.readonly ?? false;
        this.data = this.parse(raw);
        if (this.isReadonly) {
            deepFreeze(this.data);
        }
    }

    /**
     * Parses `raw` input into an internal plain data record.
     *
     * Implemented by each format-specific subclass (e.g. JSON, YAML, TOML).
     *
     * @param raw - Raw input value as received by the constructor.
     * @returns A plain `Record<string, unknown>` representing the parsed data.
     */
    protected abstract parse(raw: unknown): Record<string, unknown>;

    /**
     * Creates a new instance of this accessor carrying `data` as its internal state.
     * Used internally by all immutable mutation methods to return a new accessor.
     *
     * @param data - The new internal data record for the cloned accessor. Defaults to `{}`.
     * @returns A new accessor of the same concrete type.
     */
    protected abstract clone(data?: Record<string, unknown>): AbstractAccessor<T>;

    /**
     * Clones this accessor with `data` while preserving readonly state.
     *
     * When the accessor is readonly, the cloned data is deep-frozen before use.
     *
     * @param data - New internal data record.
     * @param forceReadonly - When `true`, the resulting clone is made readonly.
     * @returns A new accessor with the same readonly flag as the current instance.
     */
    protected cloneWithState(data: Record<string, unknown>, forceReadonly = false): this {
        // When forcing readonly on a previously mutable accessor, clone the data
        // to prevent deepFreeze from also freezing the caller's mutable copy.
        const cloneData = forceReadonly && !this.isReadonly ? structuredClone(data) : data;
        const inst = this.clone(cloneData) as this;
        inst.isReadonly = forceReadonly || this.isReadonly;
        if (inst.isReadonly) {
            deepFreeze(inst.data);
        }
        return inst;
    }

    /**
     * Retrieves a value at the given dot-notation path.
     *
     * When called with a template path containing `{key}` placeholders and a bindings
     * object, placeholders are resolved before lookup.
     *
     * @param path - Dot-notation path (supports wildcards, filters, and recursive descent).
     * @param defaultValue - Value returned when the path does not exist.
     * @returns The value at `path`, or `defaultValue`.
     */
    get(path: string, defaultOrBindings: unknown = null): unknown {
        return DotNotationParser.get(this.data, path, defaultOrBindings);
    }

    /**
     * Returns `true` if a value exists at the given dot-notation path.
     *
     * @param path - Dot-notation path to check.
     * @returns `true` if the path resolves to a defined value.
     */
    has(path: string): boolean {
        return DotNotationParser.has(this.data, path);
    }

    /**
     * Sets a value at the given dot-notation path. Returns a new (immutable) accessor.
     *
     * @param path - Dot-notation path.
     * @param value - Value to set.
     * @returns A new accessor reflecting the change.
     * @throws {@link ReadonlyViolationError} If this accessor is frozen.
     */
    set(path: string, value: unknown): this {
        return this.mutate(DotNotationParser.set(this.data, path, value));
    }

    /**
     * Removes the value at `path`. Returns a new (immutable) accessor.
     *
     * @param path - Dot-notation path to remove.
     * @returns A new accessor without the value at `path`.
     * @throws {@link ReadonlyViolationError} When the accessor is frozen.
     */
    remove(path: string): this {
        return this.mutate(DotNotationParser.remove(this.data, path));
    }

    /**
     * Deep-merges `value` into the data at the root or at a specific `path`.
     *
     * Objects are merged recursively; arrays and primitives are replaced.
     * Returns a new (immutable) accessor.
     */
    merge(value: Record<string, unknown>): this;
    merge(path: string, value: Record<string, unknown>): this;
    merge(pathOrValue: string | Record<string, unknown>, value?: Record<string, unknown>): this {
        if (typeof pathOrValue === 'string')
            return this.mutate(DotNotationParser.merge(this.data, pathOrValue, value!));
        return this.mutate(DotNotationParser.merge(this.data, '', pathOrValue));
    }

    /**
     * Returns the JS type name of the value at `path`, or `null` if the path does not exist.
     *
     * Possible return values: `'string'`, `'number'`, `'boolean'` (`'bool'`), `'array'`,
     * `'object'`, `'null'`.
     *
     * @param path - Dot-notation path to inspect.
     * @returns Type name string, or `null` when the path does not exist.
     */
    type(path: string): string | null {
        if (!this.has(path)) return null;
        const val = this.get(path);
        if (val === null) return 'null';
        if (Array.isArray(val)) return 'array';
        const t = typeof val;
        if (t === 'boolean') return 'bool';
        return t;
    }

    /**
     * Returns the number of elements in the array or keys in the object at `path`.
     *
     * When `path` is omitted, counts keys at the root level.
     *
     * @param path - Optional dot-notation path.
     * @returns Count of elements or keys.
     */
    count(path?: string): number {
        const target = path ? this.get(path, []) : this.data;
        if (Array.isArray(target)) return target.length;
        if (typeof target === 'object' && target !== null) return Object.keys(target).length;
        return 0;
    }

    /**
     * Returns the property names of the object at `path`.
     *
     * When `path` is omitted, returns keys at the root level.
     *
     * @param path - Optional dot-notation path.
     * @returns Array of key name strings.
     */
    keys(path?: string): string[] {
        const target = path ? this.get(path, {}) : this.data;
        if (typeof target === 'object' && target !== null) return Object.keys(target);
        return [];
    }

    /**
     * Returns a shallow copy of the internal data record.
     *
     * @returns A new plain object with the top-level keys of the internal data.
     */
    all(): Record<string, unknown> {
        return { ...this.data };
    }

    /**
     * Alias of {@link all}. Returns a shallow copy of the internal data record.
     *
     * @returns A new plain object with the top-level keys of the internal data.
     */
    toArray(): Record<string, unknown> {
        return { ...this.data };
    }

    // ── JSON I/O ─────────────────────────────────────────────────────────────────

    /**
     * Serialises the data to a JSON string.
     *
     * @param pretty - When `true`, output is indented with 2 spaces (or `options.space`).
     * @param options - Optional output controls: unescape unicode/slashes, custom indent.
     *
     * **PHP alignment:** PHP's `json_encode()` escapes `/` and `\uXXXX` depending on flags.
     * Pass `{ unescapeUnicode: true, unescapeSlashes: true }` to match PHP defaults
     * (`JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES`).
     *
     * @returns JSON-encoded string.
     */
    toJson(pretty = false, options?: ToJsonOptions): string {
        const space = options?.space ?? (pretty ? 2 : undefined);
        let json = JSON.stringify(this.data, null, space);
        if (options?.unescapeUnicode === true) {
            json = json.replace(/\\u([0-9a-fA-F]{4})/g, (_, code: string) =>
                String.fromCodePoint(parseInt(code, 16)),
            );
        }
        if (options?.unescapeSlashes === true) {
            json = json.replace(/\\\//g, '/');
        }
        return json;
    }

    /**
     * Returns a frozen copy of this accessor.
     * All subsequent write operations will throw a {@link ReadonlyViolationError}.
     *
     * @returns A new readonly accessor with the same data.
     */
    freeze(): this {
        return this.cloneWithState(this.data, true);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * Creates a new mutated accessor, guarding against readonly violations.
     *
     * Changed from `private` to `protected` to allow mixin chain access via
     * {@link SegmentPathMixin}.
     *
     * @param newData - The updated data record.
     * @returns A new accessor carrying `newData`.
     * @throws {@link ReadonlyViolationError} When the accessor is frozen.
     */
    protected mutate(newData: Record<string, unknown>): this {
        if (this.isReadonly) throw new ReadonlyViolationError();
        return this.cloneWithState(newData);
    }
}
