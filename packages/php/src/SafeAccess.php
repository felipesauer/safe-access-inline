<?php

namespace SafeAccessInline;

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\NdjsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\TomlAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Accessors\YamlAccessor;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\DeepMerger;
use SafeAccessInline\Core\FileWatcher;
use SafeAccessInline\Core\IoLoader;
use SafeAccessInline\Core\TypeDetector;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Security\AuditLogger;
use SafeAccessInline\Security\SecurityPolicy;

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
            'ndjson' => NdjsonAccessor::from($data),
            default => isset(self::$customAccessors[$format])
                ? self::$customAccessors[$format]::from($data)
                : throw new InvalidFormatException(
                    "Unknown format '{$format}'. Use a known format or register a custom accessor via SafeAccess::extend()."
                ),
        };
    }

    // ── Typed Factories ──────────────────────────────

    /** @param array<mixed> $data */
    /** @param array<mixed> $data */
    public static function fromArray(array $data, bool $readonly = false): ArrayAccessor
    {
        return ArrayAccessor::from($data, $readonly);
    }

    public static function fromObject(object $data, bool $readonly = false): ObjectAccessor
    {
        return ObjectAccessor::from($data, $readonly);
    }

    public static function fromJson(string $data, bool $readonly = false): JsonAccessor
    {
        return JsonAccessor::from($data, $readonly);
    }

    /** @param string|\SimpleXMLElement $data */
    public static function fromXml(string|\SimpleXMLElement $data, bool $readonly = false): XmlAccessor
    {
        return XmlAccessor::from($data, $readonly);
    }

    public static function fromYaml(string $data, bool $readonly = false): YamlAccessor
    {
        return YamlAccessor::from($data, $readonly);
    }

    public static function fromToml(string $data, bool $readonly = false): TomlAccessor
    {
        return TomlAccessor::from($data, $readonly);
    }

    public static function fromIni(string $data, bool $readonly = false): IniAccessor
    {
        return IniAccessor::from($data, $readonly);
    }

    public static function fromCsv(string $data, bool $readonly = false): CsvAccessor
    {
        return CsvAccessor::from($data, $readonly);
    }

    public static function fromEnv(string $data, bool $readonly = false): EnvAccessor
    {
        return EnvAccessor::from($data, $readonly);
    }

    public static function fromNdjson(string $data, bool $readonly = false): NdjsonAccessor
    {
        return NdjsonAccessor::from($data, $readonly);
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

    // ── File/URL I/O ────────────────────────────────────

    /**
     * @param string[] $allowedDirs
     */
    public static function fromFile(
        string $filePath,
        ?string $format = null,
        array $allowedDirs = [],
    ): AbstractAccessor {
        $content = IoLoader::readFile($filePath, $allowedDirs);
        $resolvedFormat = $format ?? IoLoader::resolveFormatFromExtension($filePath)?->value;
        if ($resolvedFormat === null) {
            return TypeDetector::resolve($content);
        }
        return self::from($content, $resolvedFormat);
    }

    /**
     * @param array{allowPrivateIps?: bool, allowedHosts?: string[], allowedPorts?: int[]} $options
     */
    public static function fromUrl(
        string $url,
        ?string $format = null,
        array $options = [],
    ): AbstractAccessor {
        $content = IoLoader::fetchUrl($url, $options);
        if ($format !== null) {
            return self::from($content, $format);
        }
        $parsed = parse_url($url, PHP_URL_PATH);
        if (is_string($parsed)) {
            $detectedFormat = IoLoader::resolveFormatFromExtension($parsed);
            if ($detectedFormat !== null) {
                return self::from($content, $detectedFormat->value);
            }
        }
        return TypeDetector::resolve($content);
    }

    // ── Layered Config ──────────────────────────────────

    /**
     * @param AbstractAccessor[] $sources
     */
    public static function layer(array $sources): AbstractAccessor
    {
        if (count($sources) === 0) {
            return ObjectAccessor::from((object) []);
        }
        $arrays = array_map(fn (AbstractAccessor $s) => $s->toArray(), $sources);
        $merged = DeepMerger::merge(array_shift($arrays), ...$arrays);
        return ObjectAccessor::from((object) $merged);
    }

    /**
     * @param string[] $paths
     * @param string[] $allowedDirs
     */
    public static function layerFiles(array $paths, array $allowedDirs = []): AbstractAccessor
    {
        $accessors = array_map(
            fn (string $p) => self::fromFile($p, allowedDirs: $allowedDirs),
            $paths,
        );
        return self::layer($accessors);
    }

    /**
     * Watches a file for changes and calls the callback with a fresh accessor.
     * Returns a stop function.
     *
     * @param callable(AbstractAccessor): void $onChange
     * @param string[] $allowedDirs
     * @return callable(): void
     */
    public static function watchFile(
        string $filePath,
        callable $onChange,
        ?string $format = null,
        array $allowedDirs = [],
    ): callable {
        return FileWatcher::watch($filePath, function () use ($filePath, $format, $allowedDirs, $onChange): void {
            $accessor = self::fromFile($filePath, $format, $allowedDirs);
            $onChange($accessor);
        });
    }

    // ── SecurityPolicy ──────────────────────────────────

    public static function withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor
    {
        $accessor = TypeDetector::resolve($data);
        if ($policy->maskPatterns !== []) {
            return $accessor->masked($policy->maskPatterns);
        }
        return $accessor;
    }

    public static function fromFileWithPolicy(string $filePath, SecurityPolicy $policy): AbstractAccessor
    {
        return self::fromFile($filePath, allowedDirs: $policy->allowedDirs);
    }

    public static function fromUrlWithPolicy(string $url, SecurityPolicy $policy): AbstractAccessor
    {
        return self::fromUrl($url, options: $policy->url ?? []);
    }

    public static function setGlobalPolicy(SecurityPolicy $policy): void
    {
        SecurityPolicy::setGlobal($policy);
    }

    public static function clearGlobalPolicy(): void
    {
        SecurityPolicy::clearGlobal();
    }

    // ── Audit ───────────────────────────────────────────

    /**
     * @param callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void $listener
     * @return callable(): void
     */
    public static function onAudit(callable $listener): callable
    {
        return AuditLogger::onAudit($listener);
    }

    public static function clearAuditListeners(): void
    {
        AuditLogger::clearListeners();
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
