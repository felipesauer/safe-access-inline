/**
 * A single step in the result of {@link AbstractAccessor.trace}.
 *
 * Each entry corresponds to one parsed segment of the dot-notation path.
 * Segments after the first missing one are not included in the result array.
 */
export interface TraceSegment {
    /** String representation of this segment (key name, `[*]`, `[?...]`, etc.). */
    readonly segment: string;
    /** `true` when the segment resolved to a defined value. */
    readonly found: boolean;
    /**
     * JavaScript type of the resolved value, or `null` when `found` is `false`.
     *
     * Possible values: `'object'`, `'array'`, `'string'`, `'number'`, `'boolean'`, `'null'`.
     */
    readonly type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | null;
}
