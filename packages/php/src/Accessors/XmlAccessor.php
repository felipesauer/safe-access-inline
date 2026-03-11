<?php

namespace SafeAccessInline\Accessors;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Accessor for XML data.
 * Accepts an XML string or SimpleXMLElement.
 * Converts: XML → SimpleXMLElement → JSON → associative array.
 */
class XmlAccessor extends AbstractAccessor
{
    private \SimpleXMLElement|string $originalXml;

    public static function from(mixed $data): static
    {
        if (!is_string($data) && !$data instanceof \SimpleXMLElement) {
            throw new InvalidFormatException(
                'XmlAccessor expects a string or SimpleXMLElement, got ' . gettype($data)
            );
        }
        return new static($data); // @phpstan-ignore new.static
    }

    protected function parse(mixed $raw): array
    {
        assert(is_string($raw) || $raw instanceof \SimpleXMLElement);
        $this->originalXml = $raw;

        if (is_string($raw)) {
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
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * Returns the original XML exactly as provided.
     */
    public function getOriginalXml(): \SimpleXMLElement|string
    {
        return $this->originalXml;
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
