<?php

namespace SafeAccessInline;

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\TomlAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Accessors\YamlAccessor;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\TypeDetector;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Main entry point for the safe-access-inline library.
 *
 * Usage:
 *   SafeAccess::fromArray($data)->get('user.name', 'default');
 *   SafeAccess::fromJson($json)->has('config.debug');
 *   SafeAccess::from($data, 'json')->get('key');
 *   SafeAccess::from($data)->get('auto.detected');
 */
final class SafeAccess
{
    /** @var array<string, class-string<AbstractAccessor>> */
    private static array $customAccessors = [];

    // ── Unified Factory ─────────────────────────────

    /**
     * Creates an accessor from any data, optionally specifying the format.
     * Without format, auto-detects the type (same as detect()).
     *
     * @param mixed $data The input data
     * @param string|AccessorFormat $format Optional format: 'array','object','json','xml','yaml','toml','ini','csv','env', an AccessorFormat enum value, or a custom name
     *
     * @throws InvalidFormatException When the format is unknown
     */
    public static function from(mixed $data, string|AccessorFormat $format = ''): AbstractAccessor
    {
        if ($format instanceof AccessorFormat) {
            $format = $format->value;
        }

        if ($format === '') {
            return TypeDetector::resolve($data);
        }

        return match ($format) {
            'array' => ArrayAccessor::from($data),
            'object' => ObjectAccessor::from($data),
            'json' => JsonAccessor::from($data),
            'xml' => XmlAccessor::from($data),
            'yaml' => YamlAccessor::from($data),
            'toml' => TomlAccessor::from($data),
            'ini' => IniAccessor::from($data),
            'csv' => CsvAccessor::from($data),
            'env' => EnvAccessor::from($data),
            default => isset(self::$customAccessors[$format])
                ? self::$customAccessors[$format]::from($data)
                : throw new InvalidFormatException(
                    "Unknown format '{$format}'. Use a known format or register a custom accessor via SafeAccess::extend()."
                ),
        };
    }

    // ── Typed Factories ──────────────────────────────

    /** @param array<mixed> $data */
    public static function fromArray(array $data): ArrayAccessor
    {
        return ArrayAccessor::from($data);
    }

    public static function fromObject(object $data): ObjectAccessor
    {
        return ObjectAccessor::from($data);
    }

    public static function fromJson(string $data): JsonAccessor
    {
        return JsonAccessor::from($data);
    }

    /** @param string|\SimpleXMLElement $data */
    public static function fromXml(string|\SimpleXMLElement $data): XmlAccessor
    {
        return XmlAccessor::from($data);
    }

    public static function fromYaml(string $data): YamlAccessor
    {
        return YamlAccessor::from($data);
    }

    public static function fromToml(string $data): TomlAccessor
    {
        return TomlAccessor::from($data);
    }

    public static function fromIni(string $data): IniAccessor
    {
        return IniAccessor::from($data);
    }

    public static function fromCsv(string $data): CsvAccessor
    {
        return CsvAccessor::from($data);
    }

    public static function fromEnv(string $data): EnvAccessor
    {
        return EnvAccessor::from($data);
    }

    // ── Auto-detection ──────────────────────────────────

    /**
     * Automatically detects the format and returns the appropriate Accessor.
     */
    public static function detect(mixed $data): AbstractAccessor
    {
        return TypeDetector::resolve($data);
    }

    // ── Extensibility ───────────────────────────────────

    /**
     * Registers a custom Accessor for non-native formats.
     *
     * @param string $name Identifier (e.g. 'protobuf', 'msgpack')
     * @param class-string<AbstractAccessor> $class Accessor class
     */
    public static function extend(string $name, string $class): void
    {
        self::$customAccessors[$name] = $class;
    }

    /**
     * Creates an instance of a custom Accessor registered via extend().
     */
    public static function custom(string $name, mixed $data): AbstractAccessor
    {
        if (!isset(self::$customAccessors[$name])) {
            throw new \RuntimeException("Custom accessor '{$name}' is not registered. Use SafeAccess::extend() first.");
        }
        return self::$customAccessors[$name]::from($data);
    }

    /**
     * Prevents instantiation.
     *
     * @codeCoverageIgnore
     */
    private function __construct()
    {
    }
}
