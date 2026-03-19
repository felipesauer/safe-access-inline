<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Outcome of a schema validation run.
 *
 * When `$valid` is `true`, `$errors` is an empty array.
 * When `$valid` is `false`, `$errors` contains one or more SchemaValidationIssue entries.
 */
final class SchemaValidationResult
{
    /**
     * @param bool                    $valid  Whether validation passed.
     * @param SchemaValidationIssue[] $errors Validation issues (empty when valid).
     */
    public function __construct(
        public readonly bool $valid,
        public readonly array $errors = [],
    ) {
    }
}
