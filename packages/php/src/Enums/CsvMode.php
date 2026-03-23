<?php

declare(strict_types=1);

namespace SafeAccessInline\Enums;

/**
 * Strategies for preventing formula injection when serializing to CSV.
 */
enum CsvMode: string
{
    /** No protection. Values are serialised as-is. */
    case NONE = 'none';

    /** Prefix unsafe values with a tab character. */
    case PREFIX = 'prefix';

    /** Strip leading unsafe characters (+, -, =, @). */
    case STRIP = 'strip';

    /** Throw an error if formula injection is detected. */
    case ERROR = 'error';
}
