<?php

declare(strict_types=1);

namespace SafeAccessInline\Contracts;

/**
 * Options for loading data from a file.
 *
 * Consolidates the parameters used by SafeAccess::fromFile(), watchFile(),
 * layerFiles(), and related I/O operations.
 */
final readonly class FileLoadOptions
{
    /**
     * @param string|null   $format       Explicit format override (e.g. 'json', 'yaml'). Null = auto-detect.
     * @param array<string> $allowedDirs  Directories the file must reside within (empty = no restriction when allowAnyPath is true).
     * @param bool          $allowAnyPath When true, allows loading from any filesystem path.
     */
    public function __construct(
        public ?string $format = null,
        public array $allowedDirs = [],
        public bool $allowAnyPath = false,
    ) {
    }
}
