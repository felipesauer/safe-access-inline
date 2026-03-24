<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a type/format is not supported.
 */
class UnsupportedTypeException extends AccessorException
{
    /**
     * @param string          $message  Human-readable description of the unsupported type.
     * @param int             $code     Exception code.
     * @param \Throwable|null $previous Previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
