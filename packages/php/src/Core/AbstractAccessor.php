<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Contracts\AccessorInterface;
use SafeAccessInline\Contracts\WritableInterface;
use SafeAccessInline\Traits\HasFactory;
use SafeAccessInline\Traits\HasTransformations;
use SafeAccessInline\Traits\HasWildcardSupport;

abstract class AbstractAccessor implements AccessorInterface, WritableInterface
{
    use HasFactory;
    use HasTransformations;
    use HasWildcardSupport;

    /** @var array<mixed> Normalized data as an associative array */
    protected array $data = [];

    /** @var mixed Raw original data (preserved for faithful serialization) */
    protected mixed $raw;

    /**
     * @param mixed $raw Input data in its original format
     */
    public function __construct(mixed $raw)
    {
        $this->raw = $raw;
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
        $newData = DotNotationParser::set($this->data, $path, $value);
        $clone = clone $this;
        $clone->data = $newData;
        return $clone;
    }

    /** {@inheritDoc} */
    public function remove(string $path): static
    {
        $newData = DotNotationParser::remove($this->data, $path);
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
        return gettype($this->get($path));
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
}
