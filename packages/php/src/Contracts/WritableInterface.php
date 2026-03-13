<?php

namespace SafeAccessInline\Contracts;

interface WritableInterface
{
    /**
     * Sets/creates a value at the specified path.
     * IMMUTABLE: returns a new instance with the change applied.
     *
     * @param string $path Dot notation path
     * @param mixed $value Value to set
     * @return static New instance
     */
    public function set(string $path, mixed $value): static;

    /**
     * Removes the value at the specified path.
     * IMMUTABLE: returns a new instance without the path.
     *
     * @param string $path Dot notation path
     * @return static New instance
     */
    public function remove(string $path): static;

    /**
     * Deep merges data at root or at a specific path.
     * IMMUTABLE: returns a new instance with the merge applied.
     * Objects are merged recursively; scalar values and arrays are replaced.
     *
     * @param array<mixed>|string $pathOrValue Data to merge at root, or dot notation path
     * @param array<mixed>|null $value Data to merge when first arg is a path
     * @return static New instance
     */
    public function merge(array|string $pathOrValue, ?array $value = null): static;
}
