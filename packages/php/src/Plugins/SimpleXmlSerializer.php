<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Contracts\SerializerPluginInterface;

/**
 * XML serializer plugin using PHP's built-in SimpleXMLElement.
 *
 * The root element name can be configured via the constructor.
 *
 * @example
 * use SafeAccessInline\Core\Registries\PluginRegistry;
 * use SafeAccessInline\Plugins\SimpleXmlSerializer;
 *
 * PluginRegistry::registerSerializer('xml', new SimpleXmlSerializer('config'));
 */
class SimpleXmlSerializer implements SerializerPluginInterface
{
    /**
     * @param string $rootElement XML root element name.
     */
    public function __construct(
        private readonly string $rootElement = 'root',
    ) {
    }

    /**
     * Serializes an associative array to an XML string.
     *
     * Numeric keys are prefixed with `item_` to produce valid XML element names.
     *
     * @param array<mixed> $data Data to serialize.
     * @return string XML string with `<?xml …?>` declaration.
     */
    public function serialize(array $data): string
    {
        $xml = new \SimpleXMLElement("<{$this->rootElement}/>");
        self::arrayToXml($data, $xml);

        return $xml->asXML() ?: '';
    }

    /**
     * Recursively converts an array to SimpleXMLElement children.
     *
     * @param array<mixed> $data
     * @param \SimpleXMLElement $xml
     */
    private static function arrayToXml(array $data, \SimpleXMLElement &$xml): void
    {
        foreach ($data as $key => $value) {
            $safeKey = is_numeric($key) ? "item_{$key}" : (string) $key;

            if (is_array($value)) {
                $child = $xml->addChild($safeKey);
                if ($child !== null) {
                    self::arrayToXml($value, $child);
                }
            } else {
                $strValue = is_scalar($value) ? (string) $value : '';
                $xml->addChild($safeKey, htmlspecialchars($strValue, ENT_XML1));
            }
        }
    }
}
