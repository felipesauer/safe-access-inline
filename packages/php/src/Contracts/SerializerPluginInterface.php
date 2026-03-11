<?php

namespace SafeAccessInline\Contracts;

/**
 * Contract for serializer plugins.
 * A serializer converts an associative array into a formatted string.
 *
 * Used by toXml(), toYaml(), transform() etc. to decouple output formatting
 * from the Accessor.
 */
interface SerializerPluginInterface
{
    /**
     * Serialize an associative array into a formatted string.
     *
     * @param array<mixed> $data Data to serialize
     * @return string Formatted output
     */
    public function serialize(array $data): string;
}
