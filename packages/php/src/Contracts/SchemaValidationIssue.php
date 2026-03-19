<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * A single validation issue reported by a schema adapter.
 *
 * Contains the dot-notation path to the offending value and a
 * human-readable description of the validation failure.
 */
final class SchemaValidationIssue
{
    /**
     * @param string $path    Dot-notation path to the offending value (e.g. '$.user.age').
     * @param string $message Human-readable description of the validation failure.
     */
    public function __construct(
        public readonly string $path,
        public readonly string $message,
    ) {
    }
}
