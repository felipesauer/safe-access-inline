<?php

namespace SafeAccessInline\Contracts;

interface SchemaAdapterInterface
{
    /**
     * @param mixed $data
     * @return SchemaValidationResult
     */
    public function validate(mixed $data, mixed $schema): SchemaValidationResult;
}
