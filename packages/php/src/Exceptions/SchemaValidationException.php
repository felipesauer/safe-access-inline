<?php

namespace SafeAccessInline\Exceptions;

class SchemaValidationException extends AccessorException
{
    /** @var array<\SafeAccessInline\Contracts\SchemaValidationIssue> */
    private array $issues;

    /**
     * @param array<\SafeAccessInline\Contracts\SchemaValidationIssue> $issues
     */
    public function __construct(array $issues)
    {
        $summary = implode('; ', array_map(
            fn ($e) => "{$e->path}: {$e->message}",
            $issues,
        ));
        parent::__construct("Schema validation failed: {$summary}");
        $this->issues = $issues;
    }

    /**
     * @return array<\SafeAccessInline\Contracts\SchemaValidationIssue>
     */
    public function getIssues(): array
    {
        return $this->issues;
    }
}
