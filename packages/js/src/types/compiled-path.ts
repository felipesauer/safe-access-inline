import type { Segment } from '../core/parsers/segment-parser';

/**
 * Opaque container for a pre-compiled dot-notation path.
 *
 * Segments are parsed once via {@link SafeAccess.compilePath} and reused across
 * multiple {@link AbstractAccessor.getCompiled} calls, avoiding repeated tokenization
 * of the same path string.
 *
 * @remarks
 * `CompiledPath` is intentionally opaque — consumers should treat it as an opaque
 * handle and pass it directly to {@link AbstractAccessor.getCompiled}. The internal
 * `_segments` array is prefixed with `_` to signal that it is not part of the
 * public API.
 */
export class CompiledPath {
    /**
     * Pre-parsed segment array.
     *
     * @internal Only {@link AbstractAccessor.getCompiled} should read this.
     */
    readonly _segments: Segment[];

    /**
     * Constructs a `CompiledPath` from a pre-parsed segment array.
     *
     * @internal Use {@link SafeAccess.compilePath} instead of constructing directly.
     * @param segments - Pre-parsed path segments from {@link SegmentParser.parseSegments}.
     */
    constructor(segments: Segment[]) {
        this._segments = segments;
    }
}
