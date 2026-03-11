<?php

namespace SafeAccessInline\Contracts;

interface ReadableInterface
{
    /**
     * Accesses a nested value via dot notation.
     * NEVER throws if the path does not exist — returns $default instead.
     *
     * @param string $path Dot notation path (e.g. "user.profile.name")
     * @param mixed $default Value returned when the path does not exist
     * @return mixed
     */
    public function get(string $path, mixed $default = null): mixed;

    /**
     * Fetches multiple paths at once.
     *
     * @param array<string, mixed> $paths Map of ['path' => defaultValue, ...]
     * @return array<string, mixed> Map of ['path' => resolvedValue, ...]
     */
    public function getMany(array $paths): array;

    /**
     * Returns all internal data as an associative array.
     *
     * @return array<mixed>
     */
    public function all(): array;
}
