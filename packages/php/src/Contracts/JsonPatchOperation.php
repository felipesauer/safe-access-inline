<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * A single JSON Patch operation as defined by RFC 6902.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6902
 */
final readonly class JsonPatchOperation
{
    /**
     * @param string      $op    The operation: 'add', 'remove', 'replace', 'move', 'copy', or 'test'.
     * @param string      $path  JSON Pointer (RFC 6901) targeting the value.
     * @param mixed       $value Value for add, replace, and test operations.
     * @param string|null $from  Source JSON Pointer for move and copy operations.
     */
    public function __construct(
        public string $op,
        public string $path,
        public mixed $value = null,
        public ?string $from = null,
    ) {
    }
}
