<?php

namespace SafeAccessInline\Traits;

/**
 * Wildcard (*) support for dot notation paths.
 *
 * This trait is a marker — the actual wildcard logic is centralized in
 * DotNotationParser::get(), which resolves "users.*.name" automatically.
 *
 * The trait exists to document that wildcard functionality is available
 * in any class that extends AbstractAccessor.
 */
trait HasWildcardSupport
{
    /**
     * Accesses multiple values via wildcard in dot notation.
     *
     * Example: ->getWildcard('users.*.name') returns ['Ana', 'Bob']
     *
     * @param string $path Path with wildcard (*)
     * @param mixed $default Default value for each unmatched item
     * @return array<mixed>
     */
    public function getWildcard(string $path, mixed $default = null): array
    {
        $result = $this->get($path, $default);

        return is_array($result) ? $result : [$result];
    }
}
