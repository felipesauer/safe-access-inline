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
    /**
     * Serialises the accessor's data to a JSON string.
     *
     * `$flagsOrOptions` accepts three forms for flexibility and JS parity:
     *  - **int** bitmask — passed directly to `json_encode` (backward compat).
     *  - **bool** — `true` enables `JSON_PRETTY_PRINT` (short-hand compat).
     *  - **array** named options (mirrors TypeScript `ToJsonOptions`):
     *    - `pretty` (bool)          — enable `JSON_PRETTY_PRINT`
     *    - `unescapeUnicode` (bool) — enable `JSON_UNESCAPED_UNICODE`
     *    - `unescapeSlashes` (bool) — enable `JSON_UNESCAPED_SLASHES`
     *    - `space` (int|string)     — implies `JSON_PRETTY_PRINT` (PHP does not support custom indent)
     *
     * @param  int|bool|array<string, mixed> $flagsOrOptions
     * @return string JSON-encoded data.
     *
     * @throws \JsonException On encoding failure.
     */
    public function toJson(int|bool|array $flagsOrOptions = 0): string
    {
        $flags = 0;

        if (is_bool($flagsOrOptions)) {
            if ($flagsOrOptions) {
                $flags |= JSON_PRETTY_PRINT;
            }
        } elseif (is_array($flagsOrOptions)) {
            if (!empty($flagsOrOptions['pretty'])) {
                $flags |= JSON_PRETTY_PRINT;
            }
            if (!empty($flagsOrOptions['unescapeUnicode'])) {
                $flags |= JSON_UNESCAPED_UNICODE;
            }
            if (!empty($flagsOrOptions['unescapeSlashes'])) {
                $flags |= JSON_UNESCAPED_SLASHES;
            }
            // 'space' implies pretty-print; PHP does not support custom indent strings.
            if (isset($flagsOrOptions['space'])) {
                $flags |= JSON_PRETTY_PRINT;
            }
        } else {
            $flags = $flagsOrOptions;
        }

        return json_encode($this->data, $flags | JSON_THROW_ON_ERROR);
    }

    /**
     * Serialises the accessor's data to Newline-Delimited JSON (NDJSON).
     *
     * Each top-level value is encoded as a separate JSON line.
     *
     * @return string NDJSON string with one JSON object per line.
     *
     * @throws \JsonException On encoding failure.
     */
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
     * Serialises the accessor's data to a CSV string.
     *
     * The first row contains headers derived from the keys of the first element.
     * CSV injection mitigation is controlled by `$csvMode`.
     *
     * @param  'none'|'prefix'|'strip'|'error'|null $csvMode Injection-mitigation mode;
     *         null falls back to the global policy or `'none'`.
     * @return string CSV-encoded data.
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

    /**
     * Converts the accessor's data to a plain PHP object (stdClass tree).
     *
     * Performed via a JSON encode/decode round-trip.
     *
     * @return object stdClass representation of the data.
     *
     * @throws \JsonException On encode/decode failure.
     */
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

    /**
     * Serialises the accessor's data to an XML string.
     *
     * Uses a registered `'xml'` serializer plugin when available, otherwise
     * falls back to the built-in {@see SimpleXmlSerializer}.
     *
     * @param  string $rootElement XML root element name (must match `[a-zA-Z_][\w.-]*`).
     * @return string XML string representation.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When `$rootElement` is invalid.
     */
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

    /**
     * Serialises the accessor's data to a TOML string.
     *
     * Uses a registered `'toml'` serializer plugin when available, otherwise
     * falls back to the built-in {@see DeviumTomlSerializer}.
     *
     * @return string TOML string representation.
     */
    public function toToml(): string
    {
        if (PluginRegistry::hasSerializer('toml')) {
            return PluginRegistry::getSerializer('toml')->serialize($this->data);
        }

        return (new DeviumTomlSerializer())->serialize($this->data);
    }

    /**
     * Serialises the accessor's data to a YAML string.
     *
     * Resolution order: registered `'yaml'` plugin → native `yaml_emit` → Symfony YAML.
     *
     * @return string YAML string representation.
     */
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
     * Serialises the accessor's data to an INI-format string.
     *
     * Top-level scalar values are emitted as `key = value` pairs.
     * Top-level nested arrays are emitted as `[section]` blocks.
     * Deeper nesting (arrays within sections) is serialised as a JSON string value.
     * Delegates to a registered `'ini'` serializer plugin when available.
     *
     * @return string A valid INI string with sections for nested arrays.
     */
    public function toIni(): string
    {
        if (PluginRegistry::hasSerializer('ini')) {
            return PluginRegistry::getSerializer('ini')->serialize($this->data);
        }

        $flatLines    = [];
        $sectionBlocks = [];

        foreach ($this->data as $key => $value) {
            if (is_array($value)) {
                $block = ["[{$key}]"];
                foreach ($value as $subKey => $subValue) {
                    $serialized = is_array($subValue)
                        ? json_encode($subValue, JSON_THROW_ON_ERROR)
                        : $subValue;
                    $block[] = "{$subKey} = " . $this->serializeIniValue($serialized);
                }
                $sectionBlocks[] = implode("\n", $block);
            } else {
                $flatLines[] = "{$key} = " . $this->serializeIniValue($value);
            }
        }

        $parts = [];
        if ($flatLines !== []) {
            $parts[] = implode("\n", $flatLines);
        }
        foreach ($sectionBlocks as $block) {
            $parts[] = $block;
        }

        return implode("\n\n", $parts) . "\n";
    }

    /**
     * Serialises the accessor's data to a `.env`-format string.
     *
     * Only flat (non-array) top-level values are emitted as `KEY=VALUE` pairs.
     * Nested arrays are skipped silently — ENV is an inherently flat format.
     * Values containing spaces are wrapped in double quotes.
     * Delegates to a registered `'env'` serializer plugin when available.
     *
     * @return string A valid `.env` string with KEY=VALUE pairs per line.
     */
    public function toEnv(): string
    {
        if (PluginRegistry::hasSerializer('env')) {
            return PluginRegistry::getSerializer('env')->serialize($this->data);
        }

        $lines = [];
        foreach ($this->data as $key => $value) {
            if (is_array($value)) {
                continue;
            }

            if ($value === true) {
                $str = 'true';
            } elseif ($value === false) {
                $str = 'false';
            } elseif ($value === null) {
                $str = '';
            } elseif (is_scalar($value)) {
                $str = (string) $value;
            } else {
                $str = '';
            }

            $quotedValue = str_contains($str, ' ') ? "\"" . $str . "\"" : $str;
            $lines[]     = "{$key}={$quotedValue}";
        }

        return implode("\n", $lines) . "\n";
    }

    /**
     * Transform data to a specific format using a registered serializer plugin.
     * Falls back to built-in serializers for YAML, TOML, INI, and ENV.
     *
     * @param  string $format Format identifier (e.g., 'yaml', 'xml', 'toml', 'ini', 'env')
     * @return string Serialized output
     * @throws UnsupportedTypeException If no serializer is registered and no built-in fallback exists
     */
    public function transform(string $format): string
    {
        if (PluginRegistry::hasSerializer($format)) {
            return PluginRegistry::getSerializer($format)->serialize($this->data);
        }

        if ($format === 'yaml') {
            return $this->toYaml();
        }
        if ($format === 'toml') {
            return $this->toToml();
        }
        if ($format === 'ini') {
            return $this->toIni();
        }
        if ($format === 'env') {
            return $this->toEnv();
        }

        return PluginRegistry::getSerializer($format)->serialize($this->data);
    }

    /**
     * Serialises a scalar value for use in an INI file.
     *
     * Booleans are emitted as `true`/`false`; `null` is emitted as `none` (the token
     * that {@see \SafeAccessInline\Accessors\IniAccessor} maps back to `null` via
     * `coerceBooleans()`). Numbers are cast to string without quoting so that
     * `INI_SCANNER_TYPED` re-coerces them correctly on parse.
     * String values containing INI special characters or whitespace are wrapped in double
     * quotes unless they already contain a `"` (which would make quoting ambiguous).
     *
     * @param  mixed $value Scalar value to serialise.
     * @return string INI-safe string representation.
     */
    private function serializeIniValue(mixed $value): string
    {
        if ($value === true) {
            return 'true';
        }
        if ($value === false) {
            return 'false';
        }
        if ($value === null) {
            return 'none';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        $str = is_string($value) ? $value : '';
        if (preg_match('/[=;#\[\]\s]/', $str) && !str_contains($str, '"')) {
            return '"' . $str . '"';
        }

        return $str;
    }

}
