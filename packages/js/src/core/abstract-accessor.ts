import { DotNotationParser } from './parsers/dot-notation-parser';
import { ArrayOperations } from './operations/array-operations';
import { FormatSerializer } from './rendering/format-serializer';
import { deepFreeze } from './operations/deep-freeze';
import { diff as jsonDiff, applyPatch as jsonApplyPatch } from './operations/json-patch';
import type { JsonPatchOperation } from './operations/json-patch';
import type { AccessorInterface } from '../contracts/accessor.interface';
import { ReadonlyViolationError } from '../exceptions/readonly-violation.error';
import { mask } from '../security/sanitizers/data-masker';
import type { MaskPattern } from '../security/sanitizers/data-masker';
import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
} from '../contracts/schema-adapter.interface';
import { SchemaRegistry } from './registries/schema-registry';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

/**
 * Base class for all format-specific accessors.
 *
 * @remarks
 * In the PHP counterpart, array manipulation and transformation logic is
 * separated into traits (`HasArrayOperations`, `HasTransformations`, etc.
 * under `src/Traits/`). TypeScript does not have native traits, so thin
 * wrappers delegate to {@link ArrayOperations} and {@link FormatSerializer}
 * — effectively serving the same role as PHP's trait composition.
 */
export abstract class AbstractAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> implements AccessorInterface<T> {
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
     *
     * Used internally by all immutable mutation methods to return a new accessor.
     *
     * @param data - The new internal data record for the cloned accessor.
     * @returns A new accessor of the same concrete type.
     */
    abstract clone(data: Record<string, unknown>): AbstractAccessor<T>;

