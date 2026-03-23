<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Base exception for all safe-access-inline accessor operations.
 *
 * Extends \RuntimeException which implements \Throwable.
 */
class AccessorException extends \RuntimeException implements \Throwable
{
    /**
     * @param string     $message  Human-readable description of the error.
     * @param int        $code     Optional exception code.
     * @param \Throwable|null $previous Optional previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
