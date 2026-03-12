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

/**
 * Main entry point for the safe-access-inline library.
 *
 * Usage:
 *   SafeAccess::fromArray($data)->get('user.name', 'default');
 *   SafeAccess::fromJson($json)->has('config.debug');
 *   SafeAccess::detect($anything)->get('any.path');
 */
final class SafeAccess
{
    /** @var array<string, class-string<AbstractAccessor>> */
    private static array $customAccessors = [];

    // ── Factories Tipadas ────────────────────────────

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
