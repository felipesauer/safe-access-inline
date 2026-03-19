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

    /** @param int $flags Flags for json_encode (e.g. JSON_PRETTY_PRINT) */
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

    /** @return object stdClass representing the data structure */
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
