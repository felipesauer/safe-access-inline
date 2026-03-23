<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\AccessorInterface;
use SafeAccessInline\Contracts\JsonPatchOperation;
use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationResult;
use SafeAccessInline\Core\Operations\JsonPatch;
use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Core\Registries\SchemaRegistry;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\Security\Sanitizers\DataMasker;
use SafeAccessInline\Traits\HasArrayOperations;
use SafeAccessInline\Traits\HasDebugOperations;
use SafeAccessInline\Traits\HasFactory;
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
    use HasArrayOperations;
    use HasDebugOperations;
    use HasFactory;
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
     * @param mixed $raw      Input data in its original format.
     * @param bool  $readonly When true the accessor is created in frozen mode.
     */
    public function __construct(mixed $raw, bool $readonly = false)
    {
        $this->raw = $raw;
        $this->readonly = $readonly;
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

    /**
     * Retrieves a value by resolving a template path with variable bindings.
     *
     * When a binding value begins with `@`, the remainder is treated as a dot-notation path
     * resolved against the accessor's own data. If that path resolves to `null`, `$default`
     * is returned immediately. Non-`@` bindings are passed through unchanged.
     *
     * @param string                    $template Path template e.g. `'users.{id}.name'`
     * @param array<string, string|int> $bindings Variables to substitute; values starting
     *                                            with `@` are resolved as data paths.
     * @param mixed                     $default  Fallback when the resolved path is absent.
     * @return mixed
     */
    public function getTemplate(string $template, array $bindings = [], mixed $default = null): mixed
    {
        $resolvedBindings = [];
        foreach ($bindings as $key => $value) {
            if (is_string($value) && str_starts_with($value, '@')) {
                $pathValue = $this->get(substr($value, 1));
                if ($pathValue === null) {
                    return $default;
                }
                $resolvedBindings[$key] = is_int($pathValue) || is_float($pathValue)
                    ? (int) $pathValue
                    : (string) (is_scalar($pathValue) ? $pathValue : '');
            } else {
                $resolvedBindings[$key] = $value;
            }
        }
        $resolved = DotNotationParser::renderTemplate($template, $resolvedBindings);
        return DotNotationParser::get($this->data, $resolved, $default);
    }

    // ── Compiled Path ───────────────────────────────

    /**
     * Retrieves a value using a pre-compiled path, bypassing path tokenization.
     *
     * Use {@see \SafeAccessInline\SafeAccess::compilePath()} to create a `CompiledPath` once,
     * then call `getCompiled` repeatedly across different accessors or iterations for best
     * performance.
     *
     * @param  CompiledPath $compiledPath Pre-compiled path from {@see \SafeAccessInline\SafeAccess::compilePath()}.
     * @param  mixed        $default      Fallback when the path does not exist.
     * @return mixed                      The value at the compiled path, or `$default`.
     */
    public function getCompiled(CompiledPath $compiledPath, mixed $default = null): mixed
    {
        return DotNotationParser::resolve($this->data, $compiledPath->segments(), $default);
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
            'boolean' => 'bool',
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

    /**
     * @param array<string> $patterns
     */
    public function mask(array $patterns = []): static
    {
        return $this->mutate(DataMasker::mask($this->data, $patterns));
    }

    /**
     * Validates the accessor's data against `$schema` using the supplied or default adapter.
     *
     * Returns a {@see SchemaValidationResult} — check `$result->valid` to determine success.
     * Does not throw on validation failure; throws only when no adapter is configured.
     *
     * @param  mixed                        $schema  Schema definition passed to the adapter.
     * @param  SchemaAdapterInterface|null  $adapter Adapter to use; falls back to the globally registered default.
     * @return SchemaValidationResult       Result carrying `valid` flag and any `errors`.
     *
     * @throws \RuntimeException When no adapter is provided and no default is set.
     */
    public function validate(mixed $schema, ?SchemaAdapterInterface $adapter = null): SchemaValidationResult
    {
        $resolved = $adapter ?? SchemaRegistry::getDefaultAdapter();
        if ($resolved === null) {
            throw new \RuntimeException(
                'No schema adapter provided. Pass an adapter or set a default via SchemaRegistry::setDefaultAdapter().'
            );
        }
        return $resolved->validate($this->data, $schema);
    }

    /**
     * Returns the list of JSON Patch operations that transforms this accessor's data into `$other`'s data.
     *
     * @param  AbstractAccessor<array<mixed>>|array<mixed> $other Target state to diff against.
     * @return JsonPatchOperation[]      Ordered list of typed patch operations.
     */
    public function diff(AbstractAccessor|array $other): array
    {
        $otherData = $other instanceof AbstractAccessor ? $other->all() : $other;
        return JsonPatch::diff($this->data, $otherData);
    }

    /**
     * Validates a list of typed JSON Patch operations.
     *
     * @param  JsonPatchOperation[] $ops Patch operations to validate.
     *
     * @throws \InvalidArgumentException When operations are invalid (e.g., missing 'from' on move/copy).
     */
    public function validatePatch(array $ops): void
    {
        JsonPatch::validatePatch($ops);
    }

    /**
     * Applies a list of typed JSON Patch operations to the accessor's data and returns a new instance.
     *
     * @param  JsonPatchOperation[] $ops Patch operations to apply.
     * @return static                    New accessor instance with the patched data.
     *
     * @throws ReadonlyViolationException When the accessor is frozen.
     */
    public function applyPatch(array $ops): static
    {
        $this->assertNotReadonly();
        return $this->mutate(JsonPatch::applyPatch($this->data, $ops));
    }

    // ── Array Operations (delegated to HasArrayOperations trait) ────

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
     * Returns a new instance of this accessor carrying the given data array,
     * while preserving the current `$raw` source and `$readonly` flag.
     *
     * This is the PHP equivalent of the JS `clone(data)` method available on
     * every accessor. Rather than re-parsing a serialised form, it reuses
     * {@see mutate()} which shallow-clones `$this` and injects `$data`
     * directly — the same strategy used by the JS YAML/CSV implementations
     * (`Object.create(prototype) + inst.raw = this.raw + inst.data = data`).
     *
     * @param  array<mixed> $data Replacement data for the cloned instance.
     * @return static             New accessor carrying `$data`, same type as caller.
     */
    public function clone(array $data = []): static
    {
        return $this->mutate($data);
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

    // ── PSR-16 Cache ────────────────────────────────

    /**
     * Returns a cached version of this accessor or stores the current data and returns itself.
     *
     * On a **cache hit**: returns a new accessor instance hydrated from the cached array —
     * the `$ttl` is ignored because the item is already in the cache.
     * On a **cache miss**: stores `$this->all()` under `$key` with `$ttl` seconds TTL and
     * returns `$this`.
     *
     * Requires `psr/simple-cache` (^3.0) to be installed. It is listed under `suggest` in
     * `composer.json` and is NOT a hard dependency.
     *
     * @param  \Psr\SimpleCache\CacheInterface $cache PSR-16 cache instance.
     * @param  int                             $ttl   Time-to-live in seconds.
     * @param  string                          $key   Cache key.
     * @return static This instance (cache miss) or a new instance hydrated from cache (cache hit).
     */
    public function remember(\Psr\SimpleCache\CacheInterface $cache, int $ttl, string $key): static
    {
        /** @var array<mixed>|null $cached */
        $cached = $cache->get($key);
        if (is_array($cached)) {
            return $this->mutate($cached);
        }
        $cache->set($key, $this->all(), $ttl);
        return $this;
    }

    /**
     * Removes the cached representation of this accessor from the cache.
     *
     * @param  \Psr\SimpleCache\CacheInterface $cache PSR-16 cache instance.
     * @param  string                          $key   Cache key to delete.
     */
    public function forget(\Psr\SimpleCache\CacheInterface $cache, string $key): void
    {
        $cache->delete($key);
    }
}
