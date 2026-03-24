<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Core\Config\ParserConfig;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Guards\SecurityGuard;
use SafeAccessInline\Security\Guards\SecurityOptions;

/**
 * Accessor for XML data.
 * Accepts an XML string or SimpleXMLElement.
 * Converts: XML → SimpleXMLElement → JSON → associative array.
 * @extends AbstractAccessor<array<mixed>>
 */
class XmlAccessor extends AbstractAccessor
{
    /** @var string Original XML preserved in its serialized string form. */
    private string $originalXml;

    /**
     * Creates an XmlAccessor from an XML string or SimpleXMLElement.
     *
     * @param  mixed $data     XML string or \SimpleXMLElement instance.
     * @param  bool  $readonly Whether the accessor should be immutable.
     * @return static
     *
     * @throws InvalidFormatException If $data is neither a string nor \SimpleXMLElement.
     */
    public static function from(mixed $data, bool $readonly = false): static
    {
        if (!is_string($data) && !$data instanceof \SimpleXMLElement) {
            throw new InvalidFormatException(
                'XmlAccessor expects a string or SimpleXMLElement, got ' . gettype($data)
            );
        }
        // XmlAccessor subclasses must be instantiated via the concrete static type returned by the factory,
        // not through the abstract parent; PHPStan cannot verify this through the generic from() signature,
        // but the pattern is intentional and safe here.
        // @phpstan-ignore new.static
        return new static($data, $readonly);
    }

    /**
     * @param mixed $raw
     * @return array<mixed>
     */
    protected function parse(mixed $raw): array
    {
        assert(is_string($raw) || $raw instanceof \SimpleXMLElement);
        // Normalize to string immediately so that getOriginalXml() always returns string,
        // matching the JS counterpart which never exposes a parsed XML object.
        $this->originalXml = $raw instanceof \SimpleXMLElement ? ($raw->asXML() ?: '') : $raw;

        if (is_string($raw)) {
            self::assertSafeXml($raw);
            $previous = libxml_use_internal_errors(true);
            try {
                $xml = simplexml_load_string($raw, options: LIBXML_NONET | LIBXML_NOCDATA);
                if ($xml === false) {
                    throw new InvalidFormatException('XmlAccessor failed to parse XML string.');
                }
            } finally {
                libxml_clear_errors();
                libxml_use_internal_errors($previous);
            }
        } else {
            $xml = $raw;
        }

        $json = json_encode($xml, JSON_THROW_ON_ERROR);
        /** @var array<mixed> $parsed */
        $parsed = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        // P3: enforce maximum XML nesting depth to prevent DoS via deeply nested structures.
        SecurityOptions::assertMaxStructuralDepth($parsed, ParserConfig::DEFAULT_MAX_XML_DEPTH);

        // P4: reject XML tag/attribute names that match the prototype-pollution deny-list.
        self::assertSafeKeys($parsed);

        return $parsed;
    }

    /**
     * Returns the original XML exactly as provided, serialized to a string.
     *
     * When the accessor was constructed from a `\SimpleXMLElement`, that object is
     * serialized via `asXML()` at construction time so that this method always returns
     * a plain string — matching the JS counterpart's `getOriginalXml(): string` signature.
     *
     * @return string The original XML string.
     */
    public function getOriginalXml(): string
    {
        return $this->originalXml;
    }

    /**
     * Recursively asserts that every key in `$data` is safe per
     * {@see SecurityGuard::assertSafeKey()}.
     *
     * XML tag/attribute names may be attacker-controlled (e.g. user-uploaded files).
     * Checking them after XML to JSON to PHP-array conversion ensures that
     * prototype-pollution sentinels (`__proto__`, `constructor`, ...) are rejected
     * before the parsed structure reaches callers.
     *
     * @param  mixed $data
     * @param  int   $depth Internal recursion depth cap.
     * @throws SecurityException When a forbidden key is encountered.
     */
    private static function assertSafeKeys(mixed $data, int $depth = 0): void
    {
        if ($depth > ParserConfig::DEFAULT_MAX_XML_DEPTH || !is_array($data)) {
            return;
        }
        foreach ($data as $key => $value) {
            if (is_string($key)) {
                SecurityGuard::assertSafeKey($key);
            }
            self::assertSafeKeys($value, $depth + 1);
        }
    }

    /**
     * @param string $xml
     * @return void
     */
    private static function assertSafeXml(string $xml): void
    {
        if (preg_match('/<!DOCTYPE/i', $xml)) {
            throw new SecurityException('XML DOCTYPE declarations are blocked for security.');
        }

        if (preg_match('/<!ENTITY/i', $xml)) {
            throw new SecurityException('XML ENTITY declarations are blocked for security.');
        }
    }

    /** {@inheritDoc} */
    public function toXml(string $rootElement = 'root'): string
    {
        return $this->originalXml;
    }
}
