import type { AbstractAccessor } from '../core/abstract-accessor';

export interface WritableInterface {
    set(path: string, value: unknown): AbstractAccessor;
    remove(path: string): AbstractAccessor;
}
