<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Complete accessor contract combining read, write, and transformation capabilities.
 *
 * Provides dot-notation path traversal, immutable mutations, format serialisation,
 * and introspection (`has`, `type`, `count`, `keys`).
 */
interface AccessorInterface
{
    // ── Factory ───────────────────────────────────────────────────────────

    /**
     * Static factory — creates an instance from raw data.
     * Each Accessor validates whether the input type is compatible.
     *
     * @param mixed $data     The raw data to parse (type varies per implementation).
     * @param bool  $readonly When true, the returned accessor rejects all mutations.
     * @return static
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException If data is incompatible.
     */
    public static function from(mixed $data, bool $readonly = false): static;

    // ── Read ──────────────────────────────────────────────────────────────

    /**
     * Accesses a nested value via dot notation.
     * NEVER throws if the path does not exist — returns $default instead.
     *
     * **Cross-Language Sentinel:** When no `$default` is supplied, missing paths return `null`
     * (PHP null). The JS counterpart returns `undefined` in the same case. Consumers comparing
     * absence across languages must account for this difference.
     *
     * @param string $path Dot notation path (e.g. "user.profile.name")
     * @param mixed $default Value returned when the path does not exist; defaults to `null`
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

    // ── Write (immutable) ─────────────────────────────────────────────────

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

    // ── Transform / Serialise ─────────────────────────────────────────────

    /** @return array<mixed> */
    public function toArray(): array;

    /**
     * Serializes the accessor data to a JSON string.
     *
     * @param int|bool|array<string, mixed> $flagsOrOptions Bitmask, boolean shorthand, or named options array.
     * @return string JSON-encoded data.
     */
    public function toJson(int|bool|array $flagsOrOptions = 0): string;

    // ── Introspection ─────────────────────────────────────────────────────

    /**
     * Checks whether a path exists in the data structure.
     */
    public function has(string $path): bool;

    /**
     * Returns the normalized type of the value at the given path.
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
