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
}
