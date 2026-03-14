<?php

namespace SafeAccessInline\Contracts;

final class SchemaValidationIssue
{
    public function __construct(
        public readonly string $path,
        public readonly string $message,
    ) {
    }
}
