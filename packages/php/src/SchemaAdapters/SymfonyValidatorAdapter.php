<?php

namespace SafeAccessInline\SchemaAdapters;

use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationIssue;
use SafeAccessInline\Contracts\SchemaValidationResult;

/**
 * Schema adapter for Symfony Validator.
 * Requires `symfony/validator` as a dependency.
 *
 * @example
 * use Symfony\Component\Validator\Constraints as Assert;
 * use SafeAccessInline\SchemaAdapters\SymfonyValidatorAdapter;
 *
 * $constraints = new Assert\Collection([
 *     'name' => new Assert\NotBlank(),
 *     'age' => [new Assert\NotBlank(), new Assert\Type('integer')],
 * ]);
 * $accessor->validate($constraints, new SymfonyValidatorAdapter());
 */
final class SymfonyValidatorAdapter implements SchemaAdapterInterface
{
    private readonly object $validator;

    public function __construct(?object $validator = null)
    {
        if ($validator !== null) {
            $this->validator = $validator;
        } elseif (class_exists(\Symfony\Component\Validator\Validation::class)) {
            $this->validator = \Symfony\Component\Validator\Validation::createValidator();
        } else {
            throw new \RuntimeException(
                'symfony/validator is not installed. Run: composer require symfony/validator'
            );
        }
    }

    public function validate(mixed $data, mixed $schema): SchemaValidationResult
    {
        /** @var \Symfony\Component\Validator\Validator\ValidatorInterface $validator */
        $validator = $this->validator;
        $violations = $validator->validate($data, $schema);

        if (count($violations) === 0) {
            return new SchemaValidationResult(valid: true);
        }

        $errors = [];
        /** @var \Symfony\Component\Validator\ConstraintViolationInterface $violation */
        foreach ($violations as $violation) {
            $path = $violation->getPropertyPath();
            $errors[] = new SchemaValidationIssue(
                path: $path !== '' ? '$.' . $this->normalizePath($path) : '$',
                message: (string) $violation->getMessage(),
            );
        }

        return new SchemaValidationResult(valid: false, errors: $errors);
    }

    /**
     * Normalize Symfony's property path to dot notation.
     * "[name]" → "name", "[users][0][name]" → "users.0.name"
     */
    private function normalizePath(string $path): string
    {
        $path = str_replace(['[', ']'], ['.', ''], $path);
        return ltrim($path, '.');
    }
}
