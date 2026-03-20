/**
 * Recursively freezes an object and all its nested properties to prevent mutations.
 *
 * Handles circular references safely using a `WeakSet` to track visited nodes.
 *
 * @param obj - The object to deeply freeze.
 * @returns The same object cast to `Readonly<T>`.
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
    const seen = new WeakSet<object>();

    /**
     * Recursively freezes a single node in the object graph.
     *
     * @param current - The current object node to freeze.
     */
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
