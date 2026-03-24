<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\AccessorInterface;
use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\Traits\HasTransformations;
use SafeAccessInline\Traits\HasTypeAccess;
use SafeAccessInline\Traits\HasWildcardSupport;

/**
 * Base class for all SafeAccess accessors.
 *
 * This class declares a `@template TShape` type parameter so that PHPStan can
 * infer the return type of `get()` for annotated accessor variables:
 *
 * ```php
 * // @var JsonAccessor<array{name: string, age: int, active: bool}> $acc
 * $acc = SafeAccess::fromJson($json);
 * $name = $acc->get('name'); // PHPStan: string|null
 * $age  = $acc->get('age', 0); // PHPStan: int|int (collapsed to int)
 * ```
 *
 * When the shape is not annotated, `get()` falls back to `mixed`.
 * The static analysis extension is registered via `phpstan-extension.neon`.
 *
 * @template-covariant TShape of array<mixed>
 */
abstract class AbstractAccessor implements AccessorInterface
{
    use HasTransformations;
    use HasTypeAccess;
    use HasWildcardSupport;

    /** @var array<mixed> Normalized data as an associative array. */
    private array $data = [];

    /** @var mixed Raw original data (preserved for faithful serialization). */
    protected mixed $raw;

    /**
     * When `true`, all write operations throw {@see ReadonlyViolationException}.
     *
     * JavaScript uses `Object.freeze()` / `deepFreeze()` to make objects immutable at the
     * runtime level. PHP has no equivalent mechanism for arrays or stdClass objects.
     *
     * This class achieves the same guarantee through two complementary layers:
     *
     * 1. **Structural immutability** — `$data` is `private`. No subclass or external
     *    caller can reach it directly. Every read operation returns values by value
     *    (PHP's copy-on-write ensures callers receive independent copies for scalars
     *    and arrays); all write operations route through {@see mutate()} which returns
     *    a *new* cloned instance rather than modifying `$this`.
     *
     * 2. **Runtime freeze flag** — `$readonly = true` is set at construction time
     *    (or via the second constructor parameter). {@see assertNotReadonly()} is called
     *    at the start of every mutating operation, throwing {@see ReadonlyViolationException}
     *    before any data change occurs. This mirrors `Object.isFrozen()` semantics:
     *    the object is effectively sealed against further writes.
     *
     * The combination means that PHP accessors provide the same consumer-facing
     * guarantee as JS `deepFreeze`: immutable instances cannot be accidentally
     * mutated, and all write APIs return new instances (copy-on-write semantics).
     */
    protected bool $readonly = false;

    /**
     * @param mixed          $raw                Input data in its original format.
     * @param bool|array     $readonlyOrOptions  Freeze flag (legacy positional form) **or** an
     *                                           options array (preferred form, mirrors the JS
     *                                           constructor signature `{ readonly?: boolean }`).
     *
     * Accepted forms:
     * ```php
     * // Preferred — options-bag, aligns with JS `new JsonAccessor(raw, { readonly: true })`:
     * new JsonAccessor($raw, ['readonly' => true]);
     *
     * // Legacy — backward-compatible positional bool (deprecated, prefer the options-bag form):
     * new JsonAccessor($raw, true);
     * ```
     *
     * @deprecated Passing a `bool` as the second argument is deprecated. Use the options-bag
     *             form `['readonly' => true]` instead to maintain alignment with the JS
     *             constructor signature `{ readonly?: boolean }`.
     */
    public function __construct(mixed $raw, bool|array $readonlyOrOptions = false)
    {
        $this->raw = $raw;
        $this->readonly = is_array($readonlyOrOptions)
            ? (bool) ($readonlyOrOptions['readonly'] ?? false)
            : $readonlyOrOptions;
        $this->data = $this->parse($raw);
    }

    /**
     * Converts raw data into an associative array.
     * EACH CONCRETE ACCESSOR IMPLEMENTS THIS METHOD.
     *
     * @param mixed $raw
     * @return array<mixed>
     */
    abstract protected function parse(mixed $raw): array;

    /**
     * Returns the value at the given dot-notation path, or `$default` when the path
     * is absent.
     *
     * When the accessor variable is annotated with a concrete shape type
     * (`@var JsonAccessor<array{name: string}> $acc`), the PHPStan extension in
     * `phpstan-extension.neon` narrows the return type to the type at that path.
     *
     * @param  string $path    Dot-notation path, e.g. `'user.address.city'`.
     * @param  mixed  $default Value to return when the path does not exist.
     * @return mixed           Value at path, or `$default` if absent.
     *
     * @see \SafeAccessInline\PHPStan\GetReturnTypeExtension D1 PHPStan extension
     */
    public function get(string $path, mixed $default = null): mixed
    {
        return DotNotationParser::get($this->data, $path, $default);
    }

