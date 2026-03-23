import { DotNotationParser } from './parsers/dot-notation-parser';
import { deepFreeze } from './operations/deep-freeze';
import {
    diff as jsonDiff,
    applyPatch as jsonApplyPatch,
    validatePatch as jsonValidatePatch,
} from './operations/json-patch';
import type { JsonPatchOperation } from './operations/json-patch';
import type { AccessorInterface } from '../contracts/accessor.interface';
import type { CacheInterface } from '../contracts/cache.interface';
import { ReadonlyViolationError } from '../exceptions/readonly-violation.error';
import { mask } from '../security/sanitizers/data-masker';
import type { MaskPattern } from '../security/sanitizers/data-masker';
import type {
    SchemaAdapterInterface,
    SchemaValidationResult,
} from '../contracts/schema-adapter.interface';
import { SchemaRegistry } from './registries/schema-registry';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';
import { DebugMixin } from './mixins/debug.mixin';

/**
 * Base class for all format-specific accessors.
 *
 * @remarks
 * In the PHP counterpart, array manipulation and transformation logic is
 * separated into traits (`HasArrayOperations`, `HasTransformations`, etc.
 * under `src/Traits/`). TypeScript does not have native traits, so thin
 * wrappers delegate to {@link ArrayOperations} and {@link FormatSerializer}
 * — effectively serving the same role as PHP's trait composition.
 *
 * Functionality is decomposed into a mixin chain:
 * {@link ArrayOperationsMixin} → {@link TypeCastingMixin} → {@link SerializationMixin} → {@link DebugMixin} → `AbstractAccessor`.
 */
export abstract class AbstractAccessor<T extends Record<string, unknown> = Record<string, unknown>>
    extends DebugMixin
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
     * When a binding value begins with `@`, the remainder is treated as a dot-notation path
     * resolved against the accessor's data. If the path resolves to `null` or `undefined`,
     * `defaultValue` is returned immediately.
     *
     * @param template - Path template with `{key}` placeholders.
     * @param bindings - Key-value pairs to substitute; values starting with `@` are resolved
     *   as paths within the accessor's data.
     * @param defaultValue - Fallback when the resolved path does not exist.
     * @returns The value at the resolved path, or `defaultValue`.
     */
    getTemplate(
        template: string,
        bindings: Record<string, string | number>,
        defaultValue: unknown = null,
    ): unknown {
        const resolvedBindings: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(bindings)) {
            if (typeof value === 'string' && value.startsWith('@')) {
                const pathValue = this.get(value.slice(1));
                if (pathValue === null || pathValue === undefined) return defaultValue;
                resolvedBindings[key] =
                    typeof pathValue === 'number' ? pathValue : String(pathValue);
            } else {
                resolvedBindings[key] = value;
            }
        }
        const rendered = DotNotationParser.renderTemplate(template, resolvedBindings);
        return DotNotationParser.get(this.data, rendered, defaultValue);
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
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): this;
    set(path: string, value: unknown): this;
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

    // ── Security, schema & diff ───────────────────────────────────────────────

    /**
     * Returns a new accessor with sensitive keys replaced by `[REDACTED]`.
     *
     * @param patterns - Key name patterns to mask (supports wildcards).
     * @returns A new accessor with masked data.
     */
    mask(patterns?: MaskPattern[]): this {
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

    /**
     * Computes an RFC 6902 JSON Patch diff between this accessor and `other`.
     *
     * @param other - The accessor to diff against.
     * @returns Array of JSON Patch operations representing the difference.
     */
    diff(other: AbstractAccessor): JsonPatchOperation[] {
        return jsonDiff(this.data, other.all());
    }

    /**
     * Applies an RFC 6902 JSON Patch to the data. Returns a new accessor.
     *
     * @param ops - Array of JSON Patch operations to apply.
     * @returns A new accessor with the patch applied.
     */
    applyPatch(ops: JsonPatchOperation[]): this {
        return this.mutate(jsonApplyPatch(this.data, ops));
    }

    /**
     * Validates a list of RFC 6902 JSON Patch operations.
     *
     * @param ops - Array of operations to validate.
     * @throws {Error} When any operation is structurally invalid.
     */
    validatePatch(ops: JsonPatchOperation[]): void {
        jsonValidatePatch(ops);
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

    // ── Cache helpers ─────────────────────────────────────────────────────────

    /**
     * Returns a cached version of this accessor or stores the current data and returns itself.
     *
     * @param cache - Cache instance implementing CacheInterface.
     * @param ttl - Time-to-live in seconds.
     * @param key - Cache key.
     * @returns This instance (cache miss) or a new instance hydrated from cache (cache hit).
     */
    remember(cache: CacheInterface, ttl: number, key: string): this {
        const cached = cache.get(key);
        if (cached !== undefined && cached !== null && typeof cached === 'object') {
            return this.mutate(cached as Record<string, unknown>);
        }
        cache.set(key, this.all(), ttl);
        return this;
    }

    /**
     * Removes the cached representation of this accessor from the cache.
     *
     * @param cache - Cache instance implementing CacheInterface.
     * @param key - Cache key to delete.
     */
    forget(cache: CacheInterface, key: string): void {
        cache.delete(key);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /**
     * Creates a new mutated accessor, guarding against readonly violations.
     *
     * Changed from `private` to `protected` to allow mixin chain access via
     * {@link ArrayOperationsMixin}.
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
