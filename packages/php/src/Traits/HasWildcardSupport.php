<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\AbstractAccessor;

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
     * Annotate the local variable with `@var` to enable IDE type inference
     * (PHP has no native runtime generics):
     * ```php
     * // @var list<string> $names
     * $names = $accessor->getWildcard('users.*.name');
     * ```
     *
     * @template T
     * @param string $path Path with wildcard (*)
     * @param mixed $default Default value for each unmatched item
     * @return list<T>
     */
    public function getWildcard(string $path, mixed $default = null): array
    {
        $result = $this->get($path, $default);

        return is_array($result) ? $result : [$result];
    }
}
