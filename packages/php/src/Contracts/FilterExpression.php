<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * A parsed filter expression consisting of one or more FilterCondition instances
 * joined by logical operators (&& or ||).
 *
 * Example: `[?age>=18 && active==true]` parses to two conditions
 * with a single `&&` logical operator.
 */
final readonly class FilterExpression
{
    /**
     * @param list<FilterCondition> $conditions Ordered list of comparison conditions.
     * @param list<string>          $logicals   Logical operators connecting adjacent conditions ('&&' | '||').
     */
    public function __construct(
        public array $conditions,
        public array $logicals,
    ) {
    }
}
