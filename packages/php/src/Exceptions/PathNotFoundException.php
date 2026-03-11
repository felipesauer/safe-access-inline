<?php

namespace SafeAccessInline\Exceptions;

/**
 * Thrown when a path is not found (optional use — get() prefers returning a default).
 */
class PathNotFoundException extends AccessorException
{
}
