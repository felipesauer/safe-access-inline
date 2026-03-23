import { SerializationMixin } from './serialization.mixin';
import { SegmentParser } from '../parsers/segment-parser';
import type { Segment } from '../parsers/segment-parser';
import { PathResolver } from '../resolvers/path-resolver';
import { SegmentType } from '../../enums/segment-type.enum';
import type { TraceSegment } from '../../contracts/trace-segment.interface';

/**
 * @internal
 * Abstract mixin providing path-tracing debug utilities for {@link AbstractAccessor} subclasses.
 *
 * Extracted from `abstract-accessor.ts` to separate concerns.
 * Do not extend this class directly — use {@link AbstractAccessor}.
 */
export abstract class DebugMixin extends SerializationMixin {
    /**
     * Walks `path` segment by segment and reports the resolution status of each.
     *
     * Useful for diagnosing why a deeply nested path returns `null`.
     * Never throws — always returns an array, even for entirely invalid paths.
     * Stops at the first missing segment; subsequent segments are not evaluated.
     *
     * @param path - Dot-notation path to trace.
     * @returns Ordered array of {@link TraceSegment} records.
     *
     * @example
     * ```ts
     * accessor.trace('user.address.city');
     * // [
     * //   { segment: 'user',    found: true,  type: 'object' },
     * //   { segment: 'address', found: true,  type: 'object' },
     * //   { segment: 'city',    found: false, type: null },
     * // ]
     * ```
     */
    trace(path: string): TraceSegment[] {
        const segments = SegmentParser.parseSegments(path);
        const result: TraceSegment[] = [];
        let current: unknown = this.data;

        for (const segment of segments) {
            const label = DebugMixin.segmentLabel(segment);
            const sentinel = Symbol('trace-sentinel');
            const nextValue = PathResolver.resolve(
                current as Record<string, unknown>,
                [segment],
                0,
                sentinel,
            );

            if (nextValue === sentinel) {
                result.push({ segment: label, found: false, type: null });
                // Append all remaining segments as not-found and stop resolving.
                for (const remaining of segments.slice(result.length)) {
                    result.push({
                        segment: DebugMixin.segmentLabel(remaining),
                        found: false,
                        type: null,
                    });
                }
                break;
            }

            current = nextValue;
            result.push({
                segment: label,
                found: true,
                type: DebugMixin.traceValueType(current),
            });
        }

        return result;
    }

    /**
     * Converts a parsed segment to its string representation for trace output.
     *
     * @param segment - A typed segment from {@link SegmentParser.parseSegments}.
     * @returns Human-readable segment label.
     */
    private static segmentLabel(segment: Segment): string {
        switch (segment.type) {
            case SegmentType.KEY:
                return segment.value;
            case SegmentType.WILDCARD:
                return '[*]';
            case SegmentType.FILTER:
                return '[?...]';
            case SegmentType.SLICE: {
                const s = segment.start !== null ? String(segment.start) : '';
                const e = segment.end !== null ? String(segment.end) : '';
                const step = segment.step !== null ? ':' + String(segment.step) : '';
                return `[${s}:${e}${step}]`;
            }
            case SegmentType.DESCENT:
                return '..' + segment.key;
            case SegmentType.DESCENT_MULTI:
                return '..[' + segment.keys.join(',') + ']';
            case SegmentType.MULTI_INDEX:
                return '[' + segment.indices.join(',') + ']';
            case SegmentType.MULTI_KEY:
                return '[' + segment.keys.join(',') + ']';
            default:
                return String((segment as { type: unknown }).type);
        }
    }

    /**
     * Returns the type label for a resolved value in a trace entry.
     *
     * @param val - The resolved value.
     * @returns Type string, or `null`.
     */
    private static traceValueType(val: unknown): TraceSegment['type'] {
        if (val === null) return 'null';
        if (Array.isArray(val)) return 'array';
        switch (typeof val) {
            case 'boolean':
                return 'boolean';
            case 'number':
                return 'number';
            case 'string':
                return 'string';
            case 'object':
                return 'object';
            default:
                return null;
        }
    }
}
