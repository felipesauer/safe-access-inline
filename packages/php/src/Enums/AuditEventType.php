<?php

declare(strict_types=1);

namespace SafeAccessInline\Enums;

/**
 * Identifies the category of an audit event emitted by the system.
 *
 * Used by AuditLogger to classify security, I/O, and lifecycle occurrences.
 */
enum AuditEventType: string
{
    case FILE_READ = 'file.read';
    case FILE_WATCH = 'file.watch';
    case URL_FETCH = 'url.fetch';
    case SECURITY_VIOLATION = 'security.violation';
    case SECURITY_DEPRECATION = 'security.deprecation';
    case DATA_MASK = 'data.mask';
    case DATA_FREEZE = 'data.freeze';
    case SCHEMA_VALIDATE = 'schema.validate';
    case PLUGIN_OVERWRITE = 'plugin.overwrite';
}
