<?php

declare(strict_types=1);

namespace SafeAccessInline\Enums;

/** RFC 6902 JSON Patch operation types. */
enum PatchOperationType: string
{
    case ADD = 'add';
    case REMOVE = 'remove';
    case REPLACE = 'replace';
    case MOVE = 'move';
    case COPY = 'copy';
    case TEST = 'test';
}
