<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\UnsupportedTypeException;
use SafeAccessInline\Plugins\DeviumTomlSerializer;
use SafeAccessInline\Plugins\NativeYamlSerializer;
use SafeAccessInline\Plugins\SimpleXmlSerializer;
use SafeAccessInline\Plugins\SymfonyYamlSerializer;
use SafeAccessInline\Security\Audit\AuditLogger;
use SafeAccessInline\Security\Guards\SecurityPolicy;
use SafeAccessInline\Security\Sanitizers\CsvSanitizer;

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

    /**
     * @param 'none'|'prefix'|'strip'|'error'|null $csvMode
     */
    public function toCsv(?string $csvMode = null): string
    {
        $mode = $csvMode ?? (SecurityPolicy::getGlobal() !== null ? SecurityPolicy::getGlobal()->csvMode : null) ?? 'none';
        if ($csvMode === null && SecurityPolicy::getGlobal() === null) {
            AuditLogger::emit('security.deprecation', [
                'message' => "csvMode defaults to 'none' which does not sanitize CSV cells. "
                    . "In a future version, the default will change to 'prefix'. "
                    . "Pass an explicit \$csvMode to toCsv() or set it via setGlobalPolicy().",
            ]);
        }
        $rows = array_values($this->data);
        if ($rows === []) {
            return '';
        }

        $firstRow = (array) $rows[0];
        $headers = array_keys($firstRow);

        $escapeCsv = static function (string $val): string {
            if (str_contains($val, ',') || str_contains($val, '"') || str_contains($val, "\n")) {
                return '"' . str_replace('"', '""', $val) . '"';
            }
            return $val;
        };

        /** @var 'none'|'prefix'|'strip'|'error' $mode */
        $lines = [implode(',', array_map(fn (int|string $h) => $escapeCsv(CsvSanitizer::sanitizeCell((string) $h, $mode)), $headers))];
        foreach ($rows as $row) {
            $r = (array) $row;
            $lines[] = implode(',', array_map(
                fn (int|string $h) => $escapeCsv(CsvSanitizer::sanitizeCell(is_scalar($r[$h]) ? (string) $r[$h] : '', $mode)),
                $headers,
            ));
        }

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

        return (new SimpleXmlSerializer($rootElement))->serialize($this->data);
    }

    public function toToml(): string
    {
        if (PluginRegistry::hasSerializer('toml')) {
            return PluginRegistry::getSerializer('toml')->serialize($this->data);
        }

        return (new DeviumTomlSerializer())->serialize($this->data);
    }

    public function toYaml(): string
    {
        if (PluginRegistry::hasSerializer('yaml')) {
            return PluginRegistry::getSerializer('yaml')->serialize($this->data);
        }

        if (function_exists('yaml_emit')) {
            return (new NativeYamlSerializer())->serialize($this->data);
        }

        return (new SymfonyYamlSerializer())->serialize($this->data);
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

}
