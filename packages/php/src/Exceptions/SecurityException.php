<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a security policy is violated (SSRF, payload size, key traversal, etc.).
 */
class SecurityException extends AccessorException
{
    /**
     * @param string          $message  Human-readable description of the security violation.
     * @param int             $code     Exception code.
     * @param \Throwable|null $previous Previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
