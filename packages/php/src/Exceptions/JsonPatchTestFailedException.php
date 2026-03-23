<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/** Thrown when a JSON Patch 'test' operation finds a value mismatch. */
class JsonPatchTestFailedException extends AccessorException
{
    /**
     * @param string          $message  Human-readable description of the test-operation failure.
     * @param int             $code     Exception code.
     * @param \Throwable|null $previous Previous exception for chaining.
     */
    public function __construct(string $message, int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
