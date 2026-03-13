/**
 * TypeScript utility types for type-safe path inference.
 *
 * Usage:
 *   type MyData = { user: { name: string; tags: string[] } };
 *   type Paths = DeepPaths<MyData>;         // "user" | "user.name" | "user.tags" | `user.tags.${number}`
 *   type Name  = ValueAtPath<MyData, "user.name">; // string
 */

// Max recursion depth to prevent infinite types
type MaxDepth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

/**
 * All valid dot-notation paths for a given type T.
 * Generates a union of string literal types representing every reachable path.
 */
export type DeepPaths<T, Depth extends number = 7> = [Depth] extends [never]
    ? never
    : T extends readonly (infer U)[]
      ? `${number}` | (U extends object ? `${number}.${DeepPaths<U, MaxDepth[Depth]>}` : never)
      : T extends object
        ? {
              [K in keyof T & string]:
                  | K
                  | (T[K] extends object ? `${K}.${DeepPaths<T[K], MaxDepth[Depth]>}` : K);
          }[keyof T & string]
        : never;

/**
 * Resolves the value type at a given dot-notation path P in type T.
 */
export type ValueAtPath<T, P extends string> = P extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
        ? ValueAtPath<T[Head], Tail>
        : Head extends `${number}`
          ? T extends readonly (infer U)[]
              ? ValueAtPath<U, Tail>
              : unknown
          : unknown
    : P extends keyof T
      ? T[P]
      : P extends `${number}`
        ? T extends readonly (infer U)[]
            ? U
            : unknown
        : unknown;
