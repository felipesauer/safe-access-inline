<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\AccessorInterface;
use SafeAccessInline\Contracts\SchemaAdapterInterface;
use SafeAccessInline\Contracts\SchemaValidationResult;
use SafeAccessInline\Contracts\WritableInterface;
use SafeAccessInline\Core\Operations\JsonPatch;
use SafeAccessInline\Core\Parsers\DotNotationParser;
use SafeAccessInline\Core\Registries\SchemaRegistry;
use SafeAccessInline\Exceptions\ReadonlyViolationException;
use SafeAccessInline\Security\Sanitizers\DataMasker;
use SafeAccessInline\Traits\HasArrayOperations;
use SafeAccessInline\Traits\HasFactory;
use SafeAccessInline\Traits\HasTransformations;
use SafeAccessInline\Traits\HasWildcardSupport;

abstract class AbstractAccessor implements AccessorInterface, WritableInterface
{
    use HasArrayOperations;
    use HasFactory;
    use HasTransformations;
    use HasWildcardSupport;

    /** @var array<mixed> Normalized data as an associative array. */
    protected array $data = [];

    /** @var mixed Raw original data (preserved for faithful serialization). */
    protected mixed $raw;

    /** @var bool Whether the accessor is frozen (immutable). */
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

    /** {@inheritDoc} */
    public function get(string $path, mixed $default = null): mixed
    {
        return DotNotationParser::get($this->data, $path, $default);
    }

    /**
     * Get value using a template path with variable bindings.
     *
     * @param string $template Path template e.g. 'users.{id}.name'
     * @param array<string, string|int> $bindings Variables to substitute
     */
    public function getTemplate(string $template, array $bindings, mixed $default = null): mixed
    {
        $resolved = DotNotationParser::renderTemplate($template, $bindings);
        return DotNotationParser::get($this->data, $resolved, $default);
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
        $newData = DotNotationParser::removeBySegments($this->data, $segments);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
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
        $newData = DotNotationParser::set($this->data, $path, $value);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /** {@inheritDoc} */
    public function remove(string $path): static
    {
        $this->assertNotReadonly();
        $newData = DotNotationParser::remove($this->data, $path);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /** {@inheritDoc} */
    public function merge(array|string $pathOrValue, ?array $value = null): static
    {
        $this->assertNotReadonly();
        if (is_string($pathOrValue)) {
            $newData = DotNotationParser::merge($this->data, $pathOrValue, $value ?? []);
        } else {
            $newData = DotNotationParser::merge($this->data, '', $pathOrValue);
        }
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
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
        $maskedData = DataMasker::mask($this->data, $patterns);
        $instance = clone $this;
        $instance->data = $maskedData;
        return $instance;
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
     * @param  AbstractAccessor $other Target state to diff against.
     * @return array<array{op: string, path: string, value?: mixed, from?: string}> List of patch operations.
     */
    public function diff(AbstractAccessor $other): array
    {
        return JsonPatch::diff($this->data, $other->all());
    }

    /**
     * Applies a list of JSON Patch operations to the accessor's data and returns a new instance.
     *
     * @param  array<array{op: string, path: string, value?: mixed, from?: string}> $ops Patch operations to apply.
     * @return static New accessor instance with the patched data.
     *
     * @throws ReadonlyViolationException When the accessor is frozen.
     */
    public function applyPatch(array $ops): static
    {
        $this->assertNotReadonly();
        $newData = JsonPatch::applyPatch($this->data, $ops);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    // ── Array Operations (delegated to HasArrayOperations trait) ────

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
