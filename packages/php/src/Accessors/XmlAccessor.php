<?php

declare(strict_types=1);

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Exceptions\SecurityException;

/**
 * Accessor for XML data.
 * Accepts an XML string or SimpleXMLElement.
 * Converts: XML → SimpleXMLElement → JSON → associative array.
 */
class XmlAccessor extends AbstractAccessor
{
    private \SimpleXMLElement|string $originalXml;

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
        $this->originalXml = $raw;

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
        /** @var array<mixed> */
        // 512 is PHP’s standard json_decode depth; XML structural depth is enforced separately by SecurityOptions
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * Returns the original XML exactly as provided.
     * @return \SimpleXMLElement|string
     */
    public function getOriginalXml(): \SimpleXMLElement|string
    {
        return $this->originalXml;
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
        if (is_string($this->originalXml)) {
            return $this->originalXml;
        }

        return $this->originalXml->asXML() ?: '';
    }
}
