<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a write operation is attempted on a frozen (readonly) accessor.
 */
class ReadonlyViolationException extends AccessorException
{
    /**
     * @param string $message Human-readable error message.
     */
    public function __construct(string $message = 'Cannot modify a readonly accessor.')
    {
        parent::__construct($message);
    }
}
