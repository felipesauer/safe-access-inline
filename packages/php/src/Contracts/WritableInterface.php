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
}
