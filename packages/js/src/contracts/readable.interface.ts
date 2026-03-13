import { AbstractAccessor } from '../core/abstract-accessor';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

export interface ReadableInterface<T extends Record<string, unknown> = Record<string, unknown>> {
    get<P extends DeepPaths<T> & string>(path: P): ValueAtPath<T, P>;
    get<P extends DeepPaths<T> & string>(
        path: P,
        defaultValue: ValueAtPath<T, P>,
    ): ValueAtPath<T, P>;
    get(path: string, defaultValue?: unknown): unknown;
    getMany(paths: Record<string, unknown>): Record<string, unknown>;
    all(): Record<string, unknown>;
}

export type { AbstractAccessor };
