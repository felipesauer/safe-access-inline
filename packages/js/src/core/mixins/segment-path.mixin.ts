import { DotNotationParser } from '../parsers/dot-notation-parser';

/**
 * @internal
 * Abstract mixin providing low-level segment/compiled-path accessors
 * for {@link AbstractAccessor} subclasses.
 *
 * Extracted from `abstract-accessor.ts` to separate concerns.
 * Do not extend this class directly — use {@link AbstractAccessor}.
 */
export abstract class SegmentPathMixin {
    /** @internal Internal data record accessed by segment-path methods. */
    protected abstract data: Record<string, unknown>;

    /**
     * Creates a new accessor from mutated `newData`.
     *
     * Guarding against readonly violations is the responsibility of the concrete implementation.
     *
     * @internal
     */
    protected abstract mutate(newData: Record<string, unknown>): this;

    // ── Compiled & segment-based paths ───────────────────────────────────────

    /**

     * Retrieves a value at the given literal path segments (no dot-notation parsing).
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
    setAt(segments: string[], value: unknown): this {
        return this.mutate(DotNotationParser.setBySegments(this.data, segments, value));
    }

    /**
     * Removes the value at the given literal path segments. Returns a new accessor.
     *
     * @param segments - Array of plain key strings forming the path.
     * @returns A new accessor without the terminal segment.
     */
    removeAt(segments: string[]): this {
        return this.mutate(DotNotationParser.removeBySegments(this.data, segments));
    }
}
