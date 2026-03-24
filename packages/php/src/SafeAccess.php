<?php

declare(strict_types=1);

namespace SafeAccessInline;

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\NdjsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\TomlAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Accessors\YamlAccessor;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\Registries\PluginRegistry;
use SafeAccessInline\Core\Rendering\TypeDetector;
use SafeAccessInline\Core\Resolvers\PathCache;
use SafeAccessInline\Enums\Format;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
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
    // ── Unified Factory ─────────────────────────────

    /**
     * Creates an accessor from any data, optionally specifying the format.
     * Without format, auto-detects the type (same as detect()).
     *
     * @param mixed $data The input data
     * @param string|Format $format Optional format: 'array','object','json','xml','yaml','toml','ini','env', a Format enum value, or a custom name
     *
     * @throws InvalidFormatException When the format is unknown
     * @return AbstractAccessor<array<mixed>> Accessor wrapping the input data.
     */
    public static function from(mixed $data, string|Format $format = ''): AbstractAccessor
    {
        if ($format instanceof Format) {
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
            'env' => EnvAccessor::from($data),
            'ndjson' => NdjsonAccessor::from($data),
            default => throw new InvalidFormatException(
                "Unknown format '{$format}'. Use a known format."
            ),
        };
    }

    // ── Typed Factories ──────────────────────────────

    /**
     * Creates an {@see ArrayAccessor} from an array.
     *
     * @param  array<mixed>  $data     Input array.
     * @param  bool          $readonly When true the returned accessor is frozen.
     * @return ArrayAccessor Configured accessor instance.
     */
    public static function fromArray(array $data, bool $readonly = false): ArrayAccessor
    {
        return ArrayAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see ObjectAccessor} from a plain object.
     *
     * @param  object         $data     Plain PHP object to wrap.
     * @param  bool           $readonly When true the returned accessor is frozen.
     * @return ObjectAccessor Configured accessor instance.
     */
    public static function fromObject(object $data, bool $readonly = false): ObjectAccessor
    {
        return ObjectAccessor::from($data, $readonly);
    }

    /**
     * Creates a {@see JsonAccessor} from a JSON string.
     *
     * @param  string       $data     Valid JSON string.
     * @param  bool         $readonly When true the returned accessor is frozen.
     * @return JsonAccessor Configured accessor instance.
     */
    public static function fromJson(string $data, bool $readonly = false): JsonAccessor
    {
        return JsonAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see XmlAccessor} from an XML string or SimpleXMLElement.
     *
     * @param  string|\SimpleXMLElement $data     XML string or already-parsed element.
     * @param  bool                     $readonly When true the returned accessor is frozen.
     * @return XmlAccessor              Configured accessor instance.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When the XML cannot be parsed.
     */
    public static function fromXml(string|\SimpleXMLElement $data, bool $readonly = false): XmlAccessor
    {
        return XmlAccessor::from($data, $readonly);
    }

    /**
     * Creates a {@see YamlAccessor} from a YAML string.
     *
     * @param  string       $data     YAML string.
     * @param  bool         $readonly When true the returned accessor is frozen.
     * @return YamlAccessor Configured accessor instance.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When `$data` cannot be parsed as YAML.
     */
    public static function fromYaml(string $data, bool $readonly = false): YamlAccessor
    {
        return YamlAccessor::from($data, $readonly);
    }

    /**
     * Creates a {@see TomlAccessor} from a TOML string.
     *
     * @param  string       $data     TOML string.
     * @param  bool         $readonly When true the returned accessor is frozen.
     * @return TomlAccessor Configured accessor instance.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When `$data` cannot be parsed as TOML.
     */
    public static function fromToml(string $data, bool $readonly = false): TomlAccessor
    {
        return TomlAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see IniAccessor} from an INI-format string.
     *
     * @param  string      $data     INI string.
     * @param  bool        $readonly When true the returned accessor is frozen.
     * @return IniAccessor Configured accessor instance.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When `$data` cannot be parsed as INI.
     */
    public static function fromIni(string $data, bool $readonly = false): IniAccessor
    {
        return IniAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see EnvAccessor} from a .env-format string.
     *
     * @param  string      $data     .env format string.
     * @param  bool        $readonly When true the returned accessor is frozen.
     * @return EnvAccessor Configured accessor instance.
     *
     * @throws \SafeAccessInline\Exceptions\InvalidFormatException When `$data` cannot be parsed as .env.
     */
    public static function fromEnv(string $data, bool $readonly = false): EnvAccessor
    {
        return EnvAccessor::from($data, $readonly);
    }

    /**
     * Creates an {@see NdjsonAccessor} from a newline-delimited JSON string.
     *
     * @param  string          $data     NDJSON string (one JSON value per line).
     * @param  bool            $readonly When true the returned accessor is frozen.
     * @return NdjsonAccessor  Configured accessor instance.
     */
    public static function fromNdjson(string $data, bool $readonly = false): NdjsonAccessor
    {
        return NdjsonAccessor::from($data, $readonly);
    }

    // ── Auto-detection ──────────────────────────────────

    /**
     * Automatically detects the format and returns the appropriate Accessor.
     *
     * @return AbstractAccessor<array<mixed>> Accessor wrapping the detected data.
     */
    public static function detect(mixed $data): AbstractAccessor
    {
        return TypeDetector::resolve($data);
    }

    // ── SecurityPolicy ──────────────────────────────────

    /**
     * Wraps data in an accessor after enforcing the given security policy.
     *
     * Validates payload size, key count, depth, and applies mask patterns.
     *
     * @param  mixed          $data   Raw data (string, array, object, etc.).
     * @param  SecurityPolicy $policy Policy constraints to enforce.
     * @return AbstractAccessor<array<mixed>> Accessor wrapping the validated data.
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

    // ── Reset All ────────────────────────────────────

    /**
     * Resets all global/static state. Intended for test teardown.
     *
     * @internal
     */
    public static function resetAll(): void
    {
        PathCache::clear();
        SecurityPolicy::clearGlobal();
        PluginRegistry::reset();
    }

    /**
     * Prevents instantiation. This is a static utility class.
     *
     * @codeCoverageIgnore Private constructor on a static utility class cannot be invoked from tests.
     */
    private function __construct()
    {
    }
}
