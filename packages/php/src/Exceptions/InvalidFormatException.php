<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when the input data is not compatible with the chosen Accessor.
 */
class InvalidFormatException extends AccessorException
{
    /**
     * @param string          $message  Human-readable description of the format mismatch.
     * @param int             $code     Exception code.
     * @param \Throwable|null $previous Previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
