<?php

namespace SafeAccessInline\Contracts;

interface TransformableInterface
{
    /** @return array<mixed> */
    public function toArray(): array;

    /** @param int $flags Flags for json_encode (e.g. JSON_PRETTY_PRINT) */
    public function toJson(int $flags = 0): string;

    /** @param string $rootElement Name of the root XML element */
    public function toXml(string $rootElement = 'root'): string;

    /** @return string Formatted YAML */
    public function toYaml(): string;

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
