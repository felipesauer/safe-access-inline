<?php

namespace SafeAccessInline\Core;

use SafeAccessInline\Accessors\ArrayAccessor;
use SafeAccessInline\Accessors\EnvAccessor;
use SafeAccessInline\Accessors\IniAccessor;
use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Accessors\ObjectAccessor;
use SafeAccessInline\Accessors\XmlAccessor;
use SafeAccessInline\Accessors\YamlAccessor;
use SafeAccessInline\Exceptions\UnsupportedTypeException;

/**
 * Automatically detects the data format and returns the appropriate Accessor.
 *
 * Detection order:
 * 1. native array         → ArrayAccessor
 * 2. SimpleXMLElement      → XmlAccessor
 * 3. generic object        → ObjectAccessor
 * 4. JSON string           → JsonAccessor
 * 5. XML string            → XmlAccessor
 * 6. YAML string           → YamlAccessor
 * 7. INI string            → IniAccessor
 * 8. ENV string            → EnvAccessor
 */
final class TypeDetector
{
    public static function resolve(mixed $data): AbstractAccessor
    {
        if (is_array($data)) {
            return ArrayAccessor::from($data);
        }

        if ($data instanceof \SimpleXMLElement) {
            return XmlAccessor::from($data);
        }

        if (is_object($data)) {
            return ObjectAccessor::from($data);
        }

        if (is_string($data)) {
            $trimmed = trim($data);

            // JSON: starts with { or [
            if (str_starts_with($trimmed, '{') || str_starts_with($trimmed, '[')) {
                $json = json_decode($trimmed, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return JsonAccessor::from($data);
                }
            }

            // XML: starts with <
            if (str_starts_with($trimmed, '<')) {
                return XmlAccessor::from($data);
            }

            // YAML: lines with "key:" and no "="
            if (preg_match('/^[\w\-]+\s*:/m', $trimmed) && !preg_match('/^[\w\-]+\s*=/m', $trimmed)) {
                return YamlAccessor::from($data);
            }

            // INI: section headers [section] or key=value
            if (preg_match('/^\[[\w.\-]+\]/m', $trimmed)) {
                return IniAccessor::from($data);
            }

            // ENV: lines KEY=VALUE (uppercase with underscores)
            if (preg_match('/^[A-Z][A-Z0-9_]*\s*=/m', $trimmed)) {
                return EnvAccessor::from($data);
            }
        }

        throw new UnsupportedTypeException(
            'Unable to auto-detect data format. Use a specific factory (e.g., SafeAccess::fromJson()).'
        );
    }
}
