<?php

declare(strict_types=1);

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a security policy is violated (SSRF, payload size, key traversal, etc.).
 */
class SecurityException extends AccessorException
{
}
