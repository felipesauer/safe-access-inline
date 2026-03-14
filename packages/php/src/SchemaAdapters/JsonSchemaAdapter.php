<?php

namespace SafeAccessInline\SchemaAdapters;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationIssue;
use SafeAccessInline\Contracts\SchemaValidationResult;

/**
 * Schema adapter for JSON Schema validation.
 * Uses a simple built-in validator supporting type, required, properties, items,
 * minimum, maximum, minLength, maxLength, enum, and pattern.
 *
 * @example
 * $schema = json_decode(file_get_contents('schema.json'), true);
 * $accessor->validate($schema, new JsonSchemaAdapter());
 */
final class JsonSchemaAdapter implements SchemaAdapterInterface
{
    public function validate(mixed $data, mixed $schema): SchemaValidationResult
    {
        /** @var array<string, mixed> $schemaArray */
        $schemaArray = is_array($schema) ? $schema : (is_string($schema) ? json_decode($schema, true) : []);

        $errors = $this->validateNode($data, $schemaArray, '$');

        return new SchemaValidationResult(
            valid: count($errors) === 0,
            errors: $errors,
        );
    }

    /**
     * @param array<string, mixed> $schema
     * @return SchemaValidationIssue[]
     */
    private function validateNode(mixed $data, array $schema, string $path): array
    {
        $errors = [];

        if (isset($schema['type'])) {
            $expectedTypes = is_array($schema['type']) ? $schema['type'] : [$schema['type']];
            $actualType = $this->getJsonType($data);
            if (!in_array($actualType, $expectedTypes, true)) {
                $errors[] = new SchemaValidationIssue(
                    $path,
                    "Expected type '" . implode('|', $expectedTypes) . "' but got '{$actualType}'"
                );
                return $errors;
            }
        }

        if (isset($schema['required']) && is_array($data) && !array_is_list($data)) {
            foreach ($schema['required'] as $key) {
                if (!array_key_exists($key, $data)) {
                    $errors[] = new SchemaValidationIssue("{$path}.{$key}", 'Required field missing');
                }
            }
        }

        if (isset($schema['properties']) && is_array($data) && !array_is_list($data)) {
            /** @var array<string, array<string, mixed>> $properties */
            $properties = $schema['properties'];
            foreach ($properties as $key => $subSchema) {
                if (array_key_exists($key, $data)) {
                    $errors = array_merge($errors, $this->validateNode($data[$key], $subSchema, "{$path}.{$key}"));
                }
            }
        }

        if (isset($schema['items']) && is_array($data) && array_is_list($data)) {
            /** @var array<string, mixed> $itemSchema */
            $itemSchema = $schema['items'];
            foreach ($data as $i => $item) {
                $errors = array_merge($errors, $this->validateNode($item, $itemSchema, "{$path}[{$i}]"));
            }
        }

        if (isset($schema['minimum']) && is_numeric($data)) {
            if ($data < $schema['minimum']) {
                $errors[] = new SchemaValidationIssue($path, "Value {$data} is less than minimum {$schema['minimum']}");
            }
        }

        if (isset($schema['maximum']) && is_numeric($data)) {
            if ($data > $schema['maximum']) {
                $errors[] = new SchemaValidationIssue($path, "Value {$data} exceeds maximum {$schema['maximum']}");
            }
        }

        if (isset($schema['minLength']) && is_string($data)) {
            if (strlen($data) < $schema['minLength']) {
                $errors[] = new SchemaValidationIssue($path, "String length " . strlen($data) . " is less than minLength {$schema['minLength']}");
            }
        }

        if (isset($schema['maxLength']) && is_string($data)) {
            if (strlen($data) > $schema['maxLength']) {
                $errors[] = new SchemaValidationIssue($path, "String length " . strlen($data) . " exceeds maxLength {$schema['maxLength']}");
            }
        }

        if (isset($schema['enum'])) {
            /** @var array<mixed> $enumVals */
            $enumVals = $schema['enum'];
            if (!in_array($data, $enumVals, true)) {
                $display = array_map(fn ($v) => json_encode($v), $enumVals);
                $errors[] = new SchemaValidationIssue($path, 'Value must be one of: ' . implode(', ', $display));
            }
        }

        if (isset($schema['pattern']) && is_string($data)) {
            $pattern = '/' . str_replace('/', '\\/', $schema['pattern']) . '/';
            if (!preg_match($pattern, $data)) {
                $errors[] = new SchemaValidationIssue($path, "Value does not match pattern '{$schema['pattern']}'");
            }
        }

        return $errors;
    }

    private function getJsonType(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return 'boolean';
        }
        if (is_int($value) || is_float($value)) {
            return 'number';
        }
        if (is_string($value)) {
            return 'string';
        }
        if (is_array($value)) {
            return array_is_list($value) ? 'array' : 'object';
        }
        return 'unknown';
    }
}
