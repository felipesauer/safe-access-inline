<?php

namespace SafeAccessInline\Contracts;

interface AccessorInterface extends ReadableInterface, TransformableInterface
{
    /**
     * Static factory — creates an instance from raw data.
     * Each Accessor validates whether the input type is compatible.
     *
     * @param mixed $data
     * @return static
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException
     */
    public static function from(mixed $data): static;

    /**
     * Checks whether a path exists in the data structure.
     */
    public function has(string $path): bool;

    /**
     * Returns the PHP type of the value at the given path ('string', 'integer', 'array', etc.).
     * Returns null if the path does not exist.
     */
    public function type(string $path): ?string;

    /**
     * Counts elements at the given level (or at root if path is null).
     */
    public function count(?string $path = null): int;

    /**
     * Lists available keys at the given level.
     *
     * @return array<string>
     */
    public function keys(?string $path = null): array;
}
