import type { AbstractAccessor } from '../core/abstract-accessor';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

export interface WritableInterface<T extends Record<string, unknown> = Record<string, unknown>> {
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T>;
    remove(path: string): AbstractAccessor<T>;
    merge(value: Record<string, unknown>): AbstractAccessor<T>;
    merge(path: string, value: Record<string, unknown>): AbstractAccessor<T>;
}
