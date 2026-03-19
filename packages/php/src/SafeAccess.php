<?php

declare(strict_types=1);

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
use SafeAccessInline\Contracts\FileLoadOptions;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\Config\SafeAccessConfig;
use SafeAccessInline\Core\Io\FileWatcher;
use SafeAccessInline\Core\Io\IoLoader;
use SafeAccessInline\Core\Operations\DeepMerger;
use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Core\Registries\SchemaRegistry;
use SafeAccessInline\Core\Rendering\TypeDetector;
use SafeAccessInline\Core\Resolvers\PathCache;
use SafeAccessInline\Enums\AccessorFormat;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Audit\AuditLogger;
use SafeAccessInline\Security\Guards\SecurityOptions;
use SafeAccessInline\Security\Guards\SecurityPolicy;

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

    /**
     * Creates an {@see ArrayAccessor} from an array.
     *
     * @param array<mixed> $data
     */
    public static function fromArray(array $data, bool $readonly = false): ArrayAccessor
    {
        return ArrayAccessor::from($data, $readonly);
    }

    /** Creates an {@see ObjectAccessor} from a plain object. */
    public static function fromObject(object $data, bool $readonly = false): ObjectAccessor
    {
        return ObjectAccessor::from($data, $readonly);
    }

    /** Creates a {@see JsonAccessor} from a JSON string. */
    public static function fromJson(string $data, bool $readonly = false): JsonAccessor
    {
        return JsonAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see XmlAccessor} from an XML string or SimpleXMLElement.
     *
     * @param string|\SimpleXMLElement $data
     */
    public static function fromXml(string|\SimpleXMLElement $data, bool $readonly = false): XmlAccessor
    {
        return XmlAccessor::from($data, $readonly);
    }

    /** Creates a {@see YamlAccessor} from a YAML string. */
    public static function fromYaml(string $data, bool $readonly = false): YamlAccessor
    {
        return YamlAccessor::from($data, $readonly);
    }

    /** Creates a {@see TomlAccessor} from a TOML string. */
    public static function fromToml(string $data, bool $readonly = false): TomlAccessor
    {
        return TomlAccessor::from($data, $readonly);
    }

    /** Creates an {@see IniAccessor} from an INI-format string. */
    public static function fromIni(string $data, bool $readonly = false): IniAccessor
    {
        return IniAccessor::from($data, $readonly);
    }

    /** Creates a {@see CsvAccessor} from a CSV string. */
    public static function fromCsv(string $data, bool $readonly = false): CsvAccessor
    {
        return CsvAccessor::from($data, $readonly);
    }

    /** Creates an {@see EnvAccessor} from a .env-format string. */
    public static function fromEnv(string $data, bool $readonly = false): EnvAccessor
    {
        return EnvAccessor::from($data, $readonly);
    }

    /** Creates an {@see NdjsonAccessor} from a newline-delimited JSON string. */
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

    private const MAX_CUSTOM_ACCESSORS = SafeAccessConfig::DEFAULT_MAX_CUSTOM_ACCESSORS;

    /**
     * Registers a custom Accessor for non-native formats.
     *
     * @param string $name Identifier (e.g. 'protobuf', 'msgpack')
     * @param class-string<AbstractAccessor> $class Accessor class
     */
    public static function extend(string $name, string $class): void
    {
        if (count(self::$customAccessors) >= self::MAX_CUSTOM_ACCESSORS) {
            throw new \OverflowException(
                '[SafeAccess] Maximum custom accessor count (' . self::MAX_CUSTOM_ACCESSORS . ') reached.'
            );
        }
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
     * Loads data from a file and returns an accessor.
     *
     * Accepts either individual parameters (legacy) or a FileLoadOptions DTO.
     *
     * @param string                     $filePath     Path to the file.
     * @param FileLoadOptions|string|null $formatOrOptions Format string, FileLoadOptions DTO, or null for auto-detect.
     * @param array<string>              $allowedDirs  Directories the file must reside within (ignored when using DTO).
     * @param bool                       $allowAnyPath When true, allows any filesystem path (ignored when using DTO).
     */
    public static function fromFile(
        string $filePath,
        FileLoadOptions|string|null $formatOrOptions = null,
        array $allowedDirs = [],
        bool $allowAnyPath = false,
    ): AbstractAccessor {
        if ($formatOrOptions instanceof FileLoadOptions) {
            $format = $formatOrOptions->format;
            $allowedDirs = $formatOrOptions->allowedDirs;
            $allowAnyPath = $formatOrOptions->allowAnyPath;
        } else {
            $format = $formatOrOptions;
        }

        $content = IoLoader::readFile($filePath, $allowedDirs, $allowAnyPath);
        $resolvedFormat = $format ?? IoLoader::resolveFormatFromExtension($filePath)?->value;
        if ($resolvedFormat === null) {
            return TypeDetector::resolve($content);
        }
        return self::from($content, $resolvedFormat);
    }

    /**
     * Loads remote content from a URL and returns the appropriate accessor.
     *
     * Format is resolved from the URL path extension when not specified.
     *
     * @param  string                    $url     Remote URL to fetch content from.
     * @param  string|null               $format  Explicit format identifier, or null for auto-detection.
     * @param  array<string, mixed>      $options cURL options forwarded to the HTTP client.
     * @return AbstractAccessor Accessor wrapping the fetched content.
     *
     * @throws SecurityException         If the URL violates the active security policy.
     * @throws InvalidFormatException    If the content cannot be parsed.
     */
    public static function fromUrl(
        string $url,
        ?string $format = null,
        array $options = [],
    ): AbstractAccessor {
        /** @var array{allowPrivateIps?: bool, allowedHosts?: array<string>, allowedPorts?: array<int>} $options */
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
     * Merges multiple accessors into a single accessor using deep-merge.
     *
     * Later sources override earlier ones for conflicting keys.
     *
     * @param  AbstractAccessor[] $sources Ordered list of accessors to merge.
     * @return AbstractAccessor   A new ObjectAccessor containing the merged result.
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
     * Layers multiple files into a single merged accessor.
     *
     * @param array<string>              $paths        File paths to layer.
     * @param FileLoadOptions|array<string> $optionsOrAllowedDirs FileLoadOptions DTO or legacy allowedDirs array.
     * @param bool                       $allowAnyPath Legacy parameter (ignored when using DTO).
     */
    public static function layerFiles(array $paths, FileLoadOptions|array $optionsOrAllowedDirs = [], bool $allowAnyPath = false): AbstractAccessor
    {
        if ($optionsOrAllowedDirs instanceof FileLoadOptions) {
            $options = $optionsOrAllowedDirs;
        } else {
            $options = new FileLoadOptions(allowedDirs: $optionsOrAllowedDirs, allowAnyPath: $allowAnyPath);
        }

        $accessors = array_map(
            fn (string $p) => self::fromFile($p, $options),
            $paths,
        );
        return self::layer($accessors);
    }

    /**
     * Watches a file for changes and calls the callback with a fresh accessor.
     * Returns an array with 'poll' (blocking loop) and 'stop' callables.
     *
     * @param string                          $filePath     Path to the file.
     * @param callable(AbstractAccessor): void $onChange     Callback invoked on file changes.
     * @param FileLoadOptions|string|null      $formatOrOptions Format string, FileLoadOptions DTO, or null for auto-detect.
     * @param array<string>                   $allowedDirs  Legacy parameter (ignored when using DTO).
     * @param bool                            $allowAnyPath Legacy parameter (ignored when using DTO).
     * @return array{poll: callable(): void, stop: callable(): void}
     */
    public static function watchFile(
        string $filePath,
        callable $onChange,
        FileLoadOptions|string|null $formatOrOptions = null,
        array $allowedDirs = [],
        bool $allowAnyPath = false,
    ): array {
        if ($formatOrOptions instanceof FileLoadOptions) {
            $options = $formatOrOptions;
        } else {
            $options = new FileLoadOptions(format: $formatOrOptions, allowedDirs: $allowedDirs, allowAnyPath: $allowAnyPath);
        }

        return FileWatcher::watch($filePath, function () use ($filePath, $options, $onChange): void {
            $accessor = self::fromFile($filePath, $options);
            $onChange($accessor);
        });
    }

    // ── SecurityPolicy ──────────────────────────────────

    /**
     * Wraps data in an accessor after enforcing the given security policy.
     *
     * Validates payload size, key count, depth, and applies mask patterns.
     *
     * @param  mixed          $data   Raw data (string, array, object, etc.).
     * @param  SecurityPolicy $policy Policy constraints to enforce.
     * @return AbstractAccessor Accessor wrapping the validated data.
     *
     * @throws SecurityException If any policy constraint is violated.
     */
    public static function withPolicy(mixed $data, SecurityPolicy $policy): AbstractAccessor
    {
        if (is_string($data) && $policy->maxPayloadBytes > 0) {
            SecurityOptions::assertPayloadSize($data, $policy->maxPayloadBytes);
        }

        $accessor = TypeDetector::resolve($data);

        if ($policy->maxKeys > 0) {
            SecurityOptions::assertMaxKeys($accessor->toArray(), $policy->maxKeys);
        }

        if ($policy->maxDepth > 0) {
            SecurityOptions::assertMaxStructuralDepth($accessor->toArray(), $policy->maxDepth);
        }

        if ($policy->maskPatterns !== []) {
            $accessor = $accessor->masked($policy->maskPatterns);
        }

        return $accessor;
    }

    /**
     * Reads a local file and wraps it in an accessor after enforcing a security policy.
     *
     * Combines file I/O with payload-size, key-count, depth, and mask enforcement.
     *
     * @param  string         $filePath Absolute or relative path to the file.
     * @param  SecurityPolicy $policy   Policy constraints to enforce.
     * @return AbstractAccessor Accessor wrapping the validated file content.
     *
     * @throws SecurityException      If any policy constraint is violated.
     * @throws InvalidFormatException If the file content cannot be parsed.
     */
    public static function fromFileWithPolicy(string $filePath, SecurityPolicy $policy): AbstractAccessor
    {
        $content = IoLoader::readFile($filePath, $policy->allowedDirs);

        if ($policy->maxPayloadBytes > 0) {
            SecurityOptions::assertPayloadSize($content, $policy->maxPayloadBytes);
        }

        $resolvedFormat = IoLoader::resolveFormatFromExtension($filePath)?->value;
        $accessor = $resolvedFormat !== null ? self::from($content, $resolvedFormat) : TypeDetector::resolve($content);

        if ($policy->maxKeys > 0) {
            SecurityOptions::assertMaxKeys($accessor->toArray(), $policy->maxKeys);
        }

        if ($policy->maxDepth > 0) {
            SecurityOptions::assertMaxStructuralDepth($accessor->toArray(), $policy->maxDepth);
        }

        if ($policy->maskPatterns !== []) {
            $accessor = $accessor->masked($policy->maskPatterns);
        }

        return $accessor;
    }

    /**
     * Fetches remote content from a URL and wraps it in an accessor after enforcing a security policy.
     *
     * Combines URL fetching with payload-size, key-count, and mask enforcement.
     *
     * @param  string         $url    Remote URL to fetch.
     * @param  SecurityPolicy $policy Policy constraints to enforce.
     * @return AbstractAccessor Accessor wrapping the validated remote content.
     *
     * @throws SecurityException      If any policy constraint is violated.
     * @throws InvalidFormatException If the content cannot be parsed.
     */
    public static function fromUrlWithPolicy(string $url, SecurityPolicy $policy): AbstractAccessor
    {
        $content = IoLoader::fetchUrl($url, $policy->url ?? []);

        if ($policy->maxPayloadBytes > 0) {
            SecurityOptions::assertPayloadSize($content, $policy->maxPayloadBytes);
        }

        $format = null;
        $parsed = parse_url($url, PHP_URL_PATH);
        if (is_string($parsed)) {
            $format = IoLoader::resolveFormatFromExtension($parsed)?->value;
        }

        $accessor = $format !== null ? self::from($content, $format) : TypeDetector::resolve($content);

        if ($policy->maxKeys > 0) {
            SecurityOptions::assertMaxKeys($accessor->toArray(), $policy->maxKeys);
        }

        if ($policy->maskPatterns !== []) {
            $accessor = $accessor->masked($policy->maskPatterns);
        }

        return $accessor;
    }

    /**
     * Sets a global security policy applied to every subsequent accessor creation.
     *
     * @param SecurityPolicy $policy The policy to install globally.
     */
    public static function setGlobalPolicy(SecurityPolicy $policy): void
    {
        SecurityPolicy::setGlobal($policy);
    }

    /**
     * Removes the global security policy so that accessor creation is unrestricted.
     */
    public static function clearGlobalPolicy(): void
    {
        SecurityPolicy::clearGlobal();
    }

    // ── Audit ───────────────────────────────────────────

    /**
     * Registers an audit listener invoked on every auditable accessor operation.
     *
     * Returns an unsubscribe callable that removes the listener when invoked.
     *
     * @param  callable(array{type: string, timestamp: float, detail: array<string, mixed>}): void $listener Callback receiving audit events.
     * @return callable(): void Unsubscribe callable.
     */
    public static function onAudit(callable $listener): callable
    {
        return AuditLogger::onAudit($listener);
    }

    /**
     * Removes all registered audit listeners.
     */
    public static function clearAuditListeners(): void
    {
        AuditLogger::clearListeners();
    }

    // ── Reset All ────────────────────────────────────

    /**
     * Resets all global/static state. Intended for test teardown.
     *
     * @internal
     */
    public static function resetAll(): void
    {
        self::$customAccessors = [];
        PathCache::clear();
        AuditLogger::clearListeners();
        SecurityPolicy::clearGlobal();
        PluginRegistry::reset();
        SchemaRegistry::clearDefaultAdapter();
        IoLoader::resetHttpClient();
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
