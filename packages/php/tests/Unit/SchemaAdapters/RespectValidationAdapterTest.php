<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\SchemaValidationResult;
use SafeAccessInline\SchemaAdapters\RespectValidationAdapter;

describe(RespectValidationAdapter::class, function () {

    // ── Helpers — anonymous-class mocks (no real respect/validation needed) ─

    /** Creates a mock Validatable that passes validation without throwing. */
    function makePassingSchema(): object
    {
        return new class () {
            public function assert(mixed $data): void
            {
                // no-op — validation always passes
            }
        };
    }

    /** Creates a mock that throws a NestedValidationException-like exception with getMessages(). */
    function makeNestedFailingSchema(array $messages): object
    {
        return new class ($messages) {
            public function __construct(private readonly array $messages)
            {
            }

            public function assert(mixed $data): void
            {
                $msgs = $this->messages;
                throw new class ($msgs) extends \RuntimeException {
                    public function __construct(private readonly array $msgs)
                    {
                        parent::__construct('Validation failed');
                    }

                    public function getMessages(): array
                    {
                        return $this->msgs;
                    }
                };
            }
        };
    }

    /** Creates a mock that throws a simple (non-nested) exception without getMessages(). */
    function makeSimpleFailingSchema(string $message): object
    {
        return new class ($message) {
            public function __construct(private readonly string $message)
            {
            }

            public function assert(mixed $data): void
            {
                throw new \RuntimeException($this->message);
            }
        };
    }

    // ── Constructor ─────────────────────────────────────────────────────────

    it('throws RuntimeException when respect/validation is not installed', function () {
        // The Respect\Validation\Validator class does not exist in this test env.
        new RespectValidationAdapter();
    })->throws(\RuntimeException::class, 'respect/validation is not installed');

    // ── Passing validation ───────────────────────────────────────────────────

    it('returns valid result when schema->assert() does not throw', function () {
        $adapter = new RespectValidationAdapter();
        $result = $adapter->validate(['name' => 'Ana', 'age' => 30], makePassingSchema());

        expect($result)->toBeInstanceOf(SchemaValidationResult::class);
        expect($result->valid)->toBeTrue();
        expect($result->errors)->toBeEmpty();
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    // ── NestedValidationException-like errors ────────────────────────────────

    it('maps field => message pairs from getMessages() to SchemaValidationIssue[]', function () {
        $adapter = new RespectValidationAdapter();
        $schema = makeNestedFailingSchema(['name' => 'must not be empty', 'age' => 'must be an integer']);

        $result = $adapter->validate([], $schema);

        expect($result->valid)->toBeFalse();
        expect($result->errors)->toHaveCount(2);
        expect($result->errors[0]->path)->toBe('$.name');
        expect($result->errors[0]->message)->toBe('must not be empty');
        expect($result->errors[1]->path)->toBe('$.age');
        expect($result->errors[1]->message)->toBe('must be an integer');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    it('uses root path $ for integer-keyed messages', function () {
        $adapter = new RespectValidationAdapter();
        $schema = makeNestedFailingSchema([0 => 'value must be positive']);

        $result = $adapter->validate(-1, $schema);

        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->path)->toBe('$');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    it('uses root path $ for empty-string-keyed messages', function () {
        $adapter = new RespectValidationAdapter();
        $schema = makeNestedFailingSchema(['' => 'invalid input']);

        $result = $adapter->validate('bad', $schema);

        expect($result->valid)->toBeFalse();
        expect($result->errors[0]->path)->toBe('$');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    // ── Simple (non-nested) exception ────────────────────────────────────────

    it('maps simple exception message to root path $ when no getMessages() available', function () {
        $adapter = new RespectValidationAdapter();
        $schema = makeSimpleFailingSchema('Value is not valid');

        $result = $adapter->validate('x', $schema);

        expect($result->valid)->toBeFalse();
        expect($result->errors)->toHaveCount(1);
        expect($result->errors[0]->path)->toBe('$');
        expect($result->errors[0]->message)->toBe('Value is not valid');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    // ── Invalid schema argument ───────────────────────────────────────────────

    it('throws InvalidArgumentException when schema is not an object with assert()', function () {
        $adapter = new RespectValidationAdapter();
        expect(fn () => $adapter->validate('data', 'not-a-schema'))
            ->toThrow(\InvalidArgumentException::class, 'RespectValidationAdapter expects a Respect');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');

    it('throws InvalidArgumentException when schema object lacks assert() method', function () {
        $adapter = new RespectValidationAdapter();
        $badSchema = new class () {
            /* does NOT have assert() */
        };
        expect(fn () => $adapter->validate('data', $badSchema))
            ->toThrow(\InvalidArgumentException::class, 'RespectValidationAdapter expects a Respect');
    })->skip(!class_exists(\Respect\Validation\Validator::class), 'respect/validation not installed — mock bypasses constructor');
});
