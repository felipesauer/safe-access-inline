<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Renders template paths by replacing `{key}` placeholders with binding values.
 */
final class TemplateRenderer
{
    /**
     * Renders a template path replacing `{key}` placeholders with the corresponding
     * binding values.
     *
     * @param string                    $template Template string with `{key}` placeholders.
     * @param array<string, string|int> $bindings Key-value pairs to substitute.
     * @return string The rendered string with all placeholders replaced.
     *
     * @throws \RuntimeException When a placeholder key has no matching binding.
     */
    public static function render(string $template, array $bindings): string
    {
        return (string) preg_replace_callback('/\{([^}]+)\}/', function (array $matches) use ($bindings, $template): string {
            $key = $matches[1];
            if (!array_key_exists($key, $bindings)) {
                throw new \RuntimeException("Missing binding for key '{$key}' in template '{$template}'");
            }
            return (string) $bindings[$key];
        }, $template);
    }
}
