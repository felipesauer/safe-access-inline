<?php

use SafeAccessInline\Contracts\SchemaValidationResult;
use SafeAccessInline\SchemaAdapters\SymfonyValidatorAdapter;

describe(SymfonyValidatorAdapter::class, function () {

    it('returns valid result when no violations', function () {
        $mockViolations = new class () implements \Countable, \IteratorAggregate {
            public function count(): int
            {
                return 0;
            }

            public function getIterator(): \ArrayIterator
            {
                return new \ArrayIterator([]);
            }
        };

        $mockValidator = new class ($mockViolations) {
            public function __construct(private readonly object $violations)
            {
            }

            public function validate(mixed $data, mixed $constraints = null): object
            {
                return $this->violations;
            }
        };

        $adapter = new SymfonyValidatorAdapter($mockValidator);
        $result = $adapter->validate(['name' => 'Ana'], null);
        expect($result)->toBeInstanceOf(SchemaValidationResult::class);
        expect($result->valid)->toBeTrue();
    });

    it('returns invalid result with mapped errors', function () {
        $mockViolation = new class () {
            public function getPropertyPath(): string
            {
                return '[users][0][name]';
            }

            public function getMessage(): string
            {
                return 'This value should not be blank.';
            }
        };

        $mockViolations = new class ($mockViolation) implements \Countable, \IteratorAggregate {
            public function __construct(private readonly object $violation)
            {
            }

            public function count(): int
            {
                return 1;
            }

            public function getIterator(): \ArrayIterator
            {
                return new \ArrayIterator([$this->violation]);
            }
        };

        $mockValidator = new class ($mockViolations) {
            public function __construct(private readonly object $violations)
            {
            }

            public function validate(mixed $data, mixed $constraints = null): object
            {
                return $this->violations;
            }
        };

        $adapter = new SymfonyValidatorAdapter($mockValidator);
        $result = $adapter->validate(['users' => [['name' => '']]], null);
        expect($result->valid)->toBeFalse();
        expect($result->errors)->toHaveCount(1);
        expect($result->errors[0]->path)->toBe('$.users.0.name');
        expect($result->errors[0]->message)->toBe('This value should not be blank.');
    });

    it('normalizes root-level violation path to $', function () {
        $mockViolation = new class () {
            public function getPropertyPath(): string
            {
                return '';
            }

            public function getMessage(): string
            {
                return 'Invalid data.';
            }
        };

        $mockViolations = new class ($mockViolation) implements \Countable, \IteratorAggregate {
            public function __construct(private readonly object $violation)
            {
            }

            public function count(): int
            {
                return 1;
            }

            public function getIterator(): \ArrayIterator
            {
                return new \ArrayIterator([$this->violation]);
            }
        };

        $mockValidator = new class ($mockViolations) {
            public function __construct(private readonly object $violations)
            {
            }

            public function validate(mixed $data, mixed $constraints = null): object
            {
                return $this->violations;
            }
        };

        $adapter = new SymfonyValidatorAdapter($mockValidator);
        $result = $adapter->validate('bad', null);
        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->path)->toBe('$');
    });

    it('throws when no validator provided and class missing', function () {
        // Symfony\Component\Validator\Validation doesn't exist in this env
        new SymfonyValidatorAdapter(null);
    })->throws(\RuntimeException::class, 'symfony/validator is not installed');
});
