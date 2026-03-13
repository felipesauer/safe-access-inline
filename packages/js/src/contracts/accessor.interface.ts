import type { ReadableInterface } from './readable.interface';
import type { TransformableInterface } from './transformable.interface';
import type { AbstractAccessor } from '../core/abstract-accessor';
import type { DeepPaths, ValueAtPath } from '../types/deep-paths';

export interface AccessorInterface<T extends Record<string, unknown> = Record<string, unknown>>
    extends ReadableInterface<T>, TransformableInterface {
    has(path: string): boolean;
    type(path: string): string | null;
    count(path?: string): number;
    keys(path?: string): string[];
    set<P extends DeepPaths<T> & string>(path: P, value: ValueAtPath<T, P>): AbstractAccessor<T>;
    set(path: string, value: unknown): AbstractAccessor<T>;
    remove(path: string): AbstractAccessor<T>;
    merge(value: Record<string, unknown>): AbstractAccessor<T>;
    merge(path: string, value: Record<string, unknown>): AbstractAccessor<T>;
}