    // ── Array-based Paths ───────────────────────────

    /**
     * @param string[] $segments
     */
    public function getAt(array $segments, mixed $default = null): mixed
    {
        return DotNotationParser::getBySegments($this->data, $segments, $default);
    }

    /**
     * @param string[] $segments
     */
    public function hasAt(array $segments): bool
    {
        $sentinel = new \stdClass();
        return DotNotationParser::getBySegments($this->data, $segments, $sentinel) !== $sentinel;
    }

    /**
     * @param string[] $segments
     */
    public function setAt(array $segments, mixed $value): static
    {
        $this->assertNotReadonly();
        $newData = DotNotationParser::setBySegments($this->data, $segments, $value);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /**
     * @param string[] $segments
     */
    public function removeAt(array $segments): static
    {
        $this->assertNotReadonly();
        return $this->mutate(DotNotationParser::removeBySegments($this->data, $segments));
    }

    /** {@inheritDoc} */
    public function getMany(array $paths): array
    {
        $results = [];
        foreach ($paths as $path => $default) {
            $results[$path] = $this->get($path, $default);
        }
        return $results;
    }

    /** {@inheritDoc} */
    public function has(string $path): bool
    {
        return DotNotationParser::has($this->data, $path);
    }

    /** {@inheritDoc} */
    public function set(string $path, mixed $value): static
    {
        $this->assertNotReadonly();
        return $this->mutate(DotNotationParser::set($this->data, $path, $value));
    }

    /** {@inheritDoc} */
    public function remove(string $path): static
    {
        $this->assertNotReadonly();
        return $this->mutate(DotNotationParser::remove($this->data, $path));
    }

    /** {@inheritDoc} */
    public function merge(array|string $pathOrValue, ?array $value = null): static
    {
        $this->assertNotReadonly();
        $newData = is_string($pathOrValue)
            ? DotNotationParser::merge($this->data, $pathOrValue, $value ?? [])
            : DotNotationParser::merge($this->data, '', $pathOrValue);
        return $this->mutate($newData);
    }

    /** {@inheritDoc} */
    public function type(string $path): ?string
    {
        if (!$this->has($path)) {
            return null;
        }

        return match (gettype($this->get($path))) {
            'integer', 'double' => 'number',
            'boolean' => 'boolean',
            'NULL' => 'null',
            'array' => 'array',
            'string' => 'string',
            'object' => 'object',
            default => 'unknown',
        };
    }

    /** {@inheritDoc} */
    public function count(?string $path = null): int
    {
        $target = $path !== null ? $this->get($path, []) : $this->data;
        return is_array($target) || is_countable($target) ? count($target) : 0;
    }

    /** {@inheritDoc} */
    public function keys(?string $path = null): array
    {
        $target = $path !== null ? $this->get($path, []) : $this->data;
        return is_array($target) ? array_keys($target) : [];
    }

    /** {@inheritDoc} */
    public function all(): array
    {
        return $this->data;
    }

    /** {@inheritDoc} */
    public function toArray(): array
    {
        return $this->data;
    }

    // ── Internal ────

    /**
     * Creates a new instance of this accessor carrying `$newData` as its data.
     *
     * This is the **single mutation point** for all write operations. Every method
     * that returns a modified accessor (set, remove, merge, push, pop, …) MUST
     * route through this method instead of manually cloning and assigning
     * `$clone->data`. Centralising here ensures:
     *
     *  - `$data` remains `private` — subclasses cannot bypass the immutability contract.
     *  - The clone carries the same `$raw`, `$readonly`, and any other fields set at
     *    construction time, so the returned instance is a faithful derivative.
     *
     * @param  array<mixed> $newData The replacement data array for the cloned instance.
     * @return static               New instance with `$data` replaced by `$newData`.
     */
    protected function mutate(array $newData): static
    {
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /**
     * Returns a new instance of this accessor with the readonly flag set to true.
     * All subsequent write operations will throw a ReadonlyViolationException.
     *
     * @return static Frozen clone of this accessor.
     */
    public function freeze(): static
    {
        $clone = clone $this;
        $clone->readonly = true;
        return $clone;
    }

    /**
     * Asserts that the accessor is not in readonly mode.
     *
     * @throws ReadonlyViolationException When the accessor is frozen.
     */
    protected function assertNotReadonly(): void
    {
        if ($this->readonly) {
            throw new ReadonlyViolationException();
        }
    }
}
