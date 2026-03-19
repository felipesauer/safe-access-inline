/**
 * Renders a template path replacing `{key}` placeholders with the corresponding
 * binding values.
 *
 * @param template - Template string with `{key}` placeholders.
 * @param bindings - Key-value pairs to substitute into the template.
 * @returns The rendered string with all placeholders replaced.
 * @throws {Error} When a placeholder key has no matching binding.
 *
 * @example
 * ```ts
 * renderTemplate('users.{id}.name', { id: 42 }); // 'users.42.name'
 * ```
 */
export function renderTemplate(
    template: string,
    bindings: Record<string, string | number>,
): string {
    return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
        if (!(key in bindings)) {
            throw new Error(`Missing binding for key '${key}' in template '${template}'`);
        }
        return String(bindings[key]);
    });
}
