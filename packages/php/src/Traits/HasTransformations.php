<?php

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

/**
 * Default cross-format conversion implementations.
 * Depends on $this->data (normalized array) existing in the class that uses this trait.
 */
trait HasTransformations
{
    public function toJson(int $flags = 0): string
    {
        return json_encode($this->data, $flags | JSON_THROW_ON_ERROR);
    }

    public function toNdjson(): string
    {
        $items = array_values($this->data);
        $lines = array_map(
            fn (mixed $item): string => json_encode($item, JSON_THROW_ON_ERROR),
            $items,
        );
        return implode("\n", $lines);
    }

    public function toObject(): object
    {
        /** @var object */
        return json_decode(
            json_encode($this->data, JSON_THROW_ON_ERROR),
            false,
            512,
            JSON_THROW_ON_ERROR,
        );
    }

    public function toXml(string $rootElement = 'root'): string
    {
        if (!preg_match('/^[a-zA-Z_][\w.\-]*$/', $rootElement)) {
            throw new InvalidFormatException("Invalid XML root element name: '{$rootElement}'");
        }

        if (PluginRegistry::hasSerializer('xml')) {
            return PluginRegistry::getSerializer('xml')->serialize($this->data);
        }

        $xml = new \SimpleXMLElement("<{$rootElement}/>");
        $this->arrayToXml($this->data, $xml);
        return $xml->asXML() ?: '';
    }

    public function toToml(): string
    {
        if (PluginRegistry::hasSerializer('toml')) {
            return PluginRegistry::getSerializer('toml')->serialize($this->data);
        }

        /** @var array<string, mixed>|\stdClass */
        $tomlData = json_decode(json_encode($this->data) ?: '{}');

        return \Devium\Toml\Toml::encode($tomlData);
    }

    public function toYaml(): string
    {
        if (PluginRegistry::hasSerializer('yaml')) {
            return PluginRegistry::getSerializer('yaml')->serialize($this->data);
        }

        if ($this->hasNativeYamlEmit()) {
            return yaml_emit($this->data);
        }

        return \Symfony\Component\Yaml\Yaml::dump($this->data, 4, 2);
    }

    protected function hasNativeYamlEmit(): bool
    {
        return function_exists('yaml_emit');
    }

    /**
     * Transform data to a specific format using a registered serializer plugin.
     * Falls back to built-in serializers for YAML and TOML.
     *
     * @param string $format Format identifier (e.g., 'yaml', 'xml', 'toml')
     * @return string Serialized output
     * @throws UnsupportedTypeException If no serializer is registered and no built-in fallback exists
     */
    public function transform(string $format): string
    {
        if (PluginRegistry::hasSerializer($format)) {
            return PluginRegistry::getSerializer($format)->serialize($this->data);
        }

        // Fall back to built-in serializers for YAML and TOML
        if ($format === 'yaml') {
            return $this->toYaml();
        }
        if ($format === 'toml') {
            return $this->toToml();
        }

        return PluginRegistry::getSerializer($format)->serialize($this->data);
    }

    /**
     * Recursively converts an array to a SimpleXMLElement.
     *
     * @param array<mixed> $data
     * @param \SimpleXMLElement $xml
     */
    private function arrayToXml(array $data, \SimpleXMLElement &$xml): void
    {
        foreach ($data as $key => $value) {
            $safeKey = is_numeric($key) ? "item_{$key}" : (string) $key;

            if (is_array($value)) {
                $child = $xml->addChild($safeKey);
                if ($child !== null) {
                    $this->arrayToXml($value, $child);
                }
            } else {
                $strValue = is_scalar($value) ? (string) $value : '';
                $xml->addChild($safeKey, htmlspecialchars($strValue, ENT_XML1));
            }
        }
    }
}
