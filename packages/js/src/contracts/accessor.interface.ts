import type { ReadableInterface } from './readable.interface';
import type { TransformableInterface } from './transformable.interface';
import type { AbstractAccessor } from '../core/abstract-accessor';

export interface AccessorInterface extends ReadableInterface, TransformableInterface {
    has(path: string): boolean;
    type(path: string): string | null;
    count(path?: string): number;
    keys(path?: string): string[];
    set(path: string, value: unknown): AbstractAccessor;
    remove(path: string): AbstractAccessor;
}
