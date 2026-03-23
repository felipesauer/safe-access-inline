<?php

declare(strict_types=1);

namespace SafeAccessInline\SchemaAdapters;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationIssue;
use SafeAccessInline\Contracts\SchemaValidationResult;

/**
 * Schema adapter for Respect Validation (respect/validation ^2.3).
 * Requires `respect/validation` as an optional dependency.
 *
 * The `$schema` passed to {@see validate()} must be an object exposing an
 * `assert(mixed $data): void` method that throws on failure (i.e. any
 * {@see \Respect\Validation\Validatable} instance). When the exception has a
 * `getMessages(): array` method (i.e. {@see \Respect\Validation\Exceptions\NestedValidationException})
 * each path/message pair is mapped to a {@see SchemaValidationIssue}; otherwise
 * the exception message is attached to the root path `$`.
 *
 * @example
 * use Respect\Validation\Validator as v;
 * use SafeAccessInline\SchemaAdapters\RespectValidationAdapter;
 *
 * $schema = v::key('name', v::stringType()->notEmpty())
 *            ->key('age', v::intType()->min(0));
 * $accessor->validate($schema, new RespectValidationAdapter());
 */
final class RespectValidationAdapter implements SchemaAdapterInterface
{
    /**
     * @throws \RuntimeException If respect/validation is not installed and no validator is provided.
     */
    public function __construct()
    {
        if (!class_exists(\Respect\Validation\Validator::class)) {
            throw new \RuntimeException(
                'respect/validation is not installed. Run: composer require respect/validation'
            );
        }
    }

    /**
     * Validates `$data` using a Respect Validation schema.
     *
     * @param  mixed                  $data   The data to validate.
     * @param  mixed                  $schema A {@see \Respect\Validation\Validatable} instance.
     * @return SchemaValidationResult Result containing validity flag and any constraint violations.
     *
     * @throws \InvalidArgumentException If `$schema` does not expose an `assert()` method.
     */
    public function validate(mixed $data, mixed $schema): SchemaValidationResult
    {
        if (!is_object($schema) || !method_exists($schema, 'assert')) {
            throw new \InvalidArgumentException(
                'RespectValidationAdapter expects a Respect\\Validation\\Validatable instance as schema.'
            );
        }

        try {
            $schema->assert($data);

            return new SchemaValidationResult(valid: true);
        } catch (\Throwable $e) {
            // NestedValidationException (and subclasses) expose getMessages()
            // which returns field => message pairs for structured error reporting.
            if (method_exists($e, 'getMessages')) {
                /** @var array<int|string, string> $messages */
                $messages = $e->getMessages();
                $errors = [];
                foreach ($messages as $field => $message) {
                    $path = (is_int($field) || $field === '') ? '$' : '$.' . $field;
                    $errors[] = new SchemaValidationIssue(path: $path, message: (string) $message);
                }

                return new SchemaValidationResult(valid: false, errors: $errors);
            }

            // Simple ValidationException: single message attached to root path.
            return new SchemaValidationResult(valid: false, errors: [
                new SchemaValidationIssue(path: '$', message: $e->getMessage()),
            ]);
        }
    }
}
