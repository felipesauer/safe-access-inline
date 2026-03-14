<?php

namespace SafeAccessInline\Contracts;

final class SchemaValidationResult
{
    /**
     * @param SchemaValidationIssue[] $errors
     */
    public function __construct(
        public readonly bool $valid,
        public readonly array $errors = [],
    ) {
    }
}
