<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a path is not found (optional use — get() prefers returning a default).
 */
class PathNotFoundException extends AccessorException
{
    /**
     * @param string          $message  Human-readable description of the missing path.
     * @param int             $code     Exception code.
     * @param \Throwable|null $previous Previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
