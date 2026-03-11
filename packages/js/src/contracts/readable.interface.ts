import { AbstractAccessor } from '../core/abstract-accessor';

export interface ReadableInterface {
  get(path: string, defaultValue?: unknown): unknown;
  getMany(paths: Record<string, unknown>): Record<string, unknown>;
  all(): Record<string, unknown>;
}

export type { AbstractAccessor };
