<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Contract for data serialization and format-conversion operations.
 *
 * Provides methods to export accessor data as JSON, XML, YAML, TOML, CSV, NDJSON, or plain objects/arrays.
 */
interface TransformableInterface
{
    /** @return array<mixed> */
    public function toArray(): array;

    /**
     * Serializes the accessor data to a JSON string.
     *
     * PHP accepts an `int $flags` bitmask (e.g. `JSON_PRETTY_PRINT`), whereas the JS
     * implementation accepts a `bool $pretty` flag. These are intentional language-idiomatic
     * differences: consumers on each platform should use the respective convention and must
     * not pass the other platform's type. Cross-language interop concerns only the *output*
     * JSON string, which is identical regardless of how pretty-printing is requested.
     *
     * @note PHP uses `int` flags (bitmask) while JS uses `boolean` — this is an expected
     *       language-idiomatic divergence and is intentional. See plan item A3.
     *
     * @param int $flags Flags for `json_encode()` (e.g. `JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE`).
     * @return string JSON-encoded data.
     */
    public function toJson(int $flags = 0): string;

    /** @param string $rootElement Name of the root XML element */
    public function toXml(string $rootElement = 'root'): string;

    /** @return string Formatted TOML */
    public function toToml(): string;

    /** @return string Formatted YAML */
    public function toYaml(): string;

    /** @return string CSV formatted output */
    public function toCsv(?string $csvMode = null): string;

    /** @return string NDJSON formatted output */
    public function toNdjson(): string;

    /**
     * Serialises the accessor's data to an INI-format string.
     *
     * Top-level scalar values become `key = value` pairs; top-level nested arrays become
     * `[section]` blocks. Deeper nesting is serialised as a JSON string value.
     *
     * @return string A valid INI string with sections for nested arrays.
     */
    public function toIni(): string;

    /**
     * Serialises the accessor's data to a `.env`-format string.
     *
     * Only flat (non-array) top-level values are emitted. Nested arrays are skipped silently.
     *
     * @note ENV values are always strings. Typed values (booleans, integers) are coerced to string,
     *       so a round-trip through {@see \SafeAccessInline\Accessors\EnvAccessor} produces strings
     *       rather than the original typed primitives.
     *
     * @return string A valid `.env` string with KEY=VALUE pairs per line.
     */
    public function toEnv(): string;

    /**
     * Converts the dataset to a structured PHP object.
     *
     * **Cross-Language Divergence:** In PHP, `toObject()` returns a `stdClass`
     * object, which requires property access syntax (`$obj->property`).
     * In JS/TS, `toObject()` returns a plain associative record (equivalent to
     * PHP's associative array). If you need an associative structure, use `toArray()`.
     *
     * @return object stdClass representing the data structure
     */
    public function toObject(): object;

    /**
     * Transform data to a specific format using a registered serializer plugin.
     *
     * @param string $format Format identifier (e.g., 'yaml', 'xml', 'toml')
     * @return string Serialized output
     * @throws \SafeAccessInline\Exceptions\UnsupportedTypeException If no serializer is registered
     */
    public function transform(string $format): string;
}
