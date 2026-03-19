/**
 * Recursively freezes an object to prevent mutations.
 * Handles circular references using a WeakSet.
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
    const seen = new WeakSet<object>();

    function freeze(current: object): void {
        if (seen.has(current)) return;
        seen.add(current);

        Object.freeze(current);

        for (const key of Object.getOwnPropertyNames(current)) {
            const value = (current as Record<string, unknown>)[key];
            if (typeof value === 'object' && value !== null) {
                freeze(value);
            }
        }
    }

    freeze(obj);
    return obj as Readonly<T>;
}
