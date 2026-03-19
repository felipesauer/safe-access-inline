<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

class ReadonlyViolationException extends AccessorException
{
    public function __construct(string $message = 'Cannot modify a readonly accessor.')
    {
        parent::__construct($message);
    }
}