    /**
     * Clones this accessor with `data` while preserving readonly state.
     *
     * When the accessor is readonly, the cloned data is deep-frozen before use.
     *
     * @param data - New internal data record.
     * @returns A new accessor with the same readonly flag as the current instance.
     */
    protected cloneWithState(data: Record<string, unknown>): AbstractAccessor<T> {
        const inst = this.clone(data);
        inst.isReadonly = this.isReadonly;
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
    get<P extends DeepPaths<T> & string>(path: P): ValueAtPath<T, P>;
    get<P extends DeepPaths<T> & string>(
        path: P,
        defaultValue: ValueAtPath<T, P>,
    ): ValueAtPath<T, P>;
    get(path: string, defaultValue?: unknown): unknown;
    get(path: string, bindings: Record<string, string | number>, defaultValue: unknown): unknown;
    get(path: string, defaultOrBindings: unknown = null, defaultValue?: unknown): unknown {
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

    /**
     * Resolves a template path by substituting `{key}` placeholders, then retrieves the value.
     *
     * @param template - Path template with `{key}` placeholders.
     * @param bindings - Key-value pairs to substitute.
     * @param defaultValue - Fallback when the resolved path does not exist.
     * @returns The value at the resolved path, or `defaultValue`.
     */
    getTemplate(
        template: string,
        bindings: Record<string, string | number>,
        defaultValue: unknown = null,
    ): unknown {
        const resolved = DotNotationParser.renderTemplate(template, bindings);
        return DotNotationParser.get(this.data, resolved, defaultValue);
    }

    // ── Array-based Paths ───────────────────────────

    /**
     * Retrieves a value by navigating an array of literal path segments (no wildcards).
     *
     * @param segments - Array of plain key strings forming the path.
     * @param defaultValue - Fallback value when the path does not exist.
     * @returns The resolved value, or `defaultValue`.
     */
    getAt(segments: string[], defaultValue: unknown = null): unknown {
        return DotNotationParser.getBySegments(this.data, segments, defaultValue);
    }

    /**
     * Checks whether a value exists at the given literal path segments.
     *
     * @param segments - Array of plain key strings forming the path.
     * @returns `true` if the path resolves to a defined value.
     */
    hasAt(segments: string[]): boolean {
        const sentinel = Symbol('sentinel');
        return DotNotationParser.getBySegments(this.data, segments, sentinel) !== sentinel;
    }

    /**
     * Sets a value at the given literal path segments. Returns a new accessor.
     *
     * @param segments - Array of plain key strings forming the path.
     * @param value - Value to assign at the terminal segment.
     * @returns A new accessor with the value set.
     */
    setAt(segments: string[], value: unknown): AbstractAccessor<T> {
        return this.mutate(DotNotationParser.setBySegments(this.data, segments, value));
    }
    /**
     * Removes the value at the given literal path segments. Returns a new accessor.
     *
     * @param segments - Array of plain key strings forming the path.
     * @returns A new accessor without the terminal segment.
     */
    removeAt(segments: string[]): AbstractAccessor<T> {
        return this.mutate(DotNotationParser.removeBySegments(this.data, segments));
    }

    /**
     * Retrieves multiple values at once.
     *
     * @param paths - Map of `{ path: defaultValue }` pairs.
     * @returns Map of `{ path: resolvedValue }` pairs.
     */
    getMany(paths: Record<string, unknown>): Record<string, unknown> {
        const results: Record<string, unknown> = {};
        for (const [path, defaultValue] of Object.entries(paths)) {
            results[path] = this.get(path, defaultValue);
        }
        return results;
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
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T> {
        return this.mutate(DotNotationParser.set(this.data, path, value));
    }

    /**
     * Removes the value at `path`. Returns a new (immutable) accessor.
     *
     * @param path - Dot-notation path to remove.
     * @returns A new accessor without the value at `path`.
     * @throws {@link ReadonlyViolationError} When the accessor is frozen.
     */
    remove(path: string): AbstractAccessor<T> {
        return this.mutate(DotNotationParser.remove(this.data, path));
    }

    /**
     * Deep-merges `value` into the data at the root or at a specific `path`.
     *
     * Objects are merged recursively; arrays and primitives are replaced.
     * Returns a new (immutable) accessor.
     */
    merge(value: Record<string, unknown>): AbstractAccessor<T>;
    merge(path: string, value: Record<string, unknown>): AbstractAccessor<T>;
    merge(
        pathOrValue: string | Record<string, unknown>,
        value?: Record<string, unknown>,
    ): AbstractAccessor<T> {
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

    /**
     * Serialises the data to a JSON string.
     *
     * @param pretty - When `true`, output is indented with 2 spaces.
     * @returns JSON-encoded string.
     */
    toJson(pretty = false): string {
        return JSON.stringify(this.data, null, pretty ? 2 : undefined);
    }

    /**
     * Returns a deep clone of the internal data record.
     *
     * The returned object is safe to mutate without affecting this accessor.
     *
     * @returns A structurally cloned plain object.
     */
    toObject(): Record<string, unknown> {
        return structuredClone(this.data);
    }

    // ── Serialization (delegates to FormatSerializer) ──

    /**
     * Serialises the data to TOML. Requires `smol-toml` or a registered TOML plugin.
     *
     * @returns TOML-encoded string.
     */
    toToml(): string {
        return FormatSerializer.toToml(this.data);
    }
    /**
     * Serialises the data to YAML. Requires `js-yaml` or a registered YAML plugin.
     *
     * @returns YAML-encoded string.
     */
    toYaml(): string {
        return FormatSerializer.toYaml(this.data);
    }
    /**
     * Serialises the data to XML.
     *
     * @param rootElement - Name of the XML root element (default `'root'`).
     * @returns XML-encoded string.
     */
    toXml(rootElement = 'root'): string {
        return FormatSerializer.toXml(this.data, rootElement);
    }
    /**
     * Serialises the data to CSV.
     *
     * @param csvMode - Injection-prevention mode (`'none'`, `'prefix'`, `'strip'`, or `'error'`).
     * @returns CSV-encoded string.
     */
    toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string {
        return FormatSerializer.toCsv(this.data, csvMode);
    }
    /**
     * Serialises the data to newline-delimited JSON (NDJSON).
     *
     * @returns One JSON object per line.
     */
    toNdjson(): string {
        return FormatSerializer.toNdjson(this.data);
    }
    /**
     * Dispatches serialisation to the plugin registered for `format`.
     *
     * @param format - Target format name (e.g. `'ini'`, `'env'`).
     * @returns The serialised string.
     * @throws {@link Error} When no serializer is registered for `format`.
     */
    transform(format: string): string {
        return FormatSerializer.transform(this.data, format);
    }

    // ── Schema, diff, masking ───────────────────────

    /**
     * Returns a new accessor with sensitive keys replaced by `[REDACTED]`.
     *
     * @param patterns - Key name patterns to mask (supports wildcards).
     * @returns A new accessor with masked data.
     */
    mask(patterns?: MaskPattern[]): AbstractAccessor<T> {
        return this.cloneWithState(mask(this.data, patterns));
    }

    /**
     * Validates the data against `schema` using the provided or default adapter.
     *
     * Returns a {@link SchemaValidationResult} — check `result.valid` to determine success.
     * Does not throw on validation failure; throws only when no adapter is configured.
     *
     * @param schema - Schema definition passed to the adapter.
     * @param adapter - Adapter to use; falls back to the globally registered default.
     * @returns Result carrying `valid` flag and any `errors`.
     * @throws {Error} When no adapter is provided and no default is set.
     */
    validate<TSchema = unknown>(
        schema: TSchema,
        adapter?: SchemaAdapterInterface<TSchema>,
    ): SchemaValidationResult {
        const resolvedAdapter =
            adapter ??
            (SchemaRegistry.getDefaultAdapter() as SchemaAdapterInterface<TSchema> | null);
        if (!resolvedAdapter) {
            throw new Error(
                'No schema adapter provided. Pass an adapter or set a default via SchemaRegistry.setDefaultAdapter().',
            );
        }
        return resolvedAdapter.validate(this.data, schema);
    }

    /** Computes an RFC 6902 JSON Patch diff between this accessor and `other`. */
    diff(other: AbstractAccessor): JsonPatchOperation[] {
        return jsonDiff(this.data, other.all());
    }

    /** Applies an RFC 6902 JSON Patch to the data. Returns a new accessor. */
    applyPatch(ops: JsonPatchOperation[]): AbstractAccessor<T> {
        return this.mutate(jsonApplyPatch(this.data, ops));
    }

    // ── Array Operations (delegates to ArrayOperations) ──

    /**
     * Appends items to the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param items - Items to append.
     * @returns A new accessor with the updated array.
     */
    push(path: string, ...items: unknown[]): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.push(this.data, path, ...items));
    }
    /**
     * Removes the last element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @returns A new accessor with the shortened array.
     */
    pop(path: string): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.pop(this.data, path));
    }
    /**
     * Removes the first element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @returns A new accessor with the shortened array.
     */
    shift(path: string): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.shift(this.data, path));
    }
    /**
     * Prepends items to the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param items - Items to prepend.
     * @returns A new accessor with the updated array.
     */
    unshift(path: string, ...items: unknown[]): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.unshift(this.data, path, ...items));
    }
    /**
     * Inserts items at `index` within the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param index - Position at which to insert (negative counts from the end).
     * @param items - Items to insert.
     * @returns A new accessor with the updated array.
     */
    insert(path: string, index: number, ...items: unknown[]): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.insert(this.data, path, index, ...items));
    }
    /**
     * Filters the array at `path` using `predicate`.
     *
     * @param path - Dot-notation path to an array.
     * @param predicate - Function receiving each element and its index; return `true` to keep.
     * @returns A new accessor with the filtered array.
     */
    filterAt(
        path: string,
        predicate: (item: unknown, index: number) => boolean,
    ): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.filterAt(this.data, path, predicate));
    }
    /**
     * Maps each element of the array at `path` through `transform`.
     *
     * @param path - Dot-notation path to an array.
     * @param transform - Function receiving each element and its index; returns the replacement.
     * @returns A new accessor with the mapped array.
     */
    mapAt(path: string, transform: (item: unknown, index: number) => unknown): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.mapAt(this.data, path, transform));
    }
    /**
     * Sorts the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to sort by.
     * @param direction - Sort direction (`'asc'` or `'desc'`, default `'asc'`).
     * @returns A new accessor with the sorted array.
     */
    sortAt(path: string, key?: string, direction: 'asc' | 'desc' = 'asc'): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.sortAt(this.data, path, key, direction));
    }
    /**
     * Removes duplicate elements from the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param key - Optional object key to base uniqueness on.
     * @returns A new accessor with de-duplicated elements.
     */
    unique(path: string, key?: string): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.unique(this.data, path, key));
    }
    /**
     * Flattens the array at `path` to the given `depth`.
     *
     * @param path - Dot-notation path to an array.
     * @param depth - Flatten depth (default `1`).
     * @returns A new accessor with the flattened array.
     */
    flatten(path: string, depth = 1): AbstractAccessor<T> {
        return this.mutate(ArrayOperations.flatten(this.data, path, depth));
    }
    /**
     * Returns the first element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Fallback when the array is empty or absent.
     * @returns The first element, or `defaultValue`.
     */
    first(path: string, defaultValue: unknown = null): unknown {
        return ArrayOperations.first(this.data, path, defaultValue);
    }
    /**
     * Returns the last element of the array at `path`.
     *
     * @param path - Dot-notation path to an array.
     * @param defaultValue - Fallback when the array is empty or absent.
     * @returns The last element, or `defaultValue`.
     */
    last(path: string, defaultValue: unknown = null): unknown {
        return ArrayOperations.last(this.data, path, defaultValue);
    }
    /**
     * Returns the element at position `index` within the array at `path`.
     *
     * Negative indices count from the end.
     *
     * @param path - Dot-notation path to an array.
     * @param index - Position (negative counts from end).
     * @param defaultValue - Fallback when index is out of range.
     * @returns The element at `index`, or `defaultValue`.
     */
    nth(path: string, index: number, defaultValue: unknown = null): unknown {
        return ArrayOperations.nth(this.data, path, index, defaultValue);
    }

    /**
     * Creates a new mutated accessor, guarding against readonly violations.
     *
     * @param newData - The updated data record.
     * @returns A new accessor carrying `newData`.
     * @throws {@link ReadonlyViolationError} When the accessor is frozen.
     */
    private mutate(newData: Record<string, unknown>): AbstractAccessor<T> {
        if (this.isReadonly) throw new ReadonlyViolationError();
        return this.cloneWithState(newData);
    }
}
