<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Contract for schema validation adapters.
 *
 * Implementations bridge external validation libraries (e.g. JSON Schema, Symfony Validator)
 * into the safe-access-inline validation pipeline.
 */
interface SchemaAdapterInterface
{
    /**
     * Validates data against a schema and returns a structured result.
     *
     * @param  mixed $data   The data to validate.
     * @param  mixed $schema Schema definition specific to the adapter implementation.
     * @return SchemaValidationResult Result containing validity flag and any issues.
     */
    public function validate(mixed $data, mixed $schema): SchemaValidationResult;
}
